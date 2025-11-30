import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 予約一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    // 自分が参加しているBookingLinkのIDを取得（メンバーとして参加しているもの含む）
    const memberBookingLinks = await prisma.bookingLinkMember.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        bookingLinkId: true,
      },
    })

    const memberBookingLinkIds = memberBookingLinks.map(m => m.bookingLinkId)

    // フィルター条件を構築
    // 自分が担当している予約 OR 自分がメンバーの予約リンクの予約
    const baseCondition: any = {
      OR: [
        { userId: session.user.id },
        { bookingLinkId: { in: memberBookingLinkIds } },
      ],
    }

    const where: any = { ...baseCondition }

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { guestName: { contains: search, mode: 'insensitive' } },
            { guestEmail: { contains: search, mode: 'insensitive' } },
            { guestPhone: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        bookingLink: {
          select: {
            title: true,
            slug: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        formResponses: {
          include: {
            formField: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Failed to fetch bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}

/**
 * 予約を手動で作成
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      bookingLinkId,
      guestName,
      guestEmail,
      guestPhone,
      startTime,
      endTime,
      meetingType,
      meetingUrl,
      location,
      notes,
    } = body

    // バリデーション
    if (!bookingLinkId || !guestName || !guestEmail || !guestPhone || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 予約を作成
    const booking = await prisma.booking.create({
      data: {
        bookingLinkId,
        userId: session.user.id,
        guestName,
        guestEmail,
        guestPhone,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetingType,
        meetingUrl,
        location,
        notes,
        status: 'CONFIRMED',
      },
      include: {
        bookingLink: true,
        user: true,
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Failed to create booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}