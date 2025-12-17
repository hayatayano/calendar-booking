import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { retryNotification } from '@/lib/notifications'

/**
 * 通知を再送
 * POST /api/admin/notifications/[id]/retry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // ユーザーの会社IDを取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, isCompanyAdmin: true },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 通知が存在し、会社に属しているか確認
    const notification = await prisma.notificationLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { companyId: true },
        },
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // 権限チェック：同じ会社の通知のみ再送可能
    if (notification.user?.companyId !== user.companyId && notification.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 再送不可のステータスをチェック
    if (notification.status === 'SENT') {
      return NextResponse.json({ error: '既に送信済みの通知です' }, { status: 400 })
    }

    if (notification.status === 'RETRYING') {
      return NextResponse.json({ error: '再送処理中です' }, { status: 400 })
    }

    // 再送を実行
    const result = await retryNotification(id)

    if (result.success) {
      return NextResponse.json({ success: true, message: '再送が完了しました' })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Failed to retry notification:', error)
    return NextResponse.json(
      { error: 'Failed to retry notification' },
      { status: 500 }
    )
  }
}
