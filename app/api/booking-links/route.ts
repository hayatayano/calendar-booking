import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

/**
 * 予約リンク一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 自分がオーナーの予約リンクを取得
    const ownedBookingLinks = await prisma.bookingLink.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        formFields: {
          orderBy: {
            order: 'asc',
          },
        },
        socialLinks: true,
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
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 自分がメンバーとして参加している予約リンク（オーナーではないもの）を取得
    const memberBookingLinks = await prisma.bookingLink.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
        userId: {
          not: session.user.id, // オーナーではない
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        formFields: {
          orderBy: {
            order: 'asc',
          },
        },
        socialLinks: true,
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
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // オーナーかどうかのフラグを追加して結合
    const ownedWithFlag = ownedBookingLinks.map(link => ({
      ...link,
      isOwner: true,
      myRole: 'OWNER' as const,
    }))

    const memberWithFlag = memberBookingLinks.map(link => {
      const myMembership = link.members.find(m => m.userId === session.user.id)
      return {
        ...link,
        isOwner: false,
        myRole: myMembership?.role || 'VIEWER' as const,
      }
    })

    // オーナーの予約リンクを先に、その後にメンバーの予約リンクを表示
    const allBookingLinks = [...ownedWithFlag, ...memberWithFlag]

    return NextResponse.json(allBookingLinks)
  } catch (error) {
    console.error('Failed to fetch booking links:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking links' },
      { status: 500 }
    )
  }
}

/**
 * 予約リンク作成
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('API: Received request body:', body)
    console.log('API: formFields from request:', body.formFields)
    console.log('API: formFields length:', body.formFields ? body.formFields.length : 0)
    
    const {
      title,
      slug,
      description,
      duration,
      meetingType,
      allowBothTypes,
      advanceNotice,
      bufferTime,
      customMessage,
      notificationMethod,
      formTitle,
      formFields,
      socialLinks,
      requiredMembers,
      bookingCondition,
      roundRobinEnabled,
    } = body
    
    console.log('API: Destructured formFields:', formFields)

    // slugが提供されていない場合は自動生成
    const finalSlug = slug || nanoid(10)

    // slug重複チェック
    const existingLink = await prisma.bookingLink.findUnique({
      where: { slug: finalSlug },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'このURLは既に使用されています。別のURLを指定してください。' },
        { status: 400 }
      )
    }

    console.log('API: About to create booking link with formFields:', formFields)
    console.log('API: Required members:', requiredMembers)
    
    // 予約リンクを作成
    const bookingLink = await prisma.bookingLink.create({
      data: {
        userId: session.user.id,
        title,
        slug: finalSlug,
        description,
        duration,
        meetingType,
        allowBothTypes,
        advanceNotice,
        bufferTime: bufferTime || 0,
        customMessage,
        notificationMethod,
        formTitle,
        bookingCondition: bookingCondition || 'ALL',
        roundRobinEnabled: roundRobinEnabled || false,
        formFields: formFields
          ? {
              create: formFields.map((field: any, index: number) => ({
                label: field.label,
                fieldType: field.fieldType,
                required: field.required,
                options: field.options
                  ? (typeof field.options === 'string'
                      ? field.options.split(',').map((opt: string) => opt.trim()).filter((opt: string) => opt)
                      : field.options)
                  : [],
                order: index,
              })),
            }
          : undefined,
        socialLinks: socialLinks
          ? {
              create: socialLinks.map((link: any) => ({
                platform: link.platform,
                url: link.url,
              })),
            }
          : undefined,
        members: requiredMembers && requiredMembers.length > 0
          ? {
              create: requiredMembers.map((member: any) => ({
                userId: member.userId,
                role: member.role || 'VIEWER',
              })),
            }
          : undefined,
      },
      include: {
        formFields: true,
        socialLinks: true,
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
    })

    console.log('API: Created booking link:', bookingLink.id)
    console.log('API: Created booking link formFields count:', bookingLink.formFields ? bookingLink.formFields.length : 0)
    console.log('API: Created booking link members count:', bookingLink.members ? bookingLink.members.length : 0)
    return NextResponse.json(bookingLink, { status: 201 })
  } catch (error) {
    console.error('Failed to create booking link:', error)
    return NextResponse.json(
      { error: 'Failed to create booking link' },
      { status: 500 }
    )
  }
}