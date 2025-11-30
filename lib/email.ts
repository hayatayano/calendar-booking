import nodemailer from 'nodemailer'

// メール送信設定
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// 招待メールを送信
export async function sendInvitationEmail(
  recipientEmail: string,
  invitationUrl: string,
  companyName: string,
  inviterName: string
) {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'カレンダー予約システム'}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `${companyName}への招待`,
    html: `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>招待メール</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">カレンダー予約システム</h1>
          <h2 style="color: #1f2937; font-weight: normal;">会社への招待</h2>
        </div>
        
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${inviterName}</strong>さんから、<strong>${companyName}</strong>への招待が届いています。
          </p>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
            以下のボタンをクリックして、会社のメンバーとして参加してください。この招待は7日間有効です。
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${invitationUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
              参加する
            </a>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            ボタンをクリックできない場合は、以下のURLをブラウザにコピー&ペーストしてください：<br>
            <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
          </p>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
            このメールに心当たりがない場合は、無視していただいて構いません。
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af;">
          <p>© ${new Date().getFullYear()} カレンダー予約システム. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
${inviterName}さんから、${companyName}への招待が届いています。

以下のURLをクリックして、会社のメンバーとして参加してください。
この招待は7日間有効です。

${invitationUrl}

このメールに心当たりがない場合は、無視していただいて構いません。

© ${new Date().getFullYear()} カレンダー予約システム
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Invitation email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    throw error
  }
}