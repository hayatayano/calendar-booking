import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { sendInvitationEmail } from '@/lib/email'

// 招待一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'User does not belong to a company' }, { status: 400 })
    }

    const invitations = await prisma.invitation.findMany({
      where: { companyId: user.companyId },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 招待送信
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'User does not belong to a company' }, { status: 400 })
    }

    if (!user.isCompanyAdmin) {
      return NextResponse.json({ error: 'Only company admin can send invitations' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // 既に登録済みのユーザーか確認
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // 既に招待済みか確認
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        companyId: user.companyId,
        status: 'PENDING',
      },
    })

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 })
    }

    // 招待トークンを生成（32バイト = 64文字の16進数）
    const token = randomBytes(32).toString('hex')

    // 7日間有効
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.invitation.create({
      data: {
        companyId: user.companyId,
        email,
        token,
        invitedBy: user.id,
        expiresAt,
      },
      include: {
        company: true,
        inviter: true,
      },
    })

    // メール送信処理
    try {
      const invitationUrl = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${token}`
      await sendInvitationEmail(
        email,
        invitationUrl,
        invitation.company.name,
        invitation.inviter.name
      )
    } catch (emailError) {
      console.error('Failed to send invitation email, but invitation was created:', emailError)
      // メール送信失敗でも招待レコードは作成されているので成功として返す
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Failed to send invitation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 招待削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.companyId) {
      return NextResponse.json({ error: 'User does not belong to a company' }, { status: 400 })
    }

    if (!user.isCompanyAdmin) {
      return NextResponse.json({ error: 'Only company admin can delete invitations' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // 招待が自分の会社のものか確認
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Cannot delete invitation from another company' }, { status: 403 })
    }

    // 招待を削除
    await prisma.invitation.delete({
      where: { id: invitationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete invitation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}