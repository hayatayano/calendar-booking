import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 招待受諾
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await params

    // 招待情報を取得
    const invitation = await prisma.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json({ error: '招待が見つかりません' }, { status: 404 })
    }

    // 有効期限チェック
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: '招待の有効期限が切れています' }, { status: 400 })
    }

    // 既に承認済みかチェック
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json({ error: 'この招待は既に使用されています' }, { status: 400 })
    }

    // 招待されたメールアドレスとログインしているメールアドレスが一致するかチェック
    if (invitation.email !== session.user.email) {
      return NextResponse.json({ 
        error: '招待されたメールアドレスと異なるアカウントでログインしています' 
      }, { status: 400 })
    }

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 既に別の会社に所属している場合はエラー
    if (user.companyId && user.companyId !== invitation.companyId) {
      return NextResponse.json({ 
        error: '既に別の会社に所属しています' 
      }, { status: 400 })
    }

    // ユーザーを会社に追加
    await prisma.user.update({
      where: { id: user.id },
      data: {
        companyId: invitation.companyId,
      },
    })

    // 招待のステータスを更新
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
      },
    })

    return NextResponse.json({ 
      success: true,
      redirectUrl: '/home',
    })
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}