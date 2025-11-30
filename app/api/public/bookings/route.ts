import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendNotification, sendStaffBookingNotificationSMS, sendStaffBookingNotificationEmail } from '@/lib/notifications'
import { sendBookingCreatedChatNotification } from '@/lib/google-chat'
import { selectMemberByRoundRobin } from '@/lib/assignment'
import { Prisma } from '@prisma/client'

/**
 * 予約を作成（公開API）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bookingLinkSlug,
      guestName,
      guestEmail,
      guestPhone,
      startTime,
      meetingType,
      location,
      formResponses,
    } = body

    // バリデーション
    if (!bookingLinkSlug || !guestName || !guestEmail || !guestPhone || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 予約リンクを取得
    const bookingLink = await prisma.bookingLink.findUnique({
      where: {
        slug: bookingLinkSlug,
        isActive: true,
      },
      include: {
        user: {
          include: {
            company: true,
          },
        },
        formFields: true,
        members: {
          include: {
            user: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    })

    if (!bookingLink) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 })
    }

    // 日時の計算
    const start = new Date(startTime)
    const end = new Date(start.getTime() + bookingLink.duration * 60000)

    // 受付期限チェック
    const now = new Date()
    const minBookingTime = new Date(now.getTime() + bookingLink.advanceNotice * 60000)
    
    if (start < minBookingTime) {
      return NextResponse.json(
        { error: 'Booking time is too soon' },
        { status: 400 }
      )
    }

    // フォーム回答を整形してメモとして保存
    let notes = ''
    if (formResponses && formResponses.length > 0) {
      notes = formResponses
        .map((response: any) => {
          const field = bookingLink.formFields.find((f: any) => f.id === response.formFieldId)
          return field ? `${field.label}: ${response.value}` : ''
        })
        .filter(Boolean)
        .join('\n')
    }

    // 担当者を選択（ラウンドロビン or デフォルト）
    let assignedUserId = bookingLink.userId
    
    // メンバーがいる場合はラウンドロビン方式で選択
    if (bookingLink.members && bookingLink.members.length > 0) {
      const selectedUserId = await selectMemberByRoundRobin(
        bookingLink.id,
        start,
        bookingLink.duration
      )
      
      if (selectedUserId) {
        assignedUserId = selectedUserId
        console.log('Round robin selected user:', assignedUserId)
      } else {
        // 誰も空いていない場合はエラー
        return NextResponse.json(
          { error: 'No available staff for this time slot' },
          { status: 400 }
        )
      }
    }

    // 担当者のユーザー情報を取得（電話番号も含む）
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedUserId },
      include: { company: true },
    })

    // トランザクションで予約を作成
    const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Googleカレンダーにイベントを作成（担当者のカレンダーに）
      const calendarResult = await createCalendarEvent(assignedUserId, {
        guestName,
        guestEmail,
        startTime: start,
        endTime: end,
        meetingType,
        location,
        notes,
      })

      // 予約をデータベースに保存
      const newBooking = await tx.booking.create({
        data: {
          bookingLinkId: bookingLink.id,
          userId: assignedUserId,
          guestName,
          guestEmail,
          guestPhone,
          startTime: start,
          endTime: end,
          meetingType,
          meetingUrl: calendarResult.meetingUrl,
          location,
          googleEventId: calendarResult.eventId,
          notes,
          status: 'CONFIRMED',
        },
      })

      // フォーム回答を保存
      if (formResponses && formResponses.length > 0) {
        await tx.formResponse.createMany({
          data: formResponses.map((response: any) => ({
            bookingId: newBooking.id,
            formFieldId: response.formFieldId,
            value: response.value,
          })),
        })
      }

      return newBooking
    })

    // 非同期で通知を送信（エラーが発生しても予約は成功とする）
    // 担当者の会社のWebhookを使用
    const notificationPromises = [
      sendNotification(booking.id, bookingLink.notificationMethod, 'BOOKING_CREATED'),
      sendBookingCreatedChatNotification(
        assignedUser?.company?.googleChatWebhookUrl || bookingLink.user.company?.googleChatWebhookUrl,
        {
          ...booking,
          meetingUrl: booking.meetingUrl,
          location: booking.location,
        },
        bookingLink,
        assignedUser || bookingLink.user
      ),
    ]
    
    // 担当者にメール通知を送信
    if (assignedUser) {
      notificationPromises.push(
        sendStaffBookingNotificationEmail(
          {
            id: booking.id,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            guestPhone: booking.guestPhone,
            startTime: booking.startTime,
            endTime: booking.endTime,
            meetingType: booking.meetingType,
            meetingUrl: booking.meetingUrl,
            location: booking.location,
            notes: booking.notes,
          },
          { title: bookingLink.title },
          {
            id: assignedUser.id,
            name: assignedUser.name,
            email: assignedUser.email,
            company: assignedUser.company,
          }
        )
      )
    }
    
    // 担当者にSMS通知を送信（電話番号が設定されている場合）
    // @ts-ignore - phone フィールドはマイグレーション後に利用可能
    const staffPhone = (assignedUser as any)?.phone
    console.log('Staff phone for SMS notification:', staffPhone, 'User ID:', assignedUserId)
    if (staffPhone) {
      notificationPromises.push(
        sendStaffBookingNotificationSMS(
          {
            id: booking.id,
            guestName: booking.guestName,
            guestPhone: booking.guestPhone,
            startTime: booking.startTime,
          },
          { title: bookingLink.title },
          {
            id: assignedUser!.id,
            phone: staffPhone,
            company: assignedUser?.company,
          }
        )
      )
    }
    
    Promise.allSettled(notificationPromises).catch((error) => {
      console.error('Failed to send notifications:', error)
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Failed to create booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}