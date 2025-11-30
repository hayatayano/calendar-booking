import { Resend } from 'resend'
import { Twilio } from 'twilio'
import { prisma } from './prisma'
import { NotificationMethod, NotificationType, NotificationStatus } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY)
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * 予約確認メールを送信
 */
export async function sendBookingConfirmationEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    startTime: Date
    endTime: Date
    meetingType: string
    meetingUrl?: string | null
    location?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
    id: string
    name: string
    email: string
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const endTimeFormatted = booking.endTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })

  const meetingDetails = booking.meetingType === 'ONLINE'
    ? `オンライン（Google Meet）\nURL: ${booking.meetingUrl || '後ほど送信されます'}`
    : `対面\n場所: ${booking.location || '調整中'}`

  const emailContent = `
    ${booking.guestName} 様

    ${bookingLink.title}の予約が確定しました。

    【予約内容】
    日時: ${startTimeFormatted} - ${endTimeFormatted}
    担当者: ${user.name}
    ${meetingDetails}

    予約の変更やキャンセルが必要な場合は、以下のリンクからお願いします。
    ${process.env.APP_URL}/booking/${booking.id}

    ご不明な点がございましたら、${user.email} までお問い合わせください。

    よろしくお願いいたします。
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: booking.guestEmail,
      subject: `【確認】${bookingLink.title}の予約が完了しました`,
      text: emailContent,
    })

    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_CREATED',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'SENT',
    })
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_CREATED',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 予約確認SMSを送信
 */
export async function sendBookingConfirmationSMS(
  booking: {
    id: string
    guestName: string
    guestPhone: string
    startTime: Date
  },
  bookingLink: {
    title: string
  },
  userId: string,
  companyName?: string | null
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // 会社名を名義として使用
  const senderName = companyName || process.env.TWILIO_SENDER_NAME || 'newgate'
  
  const message = `【${senderName}】${bookingLink.title}の予約が確定しました。日時: ${startTimeFormatted} 詳細: ${process.env.APP_URL}/booking/${booking.id}`

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: booking.guestPhone,
    })

    await logNotification({
      bookingId: booking.id,
      userId,
      type: 'BOOKING_CREATED',
      method: 'SMS',
      recipient: booking.guestPhone,
      status: 'SENT',
    })
  } catch (error) {
    console.error('Failed to send confirmation SMS:', error)
    await logNotification({
      bookingId: booking.id,
      userId,
      type: 'BOOKING_CREATED',
      method: 'SMS',
      recipient: booking.guestPhone,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 担当者に新規予約SMS通知を送信
 */
export async function sendStaffBookingNotificationSMS(
  booking: {
    id: string
    guestName: string
    guestPhone: string
    startTime: Date
  },
  bookingLink: {
    title: string
  },
  staff: {
    id: string
    phone: string | null
    company?: {
      name: string
    } | null
  }
) {
  // 担当者の電話番号がない場合はスキップ
  if (!staff.phone) {
    console.log('Staff phone number not set, skipping SMS notification')
    return
  }

  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // 会社名を名義として使用
  const senderName = staff.company?.name || process.env.TWILIO_SENDER_NAME || 'newgate'
  
  const message = `【${senderName}】新規予約が入りました。${bookingLink.title} / ${booking.guestName}様 / ${startTimeFormatted} 詳細: ${process.env.APP_URL}/home/bookings`

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: staff.phone,
    })

    await logNotification({
      bookingId: booking.id,
      userId: staff.id,
      type: 'BOOKING_CREATED',
      method: 'SMS',
      recipient: staff.phone,
      status: 'SENT',
    })
    
    console.log('Staff SMS notification sent successfully to:', staff.phone)
  } catch (error) {
    console.error('Failed to send staff SMS notification:', error)
    await logNotification({
      bookingId: booking.id,
      userId: staff.id,
      type: 'BOOKING_CREATED',
      method: 'SMS',
      recipient: staff.phone,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    // 担当者へのSMS送信失敗はエラーを投げずにログのみ
  }
}

/**
 * 担当者に新規予約メール通知を送信
 */
export async function sendStaffBookingNotificationEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    guestPhone: string
    startTime: Date
    endTime: Date
    meetingType: string
    meetingUrl?: string | null
    location?: string | null
    notes?: string | null
  },
  bookingLink: {
    title: string
  },
  staff: {
    id: string
    name: string
    email: string
    company?: {
      name: string
    } | null
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const endTimeFormatted = booking.endTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })

  const meetingDetails = booking.meetingType === 'ONLINE'
    ? `オンライン（Google Meet）\nURL: ${booking.meetingUrl || '後ほど送信されます'}`
    : `対面\n場所: ${booking.location || '調整中'}`

  const companyName = staff.company?.name || ''
  
  const emailContent = `
    ${staff.name} 様

    新しい予約が入りました。

    【予約内容】
    予約タイプ: ${bookingLink.title}
    日時: ${startTimeFormatted} - ${endTimeFormatted}
    ${meetingDetails}
    
    【予約者情報】
    名前: ${booking.guestName}
    メール: ${booking.guestEmail}
    電話番号: ${booking.guestPhone}
    
    ${booking.notes ? `【メモ】\n${booking.notes}` : ''}
    
    詳細: ${process.env.APP_URL}/home/bookings
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: staff.email,
      subject: `【新規予約】${bookingLink.title} - ${booking.guestName}様`,
      text: emailContent,
    })

    await logNotification({
      bookingId: booking.id,
      userId: staff.id,
      type: 'BOOKING_CREATED',
      method: 'EMAIL',
      recipient: staff.email,
      status: 'SENT',
    })
    
    console.log('Staff email notification sent successfully to:', staff.email)
  } catch (error) {
    console.error('Failed to send staff email notification:', error)
    await logNotification({
      bookingId: booking.id,
      userId: staff.id,
      type: 'BOOKING_CREATED',
      method: 'EMAIL',
      recipient: staff.email,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    // 担当者へのメール送信失敗はエラーを投げずにログのみ
  }
}

/**
 * キャンセル通知メールを送信
 */
export async function sendCancellationEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    startTime: Date
    cancelReason?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
    id: string
    name: string
    email: string
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const emailContent = `
    ${booking.guestName} 様

    ${bookingLink.title}の予約がキャンセルされました。

    【キャンセル内容】
    日時: ${startTimeFormatted}
    担当者: ${user.name}
    ${booking.cancelReason ? `理由: ${booking.cancelReason}` : ''}

    再度予約が必要な場合は、お手数ですが改めてご予約ください。

    ご不明な点がございましたら、${user.email} までお問い合わせください。
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: booking.guestEmail,
      subject: `【キャンセル】${bookingLink.title}の予約がキャンセルされました`,
      text: emailContent,
    })

    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_CANCELLED',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'SENT',
    })
  } catch (error) {
    console.error('Failed to send cancellation email:', error)
    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_CANCELLED',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 予約変更通知メールを送信（予約者向け）
 */
export async function sendBookingUpdateEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    startTime: Date
    endTime: Date
    meetingType: string
    meetingUrl?: string | null
    location?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
    id: string
    name: string
    email: string
  },
  changes: {
    dateTimeChanged?: boolean
    assigneeChanged?: boolean
    previousStartTime?: Date
    previousAssigneeName?: string
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const endTimeFormatted = booking.endTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })

  const meetingDetails = booking.meetingType === 'ONLINE'
    ? `オンライン（Google Meet）\nURL: ${booking.meetingUrl || '後ほど送信されます'}`
    : `対面\n場所: ${booking.location || '調整中'}`

  let changeDescription = ''
  if (changes.dateTimeChanged && changes.previousStartTime) {
    const previousTimeFormatted = changes.previousStartTime.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    changeDescription += `日時が変更されました: ${previousTimeFormatted} → ${startTimeFormatted}\n`
  }
  if (changes.assigneeChanged && changes.previousAssigneeName) {
    changeDescription += `担当者が変更されました: ${changes.previousAssigneeName} → ${user.name}\n`
  }

  const emailContent = `
    ${booking.guestName} 様

    ${bookingLink.title}の予約内容が変更されました。

    【変更内容】
    ${changeDescription}
    【予約内容】
    日時: ${startTimeFormatted} - ${endTimeFormatted}
    担当者: ${user.name}
    ${meetingDetails}

    ご不明な点がございましたら、${user.email} までお問い合わせください。

    よろしくお願いいたします。
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: booking.guestEmail,
      subject: `【変更】${bookingLink.title}の予約内容が変更されました`,
      text: emailContent,
    })

    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_UPDATED',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'SENT',
    })
  } catch (error) {
    console.error('Failed to send update email:', error)
    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_UPDATED',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 予約変更通知メールを送信（担当者向け）
 */
export async function sendStaffBookingUpdateEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    guestPhone: string
    startTime: Date
    endTime: Date
    meetingType: string
    meetingUrl?: string | null
    location?: string | null
  },
  bookingLink: {
    title: string
  },
  staff: {
    id: string
    name: string
    email: string
  },
  changes: {
    dateTimeChanged?: boolean
    assigneeChanged?: boolean
    previousStartTime?: Date
    previousAssigneeName?: string
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const endTimeFormatted = booking.endTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })

  const meetingDetails = booking.meetingType === 'ONLINE'
    ? `オンライン（Google Meet）\nURL: ${booking.meetingUrl || '後ほど送信されます'}`
    : `対面\n場所: ${booking.location || '調整中'}`

  let changeDescription = ''
  if (changes.dateTimeChanged && changes.previousStartTime) {
    const previousTimeFormatted = changes.previousStartTime.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    changeDescription += `日時が変更されました: ${previousTimeFormatted} → ${startTimeFormatted}\n`
  }
  if (changes.assigneeChanged && changes.previousAssigneeName) {
    changeDescription += `担当者が変更されました: ${changes.previousAssigneeName} → ${staff.name}\n`
  }

  const emailContent = `
    ${staff.name} 様

    予約内容が変更されました。

    【変更内容】
    ${changeDescription}
    【予約内容】
    予約タイプ: ${bookingLink.title}
    日時: ${startTimeFormatted} - ${endTimeFormatted}
    ${meetingDetails}
    
    【予約者情報】
    名前: ${booking.guestName}
    メール: ${booking.guestEmail}
    電話番号: ${booking.guestPhone}
    
    詳細: ${process.env.APP_URL}/home/bookings
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: staff.email,
      subject: `【予約変更】${bookingLink.title} - ${booking.guestName}様`,
      text: emailContent,
    })

    await logNotification({
      bookingId: booking.id,
      userId: staff.id,
      type: 'BOOKING_UPDATED',
      method: 'EMAIL',
      recipient: staff.email,
      status: 'SENT',
    })
    
    console.log('Staff update email notification sent successfully to:', staff.email)
  } catch (error) {
    console.error('Failed to send staff update email notification:', error)
    await logNotification({
      bookingId: booking.id,
      userId: staff.id,
      type: 'BOOKING_UPDATED',
      method: 'EMAIL',
      recipient: staff.email,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    // 担当者へのメール送信失敗はエラーを投げずにログのみ
  }
}

/**
 * リマインダーメールを送信
 */
export async function sendReminderEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    startTime: Date
    meetingType: string
    meetingUrl?: string | null
    location?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
    id: string
    name: string
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const meetingDetails = booking.meetingType === 'ONLINE'
    ? `オンライン（Google Meet）\nURL: ${booking.meetingUrl}`
    : `対面\n場所: ${booking.location}`

  const emailContent = `
    ${booking.guestName} 様

    ${bookingLink.title}のリマインダーです。

    【予約内容】
    日時: ${startTimeFormatted}
    担当者: ${user.name}
    ${meetingDetails}

    お忘れなきようお願いいたします。
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: booking.guestEmail,
      subject: `【リマインダー】${bookingLink.title}のお知らせ`,
      text: emailContent,
    })

    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_REMINDER',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'SENT',
    })
  } catch (error) {
    console.error('Failed to send reminder email:', error)
    await logNotification({
      bookingId: booking.id,
      userId: user.id,
      type: 'BOOKING_REMINDER',
      method: 'EMAIL',
      recipient: booking.guestEmail,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 社内通知メールを送信
 */
export async function sendInternalNotificationEmail(
  booking: {
    id: string
    guestName: string
    guestEmail: string
    guestPhone: string
    startTime: Date
    endTime: Date
    notes?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
    email: string
  }
) {
  const startTimeFormatted = booking.startTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const endTimeFormatted = booking.endTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })

  const emailContent = `
    新しい予約が入りました。

    【予約内容】
    予約タイプ: ${bookingLink.title}
    日時: ${startTimeFormatted} - ${endTimeFormatted}
    
    【予約者情報】
    名前: ${booking.guestName}
    メール: ${booking.guestEmail}
    電話番号: ${booking.guestPhone}
    
    ${booking.notes ? `【メモ】\n${booking.notes}` : ''}
    
    詳細: ${process.env.APP_URL}/admin/bookings/${booking.id}
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: user.email,
      subject: `【新規予約】${bookingLink.title}`,
      text: emailContent,
    })
  } catch (error) {
    console.error('Failed to send internal notification email:', error)
  }
}

/**
 * 通知を送信（メール・SMS自動判定）
 */
export async function sendNotification(
  bookingId: string,
  notificationMethod: NotificationMethod,
  notificationType: NotificationType
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      bookingLink: true,
      user: {
        include: {
          company: true,
        },
      },
    },
  })

  if (!booking) {
    throw new Error('Booking not found')
  }

  const promises: Promise<void>[] = []

  if (notificationMethod === 'EMAIL' || notificationMethod === 'BOTH') {
    if (notificationType === 'BOOKING_CREATED') {
      promises.push(
        sendBookingConfirmationEmail(booking, booking.bookingLink, booking.user)
      )
      promises.push(
        sendInternalNotificationEmail(booking, booking.bookingLink, booking.user)
      )
    } else if (notificationType === 'BOOKING_CANCELLED') {
      promises.push(
        sendCancellationEmail(booking, booking.bookingLink, booking.user)
      )
    } else if (notificationType === 'BOOKING_REMINDER') {
      promises.push(
        sendReminderEmail(booking, booking.bookingLink, booking.user)
      )
    }
  }

  if (notificationMethod === 'SMS' || notificationMethod === 'BOTH') {
    if (notificationType === 'BOOKING_CREATED') {
      // 会社名を取得してSMS送信に渡す
      const companyName = booking.user.company?.name
      promises.push(
        sendBookingConfirmationSMS(booking, booking.bookingLink, booking.userId, companyName)
      )
    }
  }

  await Promise.allSettled(promises)
}

/**
 * 通知ログを記録
 */
async function logNotification(data: {
  bookingId: string
  userId: string
  type: NotificationType
  method: NotificationMethod
  recipient: string
  status: NotificationStatus
  errorMessage?: string
}) {
  await prisma.notificationLog.create({
    data: {
      ...data,
      sentAt: data.status === 'SENT' ? new Date() : null,
    },
  })
}