'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (token) {
      validateInvitation()
    } else {
      setError('招待トークンが見つかりません')
      setLoading(false)
    }
  }, [token])

  const validateInvitation = async () => {
    try {
      const response = await fetch(`/api/company/invitations/${token}`)
      if (response.ok) {
        const data = await response.json()
        setInvitation(data.invitation)
      } else {
        const data = await response.json()
        setError(data.error || '招待が見つかりません')
      }
    } catch (error) {
      console.error('Failed to validate invitation:', error)
      setError('招待の確認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!token || !invitation) return
    
    setAccepting(true)
    
    // 招待されたメールアドレスでユーザーを作成
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          name: invitation.email.split('@')[0], // メールアドレスから名前を生成
          image: null,
        }),
      })

      if (response.ok || response.status === 409) {
        // ユーザー作成成功、または既に存在する場合
        // 会社に追加
        const acceptResponse = await fetch(`/api/company/invitations/${token}/accept-direct`, {
          method: 'POST',
        })

        if (acceptResponse.ok) {
          alert('招待を受諾しました。ログインしてください。')
          router.push('/auth/signin')
        } else {
          const data = await acceptResponse.json()
          alert(data.error || '招待の受諾に失敗しました')
          setAccepting(false)
        }
      } else {
        const data = await response.json()
        alert(data.error || 'アカウントの作成に失敗しました')
        setAccepting(false)
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      alert('招待の受諾に失敗しました')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">確認中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">招待が無効です</h2>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-2">会社への招待</h2>
            <p className="text-sm text-gray-600">
              以下の会社への参加が承認されています
            </p>
          </div>

          {invitation && (
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">会社名</label>
                    <p className="text-sm font-medium text-gray-900">{invitation.company.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">招待者</label>
                    <p className="text-sm text-gray-900">{invitation.inviter.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">招待されたメールアドレス</label>
                    <p className="text-sm text-gray-900">{invitation.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-800">
                  参加するには、Googleアカウントでログインする必要があります。招待されたメールアドレスと同じGoogleアカウントでログインしてください。
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-normal rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登録中...
              </span>
            ) : (
              '参加する'
            )}
          </button>

          <button
            onClick={() => router.push('/auth/signin')}
            className="w-full mt-3 flex justify-center py-3 px-4 border border-gray-300 text-sm font-normal rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}