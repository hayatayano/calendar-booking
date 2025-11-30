import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteCalendarEvent, updateCalendarEvent } from '@/lib/google-calendar'
import { sendCancellationEmail, sendBookingUpdateEmail, sendStaffBookingUpdateEmail } from '@/lib/notifications'
import { sendBookingCancelledChatNotification } from '@/lib/google-chat'

/**
 * 予約詳細取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const bookingId = resolvedParams.id

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
      include: {
        bookingLink: true,
        user: true,
        formResponses: {
          include: {
            formField: true,
          },
        },
        notifications: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Failed to fetch booking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    )
  }
}

/**
 * 予約更新（担当者変更、日時変更対応）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const bookingId = resolvedParams.id

    const body = await request.json()
    const { startTime, endTime, notes, meetingType, location, meetingUrl, userId: newUserId } = body

    // 既存の予約を確認（会社のメンバーであれば更新可能）
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    })

    if (!currentUser?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        user: {
          companyId: currentUser.companyId,
        },
      },
      include: {
        user: true,
        bookingLink: true,
      },
    })

    if (!existingBooking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 変更内容を追跡
    const changes: {
      dateTimeChanged: boolean
      assigneeChanged: boolean
      previousStartTime?: Date
      previousAssigneeName?: string
    } = {
      dateTimeChanged: false,
      assigneeChanged: false,
    }

    // 日時変更の検出
    if (startTime && new Date(startTime).getTime() !== existingBooking.startTime.getTime()) {
      changes.dateTimeChanged = true
      changes.previousStartTime = existingBooking.startTime
    }

    // 担当者変更の検出
    if (newUserId && newUserId !== existingBooking.userId) {
      // 新しい担当者が同じ会社のメンバーか確認
      const newAssignee = await prisma.user.findFirst({
        where: {
          id: newUserId,
          companyId: currentUser.companyId,
        },
      })

      if (!newAssignee) {
        return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      }

      changes.assigneeChanged = true
      changes.previousAssigneeName = existingBooking.user.name
    }

    // 予約を更新
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        notes,
        meetingType,
        location,
        meetingUrl,
        userId: newUserId || undefined,
      },
      include: {
        bookingLink: true,
        user: true,
      },
    })

    // Googleカレンダーを更新（非同期）
    if (existingBooking.googleEventId) {
      updateCalendarEvent(session.user.id, existingBooking.googleEventId, {
        startTime: booking.startTime,
        endTime: booking.endTime,
        notes: booking.notes || undefined,
      }).catch((error) => {
        console.error('Failed to update calendar event:', error)
      })
    }

    // 変更があった場合、通知メールを送信（予約者と担当者の両方に）
    if (changes.dateTimeChanged || changes.assigneeChanged) {
      // 予約者への通知
      sendBookingUpdateEmail(
        booking,
        booking.bookingLink,
        booking.user,
        changes
      ).catch((error) => {
        console.error('Failed to send update notification to guest:', error)
      })

      // 担当者への通知
      sendStaffBookingUpdateEmail(
        booking,
        booking.bookingLink,
        booking.user,
        changes
      ).catch((error) => {
        console.error('Failed to send update notification to staff:', error)
      })
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Failed to update booking:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}

/**
 * 予約キャンセル
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const bookingId = resolvedParams.id

    const { searchParams } = new URL(request.url)
    const cancelReason = searchParams.get('reason')

    // 既存の予約を確認
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
      include: {
        bookingLink: true,
        user: {
          include: {
            company: true,
          },
        },
      },
    })

    if (!existingBooking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // ステータスをキャンセルに更新
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelReason,
      },
    })

    // Googleカレンダーから削除（非同期）
    if (existingBooking.googleEventId) {
      deleteCalendarEvent(session.user.id, existingBooking.googleEventId).catch(
        (error) => {
          console.error('Failed to delete calendar event:', error)
        }
      )
    }

    // キャンセル通知を送信（非同期）
    Promise.allSettled([
      sendCancellationEmail(
        {
          ...booking,
          cancelReason: booking.cancelReason,
        },
        existingBooking.bookingLink,
        existingBooking.user
      ),
      sendBookingCancelledChatNotification(
        existingBooking.user.company?.googleChatWebhookUrl,
        {
          ...booking,
          cancelReason: booking.cancelReason,
        },
        existingBooking.bookingLink,
        existingBooking.user
      ),
    ]).catch((error) => {
      console.error('Failed to send cancellation notifications:', error)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to cancel booking:', error)
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}