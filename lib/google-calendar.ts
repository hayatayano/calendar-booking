import { google } from 'googleapis'
import { prisma } from './prisma'

/**
 * Googleカレンダークライアントを取得
 */
export async function getGoogleCalendarClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
  })

  if (!account || !account.access_token) {
    throw new Error('Google account not connected')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // アクセストークンが期限切れの場合は更新
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? account.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : account.expires_at,
        },
      })
    }
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * 予約可能な時間帯を取得
 */
export async function getAvailableSlots(
  userId: string,
  date: Date,
  duration: number, // 分
  bufferTime: number = 0
) {
  const calendar = await getGoogleCalendarClient(userId)
  
  // 日本時間のタイムゾーンオフセット（+9時間）
  const JST_OFFSET = 9 * 60 * 60 * 1000
  
  // 入力された日付を日本時間として解釈
  // date は YYYY-MM-DD 形式の文字列からパースされた Date オブジェクト
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  
  // その日の開始と終了時刻（日本時間）
  // 日本時間の0:00は、UTCでは前日の15:00
  const startOfDayJST = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - JST_OFFSET)
  const endOfDayJST = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - JST_OFFSET)

  // Googleカレンダーからイベントを取得
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDayJST.toISOString(),
    timeMax: endOfDayJST.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const busySlots = response.data.items?.map(event => ({
    start: new Date(event.start?.dateTime || event.start?.date || ''),
    end: new Date(event.end?.dateTime || event.end?.date || ''),
  })) || []

  // ユーザーの稼働時間を取得
  const dayOfWeek = date.getDay()
  let workingHours = await prisma.workingHours.findFirst({
    where: {
      userId,
      dayOfWeek,
      isAvailable: true,
    },
  })

  // 稼働時間が設定されていない場合はデフォルト（9:00-18:00）を使用
  if (!workingHours) {
    workingHours = {
      id: 'default',
      userId,
      dayOfWeek,
      startTime: '09:00',
      endTime: '18:00',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  // 休暇チェック
  const holiday = await prisma.holiday.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDayJST,
        lte: endOfDayJST,
      },
    },
  })

  if (holiday) {
    return [] // 休暇日
  }

  // 稼働時間から空き時間を計算（日本時間）
  const [startHour, startMinute] = workingHours.startTime.split(':').map(Number)
  const [endHour, endMinute] = workingHours.endTime.split(':').map(Number)

  // 日本時間での稼働開始・終了時刻をUTCに変換
  const workStart = new Date(Date.UTC(year, month, day, startHour, startMinute, 0, 0) - JST_OFFSET)
  const workEnd = new Date(Date.UTC(year, month, day, endHour, endMinute, 0, 0) - JST_OFFSET)

  // 空き時間スロットを生成（1時間間隔で固定）
  const availableSlots: { start: Date; end: Date }[] = []
  let currentTime = new Date(workStart)
  
  // 開始時間を1時間単位に調整（例: 9:30 → 10:00）
  if (currentTime.getMinutes() > 0) {
    currentTime.setHours(currentTime.getHours() + 1)
    currentTime.setMinutes(0, 0, 0)
  }

  while (currentTime < workEnd) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000)
    
    // 予約終了時刻が稼働終了時間を超える場合はスキップ
    if (slotEnd > workEnd) break
    
    // 予約開始時刻が稼働終了時間以降の場合もスキップ
    if (currentTime >= workEnd) break

    // この時間帯が予約済みかチェック
    const isBooked = busySlots.some(busy => {
      return (
        (currentTime >= busy.start && currentTime < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end) ||
        (currentTime <= busy.start && slotEnd >= busy.end)
      )
    })

    if (!isBooked) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd),
      })
    }

    // 次のスロットへ（1時間間隔で固定）
    currentTime = new Date(currentTime.getTime() + 60 * 60000)
  }

  return availableSlots
}

/**
 * Googleカレンダーにイベントを作成
 */
export async function createCalendarEvent(
  userId: string,
  booking: {
    guestName: string
    guestEmail: string
    startTime: Date
    endTime: Date
    meetingType: string
    meetingUrl?: string
    location?: string
    notes?: string
  }
) {
  const calendar = await getGoogleCalendarClient(userId)

  const event = {
    summary: `面談: ${booking.guestName}`,
    description: booking.notes || '',
    start: {
      dateTime: booking.startTime.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: booking.endTime.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    attendees: [
      { email: booking.guestEmail },
    ],
    ...(booking.meetingType === 'ONLINE' && booking.meetingUrl
      ? {
          conferenceData: {
            createRequest: {
              requestId: `booking-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }
      : {}),
    ...(booking.location ? { location: booking.location } : {}),
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: booking.meetingType === 'ONLINE' ? 1 : 0,
    sendUpdates: 'all', // 参加者に通知を送信
  })

  return {
    eventId: response.data.id,
    meetingUrl: response.data.hangoutLink || booking.meetingUrl,
  }
}

/**
 * Googleカレンダーのイベントを更新
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  updates: {
    startTime?: Date
    endTime?: Date
    notes?: string
  }
) {
  const calendar = await getGoogleCalendarClient(userId)

  const event: any = {}
  
  if (updates.startTime) {
    event.start = {
      dateTime: updates.startTime.toISOString(),
      timeZone: 'Asia/Tokyo',
    }
  }
  
  if (updates.endTime) {
    event.end = {
      dateTime: updates.endTime.toISOString(),
      timeZone: 'Asia/Tokyo',
    }
  }
  
  if (updates.notes) {
    event.description = updates.notes
  }

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event,
    sendUpdates: 'all',
  })
}

/**
 * Googleカレンダーのイベントを削除
 */
export async function deleteCalendarEvent(userId: string, eventId: string) {
  const calendar = await getGoogleCalendarClient(userId)

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  })
}