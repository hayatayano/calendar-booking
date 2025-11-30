import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 認証なしで招待を受諾（ユーザー作成と同時）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
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

    // ユーザーを取得（既に作成されているはず）
    const user = await prisma.user.findUnique({
      where: { email: invitation.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。先にアカウントを作成してください。' }, { status: 404 })
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
      message: '招待を受諾しました',
    })
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}