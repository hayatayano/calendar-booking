'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

// useSearchParamsを使用するコンポーネントを分離
function UnregisteredContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRegistering, setIsRegistering] = useState(false)

  // URLパラメータからユーザー情報を取得
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const image = searchParams.get('image')

  const handleRegister = async () => {
    if (!email) {
      // URLパラメータがない場合は通常のOAuthフローを実行
      signIn('google', {
        callbackUrl: '/auth/register/company?mode=register',
        redirect: true,
      })
      return
    }

    // URLパラメータからユーザー情報を取得して登録
    setIsRegistering(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          image,
        }),
      })

      if (response.ok) {
        // ユーザー作成成功 - 会社登録ページへ直接遷移（再度Google認証は不要）
        router.push('/auth/register/company?mode=register')
      } else {
        const data = await response.json()
        if (data.error === 'User already exists') {
          // 既にユーザーが存在する場合も会社登録ページへ直接遷移
          router.push('/auth/register/company?mode=register')
        } else {
          console.error('Registration failed:', data.error)
          alert('登録に失敗しました。もう一度お試しください。')
          setIsRegistering(false)
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('登録に失敗しました。もう一度お試しください。')
      setIsRegistering(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-light text-gray-900">
            このアカウントはまだ登録されていません
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            以下のいずれかの方法でアクセスできます
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* 招待メール受け取りオプション */}
          <div className="rounded-lg border-2 border-gray-200 bg-white p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  管理者から招待メールを受け取る
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  所属する会社の管理者に招待メールの送信を依頼してください。招待リンクからアクセスすることで、会社のメンバーとして登録されます。
                </p>
              </div>
            </div>
          </div>

          {/* アカウント登録オプション */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  アカウント登録
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  新しい会社として登録する場合は、こちらから会社情報を入力してアカウントを作成できます。
                </p>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-normal rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegistering ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登録中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  アカウント作成
                </span>
              )}
            </button>

            <button
              onClick={() => router.push('/auth/signin')}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-normal rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// メインページコンポーネント - Suspenseでラップ
export default function UnregisteredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">読み込み中...</p>
        </div>
      </div>
    }>
      <UnregisteredContent />
    </Suspense>
  )
}