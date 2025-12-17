import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 通知統計情報を取得
 * GET /api/admin/notifications/stats
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
      select: { companyId: true },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 会社に所属するユーザーIDを取得
    const companyUserIds = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true },
    })
    const userIds = companyUserIds.map((u) => u.id)

    const baseWhere = {
      OR: [
        { userId: { in: userIds } },
        { companyId: user.companyId },
      ],
    }

    // 各種統計を並行して取得
    const [
      statusStats,
      methodStats,
      categoryStats,
      recentFailures,
      dailyStats,
    ] = await Promise.all([
      // ステータス別統計
      prisma.notificationLog.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      // 送信方法別統計
      prisma.notificationLog.groupBy({
        by: ['method'],
        where: baseWhere,
        _count: { method: true },
      }),
      // カテゴリ別統計
      prisma.notificationLog.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: { category: true },
      }),
      // 最近の失敗（過去7日間）
      prisma.notificationLog.count({
        where: {
          ...baseWhere,
          status: 'FAILED',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // 過去7日間の日別送信数
      prisma.$queryRaw`
        SELECT
          DATE(created_at AT TIME ZONE 'Asia/Tokyo') as date,
          status,
          COUNT(*)::int as count
        FROM "NotificationLog"
        WHERE (user_id = ANY(${userIds}) OR company_id = ${user.companyId})
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at AT TIME ZONE 'Asia/Tokyo'), status
        ORDER BY date DESC
      ` as Promise<{ date: Date; status: string; count: number }[]>,
    ])

    // 統計データを整形
    const stats = {
      byStatus: statusStats.reduce(
        (acc, s) => {
          acc[s.status.toLowerCase()] = s._count.status
          return acc
        },
        { sent: 0, failed: 0, pending: 0, retrying: 0 } as Record<string, number>
      ),
      byMethod: methodStats.reduce(
        (acc, s) => {
          acc[s.method.toLowerCase()] = s._count.method
          return acc
        },
        { email: 0, sms: 0, both: 0 } as Record<string, number>
      ),
      byCategory: categoryStats.reduce(
        (acc, s) => {
          acc[s.category] = s._count.category
          return acc
        },
        {} as Record<string, number>
      ),
      recentFailures,
      daily: dailyStats,
    }

    // 成功率を計算
    const total = Object.values(stats.byStatus).reduce((a, b) => a + b, 0)
    const successRate = total > 0 ? (stats.byStatus.sent / total) * 100 : 0

    return NextResponse.json({
      ...stats,
      total,
      successRate: Math.round(successRate * 100) / 100,
    })
  } catch (error) {
    console.error('Failed to fetch notification stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 }
    )
  }
}
