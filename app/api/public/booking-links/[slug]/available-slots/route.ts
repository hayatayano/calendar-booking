import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/google-calendar'
import { selectMemberByRoundRobin } from '@/lib/assignment'

/**
 * 予約可能な時間帯を取得（公開API）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    // 予約リンクを取得
    const bookingLink = await prisma.bookingLink.findUnique({
      where: {
        slug,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            comment: true,
            title: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
                comment: true,
                title: true,
              },
            },
          },
        },
      },
    })

    if (!bookingLink) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 日付をパース
    const date = new Date(dateStr)
    
    // 受付期限をチェック
    const now = new Date()
    const minBookingTime = new Date(now.getTime() + bookingLink.advanceNotice * 60000)
    
    if (date < minBookingTime) {
      return NextResponse.json({ slots: [] })
    }

    // ラウンドロビン方式の場合、各スロットの担当者を事前計算
    if (bookingLink.roundRobinEnabled && bookingLink.members && bookingLink.members.length > 0) {
      // メンバー全員の空き時間を取得して統合
      const allSlots = new Map<string, { start: Date; end: Date; assignedUser: any }>()
      
      for (const member of bookingLink.members) {
        const memberSlots = await getAvailableSlots(
          member.userId,
          date,
          bookingLink.duration,
          bookingLink.bufferTime
        )
        
        for (const slot of memberSlots) {
          const key = slot.start.toISOString()
          if (!allSlots.has(key)) {
            // この時間帯で担当者を選択
            const assignedUserId = await selectMemberByRoundRobin(
              bookingLink.id,
              slot.start,
              bookingLink.duration
            )
            
            if (assignedUserId) {
              const assignedMember = bookingLink.members.find(m => m.userId === assignedUserId)
              if (assignedMember) {
                allSlots.set(key, {
                  ...slot,
                  assignedUser: assignedMember.user,
                })
              }
            }
          }
        }
      }
      
      // スロットを時間順にソート
      const sortedSlots = Array.from(allSlots.values())
        .filter(slot => slot.start >= minBookingTime)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
      
      return NextResponse.json({ slots: sortedSlots })
    }

    // 通常の予約リンク（ラウンドロビンなし）
    const slots = await getAvailableSlots(
      bookingLink.userId,
      date,
      bookingLink.duration,
      bookingLink.bufferTime
    )

    // 受付期限を考慮してフィルタリング
    const availableSlots = slots.filter(slot => slot.start >= minBookingTime)

    return NextResponse.json({ slots: availableSlots })
  } catch (error) {
    console.error('Failed to fetch available slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available slots' },
      { status: 500 }
    )
  }
}