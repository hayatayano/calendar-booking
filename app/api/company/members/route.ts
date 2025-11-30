import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/company/members - 会社メンバー一覧取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // ログインユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { company: true }
    })

    if (!user?.companyId) {
      return NextResponse.json(
        { error: '会社に所属していません' },
        { status: 403 }
      )
    }

    // 同じ会社のメンバーを取得
    const members = await prisma.user.findMany({
      where: {
        companyId: user.companyId
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        title: true,
        isCompanyAdmin: true,
        googleCalendarEmbedUrl: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Failed to fetch company members:', error)
    return NextResponse.json(
      { error: 'メンバー取得に失敗しました' },
      { status: 500 }
    )
  }
}