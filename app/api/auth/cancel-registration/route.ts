import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 登録キャンセル - ユーザーとアカウント情報を削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザー情報を取得（companyIdも含める）
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        companyId: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 会社に所属している場合はキャンセルできない
    if (user.companyId) {
      return NextResponse.json({ error: 'Cannot cancel registration for users with a company' }, { status: 400 })
    }

    // Accountレコードを削除
    await prisma.account.deleteMany({
      where: { userId: user.id },
    })

    // Userレコードを削除
    await prisma.user.delete({
      where: { id: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to cancel registration:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}