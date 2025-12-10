import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkMultipleUsersAvailability, createCalendarEvent } from '@/lib/google-calendar'
import { 
  sendBookingConfirmationEmail, 
  sendStaffBookingNotificationEmail 
} from '@/lib/notifications'

/**
 * 手動で予約を作成（管理者・担当者用）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      startTime,
      endTime,
      guestName,
      guestEmail,
      guestPhone,
      meetingType,
      location,
      notes,
      assignedUserIds, // 複数の担当者ID
    } = body

    // バリデーション
    if (!startTime || !guestName || !guestEmail || !meetingType || !assignedUserIds || assignedUserIds.length === 0) {
      return NextResponse.json(
        { error: '必須項目が入力されていません（日時、氏名、メールアドレス、面談形式、担当者）' },
        { status: 400 }
      )
    }

    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60000) // デフォルト1時間

    // 過去の日時チェック
    if (start < new Date()) {
      return NextResponse.json(
        { error: '過去の日時には予約できません' },
        { status: 400 }
      )
    }

    // 全担当者の空き時間をチェック
    const availabilityResults = await checkMultipleUsersAvailability(
      assignedUserIds,
      start,
      end
    )

    // 空いていない担当者がいるかチェック
    const unavailableUsers = availabilityResults.filter(r => !r.available)
    if (unavailableUsers.length > 0) {
      const reasons = unavailableUsers.map(u => 
        `${u.userName || u.userId}: ${u.reason}`
      ).join('\n')
      return NextResponse.json(
        { 
          error: '以下の担当者は指定の時間帯に予約できません',
          details: reasons,
          unavailableUsers,
        },
        { status: 400 }
      )
    }

    // 担当者情報を取得
    const assignedUsers = await prisma.user.findMany({
      where: {
        id: { in: assignedUserIds },
      },
      include: {
        company: true,
      },
    })

    if (assignedUsers.length === 0) {
      return NextResponse.json(
        { error: '担当者が見つかりません' },
        { status: 400 }
      )
    }

    // 主担当者（最初に選択された担当者）
    const primaryUser = assignedUsers[0]

    // 手動予約用のBookingLinkを取得または作成
    let manualBookingLink = await prisma.bookingLink.findFirst({
      where: {
        userId: primaryUser.id,
        slug: `manual-${primaryUser.id}`,
      },
    })

    if (!manualBookingLink) {
      manualBookingLink = await prisma.bookingLink.create({
        data: {
          userId: primaryUser.id,
          title: '手動予約',
          slug: `manual-${primaryUser.id}`,
          description: '手動で登録された予約',
          duration: Math.round((end.getTime() - start.getTime()) / 60000),
          meetingType: 'BOTH',
          advanceNotice: 0,
          bufferTime: 0,
          isActive: true,
          notificationMethod: 'EMAIL',
        },
      })
    }

    // 予約を作成
    const booking = await prisma.booking.create({
      data: {
        bookingLinkId: manualBookingLink.id,
        userId: primaryUser.id,
        guestName,
        guestEmail,
        guestPhone: guestPhone || '',
        startTime: start,
        endTime: end,
        meetingType,
        location: meetingType === 'OFFLINE' ? location : null,
        notes,
        status: 'CONFIRMED',
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

    // 各担当者のGoogleカレンダーにイベントを作成
    const calendarResults = await Promise.allSettled(
      assignedUsers.map(async (user) => {
        try {
          const result = await createCalendarEvent(user.id, {
            guestName,
            guestEmail,
            startTime: start,
            endTime: end,
            meetingType,
            location: meetingType === 'OFFLINE' ? location : undefined,
            notes,
          })
          return { userId: user.id, success: true as const, eventId: result.eventId, meetingUrl: result.meetingUrl }
        } catch (error) {
          console.error(`Failed to create calendar event for user ${user.id}:`, error)
          return { userId: user.id, success: false as const, error }
        }
      })
    )

    // 主担当者のカレンダーイベントIDを保存
    const primaryCalendarResult = calendarResults.find(
      (r) => r.status === 'fulfilled' && r.value.userId === primaryUser.id && r.value.success === true
    )

    let primaryEventId: string | null = null
    let primaryMeetingUrl: string | null = null

    if (primaryCalendarResult && primaryCalendarResult.status === 'fulfilled' && primaryCalendarResult.value.success) {
      primaryEventId = primaryCalendarResult.value.eventId || null
      primaryMeetingUrl = primaryCalendarResult.value.meetingUrl || null
      
      if (primaryEventId) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            googleEventId: primaryEventId,
            meetingUrl: primaryMeetingUrl,
          },
        })
      }
    }

    // メール通知を送信
    try {
      // ゲストへの確認メール
      await sendBookingConfirmationEmail(
        {
          ...booking,
          meetingUrl: primaryMeetingUrl,
        },
        booking.bookingLink,
        booking.user
      )

      // 全担当者への通知メール
      await Promise.allSettled(
        assignedUsers.map(async (user) => {
          await sendStaffBookingNotificationEmail(
            {
              ...booking,
              meetingUrl: primaryMeetingUrl,
            },
            booking.bookingLink,
            {
              id: user.id,
              name: user.name,
              email: user.email,
              company: user.company,
            }
          )
        })
      )
    } catch (error) {
      console.error('Failed to send notification emails:', error)
      // メール送信失敗は予約作成自体の失敗にはしない
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        meetingUrl: primaryMeetingUrl,
      },
      calendarResults: calendarResults.map(r =>
        r.status === 'fulfilled' ? r.value : { success: false, error: 'Calendar creation failed' }
      ),
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create manual booking:', error)
    return NextResponse.json(
      { error: '予約の作成に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 空き時間チェック
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startTime, endTime, userIds } = body

    if (!startTime || !endTime || !userIds || userIds.length === 0) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    const results = await checkMultipleUsersAvailability(userIds, start, end)

    return NextResponse.json({
      results,
      allAvailable: results.every(r => r.available),
    })
  } catch (error) {
    console.error('Failed to check availability:', error)
    return NextResponse.json(
      { error: '空き時間の確認に失敗しました' },
      { status: 500 }
    )
  }
}