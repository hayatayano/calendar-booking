import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, ...context }) {
      if (!user.email) return false

      try {
        // メールアドレスでユーザーを検索（companyIdも含める）
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            photoUrl: true,
            companyId: true,
          }
        })

        // ユーザーが存在しない場合の処理
        if (!dbUser) {
          // 登録モードの場合はユーザーを作成
          // callbackUrlに'register'が含まれている場合は登録フロー
          const callbackUrl = (context as any)?.callbackUrl || ''
          const isRegisterMode = callbackUrl.includes('register') || callbackUrl.includes('mode=register')
          
          if (isRegisterMode) {
            // ユーザーを作成
            dbUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || user.email,
                password: '', // Google OAuthなのでパスワードは不要
                photoUrl: user.image,
              },
              select: {
                id: true,
                email: true,
                name: true,
                password: true,
                photoUrl: true,
                companyId: true,
              }
            })
          } else {
            // ログインモードの場合は未登録ページにリダイレクト
            // ユーザー情報をURLパラメータとして渡す
            const params = new URLSearchParams({
              email: user.email,
              name: user.name || '',
              image: user.image || '',
            })
            return `/auth/unregistered?${params.toString()}`
          }
        }

        // Accountレコードを作成または更新
        if (account && dbUser) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
            create: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          })
        }

        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        return false
      }
    },
    async jwt({ token, account, user }) {
      // 初回ログイン時
      if (account && user?.email) {
        // データベースからユーザーIDを取得
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.userId = dbUser?.id
      }
      return token
    },
    async session({ session, token }) {
      // JWTトークンからセッションに情報をコピー
      if (token) {
        session.accessToken = token.accessToken as string | null
        session.refreshToken = token.refreshToken as string | null
        if (session.user) {
          session.user.id = token.userId as string
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string | null
    refreshToken?: string | null
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}