import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * 予約リンク詳細取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15ではparamsがPromiseの可能性があるのでawait
    const resolvedParams = await params
    const bookingId = resolvedParams.id
    
    console.log('API: Fetching booking link with ID:', bookingId)

    // 自分がオーナーの予約リンクを検索
    let bookingLink = await prisma.bookingLink.findFirst({
      where: {
        id: bookingId,
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
    })

    let isOwner = true

    // オーナーでない場合、メンバーとして参加しているか確認
    if (!bookingLink) {
      bookingLink = await prisma.bookingLink.findFirst({
        where: {
          id: bookingId,
          members: {
            some: {
              userId: session.user.id,
            },
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
      })
      isOwner = false
    }

    if (!bookingLink) {
      console.log('API: Booking link not found for ID:', bookingId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // オーナーかどうかの情報を追加してレスポンス
    const myMembership = bookingLink.members.find(m => m.userId === session.user.id)
    const response = {
      ...bookingLink,
      isOwner,
      myRole: isOwner ? 'OWNER' : (myMembership?.role || 'VIEWER'),
    }

    console.log('API: Found booking link:', bookingLink.id, bookingLink.title, 'isOwner:', isOwner)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch booking link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking link' },
      { status: 500 }
    )
  }
}

/**
 * 予約リンク更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15ではparamsがPromiseの可能性があるのでawait
    const resolvedParams = await params
    const bookingId = resolvedParams.id
    
    console.log('API PATCH: Updating booking link with ID:', bookingId)

    const body = await request.json()
    const {
      title,
      description,
      duration,
      meetingType,
      allowBothTypes,
      advanceNotice,
      bufferTime,
      customMessage,
      notificationMethod,
      formTitle,
      isActive,
      formFields,
      socialLinks,
      requiredMembers,
      bookingCondition,
      roundRobinEnabled,
    } = body

    // 既存の予約リンクを確認
    const existingLink = await prisma.bookingLink.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
    })

    if (!existingLink) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 更新処理
    const bookingLink = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 既存のフォームフィールドと SNS リンクを削除
      if (formFields) {
        await tx.formField.deleteMany({
          where: { bookingLinkId: bookingId },
        })
      }

      if (socialLinks) {
        await tx.socialLink.deleteMany({
          where: { bookingLinkId: bookingId },
        })
      }

      // 既存のメンバーを削除（新しいメンバーが指定されている場合）
      if (requiredMembers !== undefined) {
        await tx.bookingLinkMember.deleteMany({
          where: { bookingLinkId: bookingId },
        })
      }

      // 予約リンクを更新
      return tx.bookingLink.update({
        where: { id: bookingId },
        data: {
          title,
          description,
          duration,
          meetingType,
          allowBothTypes,
          advanceNotice,
          bufferTime,
          customMessage,
          notificationMethod,
          formTitle,
          isActive,
          bookingCondition: bookingCondition || undefined,
          roundRobinEnabled: roundRobinEnabled !== undefined ? roundRobinEnabled : undefined,
          formFields: formFields
            ? {
                create: formFields.map((field: any, index: number) => ({
                  label: field.label,
                  fieldType: field.fieldType,
                  required: field.required,
                  options: field.options || [],
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
    })

    return NextResponse.json(bookingLink)
  } catch (error) {
    console.error('Failed to update booking link:', error)
    return NextResponse.json(
      { error: 'Failed to update booking link' },
      { status: 500 }
    )
  }
}

/**
 * 予約リンク削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15ではparamsがPromiseの可能性があるのでawait
    const resolvedParams = await params
    const bookingId = resolvedParams.id
    
    console.log('API DELETE: Deleting booking link with ID:', bookingId)

    // 既存の予約リンクを確認
    const existingLink = await prisma.bookingLink.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    })

    if (!existingLink) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 紐づいている予約が存在する場合はエラー
    if (existingLink._count.bookings > 0) {
      return NextResponse.json(
        { error: `この予約リンクには${existingLink._count.bookings}件の予約が紐づいているため削除できません` },
        { status: 400 }
      )
    }

    // 削除
    await prisma.bookingLink.delete({
      where: { id: bookingId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete booking link:', error)
    return NextResponse.json(
      { error: 'Failed to delete booking link' },
      { status: 500 }
    )
  }
}