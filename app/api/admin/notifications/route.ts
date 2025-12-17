import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 通知履歴一覧を取得
 * GET /api/admin/notifications
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの会社IDを取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, isCompanyAdmin: true },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // PENDING, SENT, FAILED, RETRYING
    const category = searchParams.get('category') // booking, invitation, system
    const method = searchParams.get('method') // EMAIL, SMS
    const search = searchParams.get('search') // recipient検索

    const skip = (page - 1) * limit

    // フィルター条件を構築
    const where: any = {}

    // 会社に所属するユーザーの通知のみ取得
    const companyUserIds = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true },
    })
    const userIds = companyUserIds.map((u) => u.id)

    where.OR = [
      { userId: { in: userIds } },
      { companyId: user.companyId },
    ]

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    if (method) {
      where.method = method
    }

    if (search) {
      where.recipient = { contains: search, mode: 'insensitive' }
    }

    // 通知一覧を取得
    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              guestName: true,
              guestEmail: true,
              startTime: true,
              bookingLink: {
                select: {
                  title: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ])

    // 統計情報を取得
    const stats = await prisma.notificationLog.groupBy({
      by: ['status'],
      where: {
        OR: [
          { userId: { in: userIds } },
          { companyId: user.companyId },
        ],
      },
      _count: { status: true },
    })

    const statsMap = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      retrying: 0,
    }

    stats.forEach((s) => {
      statsMap.total += s._count.status
      switch (s.status) {
        case 'SENT':
          statsMap.sent = s._count.status
          break
        case 'FAILED':
          statsMap.failed = s._count.status
          break
        case 'PENDING':
          statsMap.pending = s._count.status
          break
        case 'RETRYING':
          statsMap.retrying = s._count.status
          break
      }
    })

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: statsMap,
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
