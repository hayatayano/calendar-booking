import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/user/profile - プロフィール取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        title: true,
        comment: true,
        phone: true,
        googleCalendarEmbedUrl: true,
        companyId: true,
        isCompanyAdmin: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/user/profile - プロフィール更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { name, title, comment, photoUrl, phone, googleCalendarEmbedUrl } = await request.json()

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // プロフィールを更新
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(comment !== undefined && { comment }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(phone !== undefined && { phone }),
        ...(googleCalendarEmbedUrl !== undefined && { googleCalendarEmbedUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        title: true,
        comment: true,
        phone: true,
        googleCalendarEmbedUrl: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    )
  }
}