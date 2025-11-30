'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function CompanyRegistrationPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 未認証の場合はサインインページへ
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    
    // 既に会社に所属している場合はホームへ
    if (status === 'authenticated' && session?.user?.email) {
      checkUserCompany()
    }
  }, [status, session, router])

  const checkUserCompany = async () => {
    try {
      const response = await fetch('/api/company')
      if (response.ok) {
        const data = await response.json()
        if (data.company) {
          // 既に会社に所属している
          router.push('/home')
        }
      }
    } catch (error) {
      console.error('Failed to check user company:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userName.trim()) {
      setError('名前を入力してください')
      return
    }

    if (!companyName.trim()) {
      setError('会社名を入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // まずユーザー名を更新
      const updateNameResponse = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName.trim(),
        }),
      })

      if (!updateNameResponse.ok) {
        throw new Error('名前の更新に失敗しました')
      }

      // 次に会社を登録
      const response = await fetch('/api/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '会社の登録に失敗しました')
      }

      // 登録成功、ホームページへリダイレクト
      router.push('/home')
    } catch (error) {
      setError(error instanceof Error ? error.message : '会社の登録に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelling(true)
    
    try {
      // ユーザーとアカウント情報を削除するAPIを呼び出し
      const response = await fetch('/api/auth/cancel-registration', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('登録のキャンセルに失敗しました')
      }

      // サインアウトしてサインインページへ
      await signOut({ callbackUrl: '/auth/signin' })
    } catch (error) {
      console.error('Failed to cancel registration:', error)
      setError(error instanceof Error ? error.message : '登録のキャンセルに失敗しました')
      setIsCancelling(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-light text-gray-900">
            会社情報の登録
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ご利用の会社名を入力してください
          </p>
        </div>

        {session?.user && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">{session.user.name}</span> としてログイン中
                </p>
                <p className="text-xs text-blue-600 mt-1">{session.user.email}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">
              お名前 <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="user-name"
                name="user-name"
                type="text"
                autoComplete="name"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="例: 山田 太郎"
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              サービス内で表示される名前です
            </p>
          </div>

          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
              会社名 <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                id="company-name"
                name="company-name"
                type="text"
                autoComplete="organization"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="例: 株式会社NEW GATE"
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              正式な会社名を入力してください
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading || isCancelling || !userName.trim() || !companyName.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登録中...
                </>
              ) : (
                '登録を完了する'
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading || isCancelling}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              {isCancelling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  キャンセル中...
                </>
              ) : (
                '登録をキャンセル'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            登録後、従業員の招待やカレンダー連携が可能になります
          </p>
        </div>
      </div>
    </div>
  )
}