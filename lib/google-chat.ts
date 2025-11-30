/**
 * Googleチャットにカード形式のメッセージを送信（Webhook版）
 */
export async function sendGoogleChatNotification(
  webhookUrl: string | null | undefined,
  message: {
    title: string
    subtitle?: string
    sections: {
      header?: string
      widgets: {
        textParagraph?: {
          text: string
        }
        keyValue?: {
          topLabel: string
          content: string
          contentMultiline?: boolean
          button?: {
            textButton: {
              text: string
              onClick: {
                openLink: {
                  url: string
                }
              }
            }
          }
        }
      }[]
    }[]
  }
) {
  if (!webhookUrl) {
    console.warn('Google Chat webhook URL not configured')
    return
  }

  try {
    // Webhook用のカード形式に変換
    const cards = [
      {
        header: {
          title: message.title,
          subtitle: message.subtitle || '',
        },
        sections: message.sections.map(section => ({
          ...(section.header && { header: section.header }),
          widgets: section.widgets.map(widget => {
            if (widget.keyValue) {
              const keyValueWidget: any = {
                keyValue: {
                  topLabel: widget.keyValue.topLabel,
                  content: widget.keyValue.content,
                  contentMultiline: widget.keyValue.contentMultiline || false,
                }
              }
              
              if (widget.keyValue.button) {
                keyValueWidget.keyValue.button = {
                  textButton: {
                    text: widget.keyValue.button.textButton.text,
                    onClick: {
                      openLink: {
                        url: widget.keyValue.button.textButton.onClick.openLink.url,
                      },
                    },
                  },
                }
              }

              return keyValueWidget
            }
            
            if (widget.textParagraph) {
              return {
                textParagraph: {
                  text: widget.textParagraph.text,
                },
              }
            }

            return {}
          }),
        })),
      },
    ]

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ cards }),
    })

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`)
    }

    console.log('Google Chat notification sent successfully')
  } catch (error) {
    console.error('Error sending Google Chat notification:', error)
    // エラーが発生しても処理は継続（通知はベストエフォート）
  }
}

/**
 * 予約作成通知をGoogleチャットに送信
 */
export async function sendBookingCreatedChatNotification(
  webhookUrl: string | null | undefined,
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
  user: {
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

  const endTimeFormatted = booking.endTime.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })

  const meetingDetails = booking.meetingType === 'ONLINE'
    ? `オンライン（Google Meet）`
    : `対面: ${booking.location || '場所未設定'}`

  await sendGoogleChatNotification(webhookUrl, {
    title: '新規予約が入りました',
    subtitle: bookingLink.title,
    sections: [
      {
        widgets: [
          {
            keyValue: {
              topLabel: '予約者',
              content: booking.guestName,
            },
          },
          {
            keyValue: {
              topLabel: 'メールアドレス',
              content: booking.guestEmail,
            },
          },
          {
            keyValue: {
              topLabel: '電話番号',
              content: booking.guestPhone,
            },
          },
          {
            keyValue: {
              topLabel: '日時',
              content: `${startTimeFormatted} - ${endTimeFormatted}`,
            },
          },
          {
            keyValue: {
              topLabel: '担当者',
              content: user.name,
            },
          },
          {
            keyValue: {
              topLabel: '形式',
              content: meetingDetails,
            },
          },
          ...(booking.meetingUrl
            ? [
                {
                  keyValue: {
                    topLabel: 'ミーティングURL',
                    content: booking.meetingUrl,
                    button: {
                      textButton: {
                        text: '参加する',
                        onClick: {
                          openLink: {
                            url: booking.meetingUrl,
                          },
                        },
                      },
                    },
                  },
                },
              ]
            : []),
          {
            keyValue: {
              topLabel: '詳細',
              content: `${process.env.APP_URL}/admin/bookings/${booking.id}`,
              button: {
                textButton: {
                  text: '予約を確認',
                  onClick: {
                    openLink: {
                      url: `${process.env.APP_URL}/admin/bookings/${booking.id}`,
                    },
                  },
                },
              },
            },
          },
        ],
      },
    ],
  })
}

/**
 * キャンセル通知をGoogleチャットに送信
 */
export async function sendBookingCancelledChatNotification(
  webhookUrl: string | null | undefined,
  booking: {
    id: string
    guestName: string
    startTime: Date
    cancelReason?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
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

  await sendGoogleChatNotification(webhookUrl, {
    title: '予約がキャンセルされました',
    subtitle: bookingLink.title,
    sections: [
      {
        widgets: [
          {
            keyValue: {
              topLabel: '予約者',
              content: booking.guestName,
            },
          },
          {
            keyValue: {
              topLabel: '日時',
              content: startTimeFormatted,
            },
          },
          {
            keyValue: {
              topLabel: '担当者',
              content: user.name,
            },
          },
          ...(booking.cancelReason
            ? [
                {
                  keyValue: {
                    topLabel: 'キャンセル理由',
                    content: booking.cancelReason,
                    contentMultiline: true,
                  },
                },
              ]
            : []),
        ],
      },
    ],
  })
}

/**
 * リマインダー通知をGoogleチャットに送信
 */
export async function sendBookingReminderChatNotification(
  webhookUrl: string | null | undefined,
  booking: {
    id: string
    guestName: string
    startTime: Date
    meetingType: string
    meetingUrl?: string | null
    location?: string | null
  },
  bookingLink: {
    title: string
  },
  user: {
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
    ? `オンライン（Google Meet）`
    : `対面: ${booking.location || '場所未設定'}`

  await sendGoogleChatNotification(webhookUrl, {
    title: '予約リマインダー',
    subtitle: `${bookingLink.title} - まもなく開始`,
    sections: [
      {
        widgets: [
          {
            keyValue: {
              topLabel: '予約者',
              content: booking.guestName,
            },
          },
          {
            keyValue: {
              topLabel: '日時',
              content: startTimeFormatted,
            },
          },
          {
            keyValue: {
              topLabel: '担当者',
              content: user.name,
            },
          },
          {
            keyValue: {
              topLabel: '形式',
              content: meetingDetails,
            },
          },
          ...(booking.meetingUrl
            ? [
                {
                  keyValue: {
                    topLabel: 'ミーティングURL',
                    content: booking.meetingUrl,
                    button: {
                      textButton: {
                        text: '参加する',
                        onClick: {
                          openLink: {
                            url: booking.meetingUrl,
                          },
                        },
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },
    ],
  })
}