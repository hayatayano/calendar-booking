'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [hasCompany, setHasCompany] = useState<boolean | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    // 認証済みユーザーの会社登録状態をチェック
    if (status === 'authenticated' && session?.user?.email) {
      checkUserCompany()
      fetchUserProfile()
    }
  }, [status, session])

  const checkUserCompany = async () => {
    try {
      const response = await fetch('/api/company')
      if (response.ok) {
        const data = await response.json()
        setHasCompany(!!data.company)
        
        if (data.company) {
          setCompanyName(data.company.name)
        }
        
        // 会社未登録の場合は会社登録ページへリダイレクト
        if (!data.company) {
          router.push('/auth/register/company')
        }
      }
    } catch (error) {
      console.error('Failed to check user company:', error)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserName(data.name)
        setUserPhotoUrl(data.photoUrl)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const navigation = [
    {
      name: 'ホーム',
      href: '/home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: '予約一覧',
      href: '/home/bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: '予約リンク',
      href: '/home/booking-links',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      name: 'スケジュール',
      href: '/home/schedule',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      name: 'カレンダー',
      href: '/home/calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'プロフィール',
      href: '/home/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      name: '会社設定',
      href: '/home/company',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      {/* サイドバー */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
        {/* ロゴ */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-base font-semibold text-gray-900">
            カレンダー予約システム
          </h1>
        </div>

        {/* ナビゲーション */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                  ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <div className="pl-64">
        {/* ヘッダー */}
        <header className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 z-[200]">
          <div className="h-full flex items-center px-6">
            {/* 会社名表示 - 左側 */}
            <div className="flex items-center flex-shrink-0">
              {companyName && (
                <span className="text-sm text-gray-600">{companyName}</span>
              )}
            </div>
            
            {/* スペーサー */}
            <div className="flex-1" />
            
            {/* ユーザー情報 - 右上に配置 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {userPhotoUrl || session?.user?.image ? (
                <img
                  className="h-8 w-8 rounded-full flex-shrink-0 object-cover border border-gray-200"
                  src={userPhotoUrl || session?.user?.image || ''}
                  alt={userName || session?.user?.name || 'User'}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                  {(userName || session?.user?.name)?.charAt(0) || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {userName || session?.user?.name || 'ユーザー'}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                title="ログアウト"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* コンテンツ */}
        <div className="pt-16">
          {children}
        </div>
      </div>
    </div>
  )
}