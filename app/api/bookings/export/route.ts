import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

/**
 * 予約データをCSV形式でエクスポート
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

    // フィルター条件を構築
    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // 予約データを取得
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        bookingLink: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            name: true,
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

    // CSV形式に変換
    const csvRows: string[] = []
    
    // ヘッダー行
    csvRows.push([
      'ID',
      '予約日時',
      '終了時刻',
      '予約者名',
      'メールアドレス',
      '電話番号',
      '予約タイプ',
      '形式',
      '場所/URL',
      'ステータス',
      '担当者',
      'メモ',
      'フォーム回答',
      '作成日時',
    ].join(','))

    // データ行
    for (const booking of bookings) {
      const formResponsesText = booking.formResponses
        .map((r: any) => `${r.formField.label}: ${r.value}`)
        .join('; ')

      const meetingInfo = booking.meetingType === 'ONLINE'
        ? booking.meetingUrl || ''
        : booking.location || ''

      const row = [
        booking.id,
        format(new Date(booking.startTime), 'yyyy-MM-dd HH:mm'),
        format(new Date(booking.endTime), 'HH:mm'),
        `"${booking.guestName}"`,
        booking.guestEmail,
        booking.guestPhone,
        `"${booking.bookingLink.title}"`,
        booking.meetingType === 'ONLINE' ? 'オンライン' : '対面',
        `"${meetingInfo}"`,
        booking.status,
        `"${booking.user.name}"`,
        `"${booking.notes?.replace(/"/g, '""') || ''}"`,
        `"${formResponsesText.replace(/"/g, '""')}"`,
        format(new Date(booking.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      ].join(',')

      csvRows.push(row)
    }

    const csvContent = csvRows.join('\n')
    
    // BOM付きUTF-8で出力（Excel対応）
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // レスポンスヘッダーを設定
    const fileName = `bookings_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
    
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export bookings:', error)
    return NextResponse.json(
      { error: 'Failed to export bookings' },
      { status: 500 }
    )
  }
}