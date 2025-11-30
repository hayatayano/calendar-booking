import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * ラウンドロビン方式で次の担当者を取得
 */
async function getNextAssignedUser(bookingLinkId: string, members: any[]) {
  if (!members || members.length === 0) {
    return null
  }

  // 各メンバーの最後の予約時間を取得
  const membersWithLastBooking = await Promise.all(
    members.map(async (member) => {
      const lastBooking = await prisma.booking.findFirst({
        where: {
          bookingLinkId: bookingLinkId,
          userId: member.userId,
          status: { not: 'CANCELLED' },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      })

      return {
        ...member,
        lastBookingTime: lastBooking?.createdAt || new Date(0),
      }
    })
  )

  // 最後の予約時間が最も古いメンバーを選択（ラウンドロビン）
  membersWithLastBooking.sort((a, b) => {
    const timeA = a.lastBookingTime?.getTime() || 0
    const timeB = b.lastBookingTime?.getTime() || 0
    return timeA - timeB
  })

  return membersWithLastBooking[0]
}

/**
 * 予約リンク情報を取得（公開API）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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
            title: true,
            photoUrl: true,
            comment: true,
            company: {
              select: {
                id: true,
                name: true,
                socialLinks: {
                  select: {
                    id: true,
                    platform: true,
                    url: true,
                  },
                },
              },
            },
          },
        },
        formFields: {
          orderBy: {
            order: 'asc',
          },
        },
        socialLinks: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                title: true,
                photoUrl: true,
                comment: true,
              },
            },
          },
        },
      },
    })

    if (!bookingLink) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // ラウンドロビン方式の場合、次の担当者を計算
    let nextAssignedUser = null
    if (bookingLink.roundRobinEnabled && bookingLink.members && bookingLink.members.length > 0) {
      const nextMember = await getNextAssignedUser(bookingLink.id, bookingLink.members)
      if (nextMember) {
        nextAssignedUser = nextMember.user
      }
    }

    return NextResponse.json({
      ...bookingLink,
      nextAssignedUser,
    })
  } catch (error) {
    console.error('Failed to fetch booking link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking link' },
      { status: 500 }
    )
  }
}