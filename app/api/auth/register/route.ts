import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Google OAuth経由での新規ユーザー登録用エンドポイント
// セッション情報からユーザーを作成
export async function POST(request: NextRequest) {
  try {
    const { email, name, image } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    // 新規ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email,
        password: '', // Google OAuthなのでパスワードは不要
        photoUrl: image,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Failed to register user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}