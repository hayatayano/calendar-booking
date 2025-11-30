'use client'

import { useState, useEffect } from 'react'

type Member = {
  id: string
  name: string
  email: string
  photoUrl: string | null
  googleCalendarEmbedUrl: string | null
}

export default function CalendarPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [currentUser, setCurrentUser] = useState<Member | null>(null)

  useEffect(() => {
    fetchMembers()
    fetchCurrentUser()
  }, [])

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/company/members')
      if (response.ok) {
        const data = await response.json()
        // カレンダーURLが設定されているメンバーのみフィルタ
        const membersWithCalendar = data.filter((m: Member) => m.googleCalendarEmbedUrl)
        setMembers(membersWithCalendar)
        if (membersWithCalendar.length > 0) {
          setSelectedMember(membersWithCalendar[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data)
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // 自分のカレンダーURLが設定されていない場合の案内
  const hasOwnCalendar = currentUser?.googleCalendarEmbedUrl

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">カレンダー</h1>
        <p className="mt-1 text-sm text-gray-600">
          チームメンバーのGoogleカレンダーを確認できます
        </p>
      </div>

      {/* カレンダーURL未設定の案内 */}
      {!hasOwnCalendar && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                カレンダーの埋め込みURLが設定されていません
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                プロフィール設定からGoogleカレンダーの埋め込みURLを設定すると、他のメンバーがあなたの予定を確認できるようになります。
              </p>
              <a
                href="/home/profile"
                className="mt-2 inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
              >
                プロフィール設定へ
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* メンバーがいない場合 */}
      {members.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">カレンダーが登録されていません</h3>
          <p className="mt-1 text-sm text-gray-500">
            チームメンバーがGoogleカレンダーの埋め込みURLを設定すると、ここに表示されます。
          </p>
        </div>
      ) : (
        <>
          {/* 表示切り替えとメンバー選択 */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            {/* 表示モード切り替え */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAll(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  !showAll
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                個別表示
              </button>
              <button
                onClick={() => setShowAll(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  showAll
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全員表示
              </button>
            </div>

            {/* メンバー選択（個別表示時のみ） */}
            {!showAll && (
              <div className="flex items-center gap-2 flex-wrap">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                      selectedMember?.id === member.id
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium">{member.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* カレンダー表示 */}
          {showAll ? (
            // 全員表示モード
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {members.map((member) => (
                <div key={member.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="aspect-[4/3]">
                    <iframe
                      src={member.googleCalendarEmbedUrl!}
                      className="w-full h-full border-0"
                      title={`${member.name}のカレンダー`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 個別表示モード
            selectedMember && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                  {selectedMember.photoUrl ? (
                    <img
                      src={selectedMember.photoUrl}
                      alt={selectedMember.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {selectedMember.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedMember.name}</h3>
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  </div>
                </div>
                <div style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
                  <iframe
                    src={selectedMember.googleCalendarEmbedUrl!}
                    className="w-full h-full border-0"
                    title={`${selectedMember.name}のカレンダー`}
                  />
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Googleカレンダー公開URLの取得方法 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Googleカレンダーの公開URLの取得方法
        </h3>
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>Googleカレンダーを開き、左側のカレンダーリストで該当のカレンダーの「︙」をクリック</li>
          <li>「設定と共有」を選択</li>
          <li>「カレンダーの統合」セクションまでスクロール</li>
          <li>「このカレンダーの公開URL」のURLをコピー</li>
          <li>
            <span className="text-yellow-600">※</span> カレンダーを公開設定にするか、「特定のユーザーとの共有」で共有設定を行う必要があります
          </li>
        </ol>
      </div>
    </div>
  )
}