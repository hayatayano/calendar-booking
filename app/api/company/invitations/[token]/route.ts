import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 招待情報取得（トークンベース）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Failed to fetch invitation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}