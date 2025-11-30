import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 認証が必要なパスの場合、トークンの有無をチェック
        if (req.nextUrl.pathname.startsWith('/home')) {
          return !!token
        }
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token
        }
        if (req.nextUrl.pathname.startsWith('/auth/register')) {
          return !!token
        }
        return true
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
)

// 認証が必要なパス
export const config = {
  matcher: [
    '/home/:path*',
    '/admin/:path*',
    '/auth/register/:path*',
  ],
}