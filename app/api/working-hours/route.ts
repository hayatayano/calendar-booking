import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 稼働時間一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workingHours = await prisma.workingHours.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    })

    return NextResponse.json(workingHours)
  } catch (error) {
    console.error('Failed to fetch working hours:', error)
    return NextResponse.json(
      { error: 'Failed to fetch working hours' },
      { status: 500 }
    )
  }
}

/**
 * 稼働時間作成・更新
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { dayOfWeek, startTime, endTime, isAvailable } = body

    // 既存の設定を削除して新規作成
    await prisma.workingHours.deleteMany({
      where: {
        userId: session.user.id,
        dayOfWeek,
      },
    })

    const workingHour = await prisma.workingHours.create({
      data: {
        userId: session.user.id,
        dayOfWeek,
        startTime,
        endTime,
        isAvailable,
      },
    })

    return NextResponse.json(workingHour, { status: 201 })
  } catch (error) {
    console.error('Failed to create working hour:', error)
    return NextResponse.json(
      { error: 'Failed to create working hour' },
      { status: 500 }
    )
  }
}