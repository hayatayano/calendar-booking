import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 会社情報取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        company: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                title: true,
                photoUrl: true,
                isCompanyAdmin: true,
                createdAt: true,
              },
            },
            socialLinks: {
              select: {
                id: true,
                platform: true,
                url: true,
              },
            },
          },
        },
      },
    })

    if (!user?.company) {
      return NextResponse.json({ company: null, isAdmin: false })
    }

    return NextResponse.json({
      company: user.company,
      isAdmin: user.isCompanyAdmin
    })
  } catch (error) {
    console.error('Failed to fetch company:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 会社作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // 既に会社に所属していないか確認
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (user?.companyId) {
      return NextResponse.json({ error: 'User already belongs to a company' }, { status: 400 })
    }

    // 会社を作成し、ユーザーを管理者として設定
    const company = await prisma.company.create({
      data: {
        name,
        users: {
          connect: { id: user!.id },
        },
      },
    })

    // ユーザーを会社管理者に設定
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        isCompanyAdmin: true,
      },
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Failed to create company:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 会社情報更新
export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only company admin can update company' }, { status: 403 })
    }

    const body = await request.json()
    const { name, googleChatWebhookUrl, socialLinks } = body

    // トランザクションで会社情報とSNSリンクを更新
    const company = await prisma.$transaction(async (tx) => {
      // 会社情報を更新
      const updatedCompany = await tx.company.update({
        where: { id: user.companyId! },
        data: {
          ...(name !== undefined && { name }),
          ...(googleChatWebhookUrl !== undefined && { googleChatWebhookUrl }),
        },
      })

      // SNSリンクが指定されている場合は更新
      if (socialLinks !== undefined) {
        // 既存のSNSリンクを削除
        await tx.companySocialLink.deleteMany({
          where: { companyId: user.companyId! }
        })

        // 新しいSNSリンクを作成
        if (socialLinks && socialLinks.length > 0) {
          await tx.companySocialLink.createMany({
            data: socialLinks.map((link: { platform: string; url: string }) => ({
              companyId: user.companyId!,
              platform: link.platform,
              url: link.url,
            }))
          })
        }
      }

      // SNSリンクを含めて返す
      const companyWithSocialLinks = await tx.company.findUnique({
        where: { id: user.companyId! },
        include: {
          socialLinks: {
            select: {
              id: true,
              platform: true,
              url: true,
            },
          },
        },
      })

      return companyWithSocialLinks
    })

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Failed to update company:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}