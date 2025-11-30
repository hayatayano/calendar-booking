import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns'

/**
 * ダッシュボード統計情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const userId = session.user.id

    // 今月の予約数
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    
    const thisMonthBookings = await prisma.booking.count({
      where: {
        userId,
        startTime: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })

    // 今週の予約数
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 })
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 0 })
    
    const thisWeekBookings = await prisma.booking.count({
      where: {
        userId,
        startTime: {
          gte: thisWeekStart,
          lte: thisWeekEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })

    // 今日の予約数
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    const todayBookings = await prisma.booking.count({
      where: {
        userId,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })

    // 直近の予約（今後7日間）
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        userId,
        startTime: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'CONFIRMED',
      },
      include: {
        bookingLink: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 10,
    })

    // アクティブな予約リンク数
    const activeLinks = await prisma.bookingLink.count({
      where: {
        userId,
        isActive: true,
      },
    })

    // 予約リンク別の予約数（今月）
    const bookingsByLink = await prisma.booking.groupBy({
      by: ['bookingLinkId'],
      where: {
        userId,
        startTime: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    })

    // 予約リンク情報を追加
    const bookingsByLinkWithDetails = await Promise.all(
      bookingsByLink.map(async (item: any) => {
        const link = await prisma.bookingLink.findUnique({
          where: { id: item.bookingLinkId },
          select: {
            title: true,
            slug: true,
          },
        })
        return {
          ...link,
          bookingCount: item._count.id,
        }
      })
    )

    // キャンセル率
    const totalBookingsThisMonth = await prisma.booking.count({
      where: {
        userId,
        startTime: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
      },
    })

    const cancelledBookingsThisMonth = await prisma.booking.count({
      where: {
        userId,
        startTime: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
        status: 'CANCELLED',
      },
    })

    const cancellationRate = totalBookingsThisMonth > 0
      ? (cancelledBookingsThisMonth / totalBookingsThisMonth) * 100
      : 0

    // 過去30日間の予約推移
    const bookingTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
      
      const count = await prisma.booking.count({
        where: {
          userId,
          startTime: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: {
            not: 'CANCELLED',
          },
        },
      })

      bookingTrend.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }

    return NextResponse.json({
      summary: {
        thisMonth: thisMonthBookings,
        thisWeek: thisWeekBookings,
        today: todayBookings,
        activeLinks,
        cancellationRate: cancellationRate.toFixed(2),
      },
      upcomingBookings,
      bookingsByLink: bookingsByLinkWithDetails,
      bookingTrend,
    })
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}