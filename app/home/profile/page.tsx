'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type UserProfile = {
  id: string
  name: string
  email: string
  photoUrl: string | null
  title: string | null
  comment: string | null
  phone: string | null
  googleCalendarEmbedUrl: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    comment: '',
    photoUrl: '',
    phone: '',
    googleCalendarEmbedUrl: '',
  })

  // プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
          setFormData({
            name: data.name || '',
            comment: data.comment || '',
            photoUrl: data.photoUrl || '',
            phone: data.phone || '',
            googleCalendarEmbedUrl: data.googleCalendarEmbedUrl || '',
          })
          setPhotoPreview(data.photoUrl)
        } else {
          setError('プロフィールの取得に失敗しました')
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        setError('プロフィールの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('画像サイズは2MB以下にしてください')
      return
    }

    // 画像形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setPhotoPreview(base64String)
      setFormData({ ...formData, photoUrl: base64String })
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setFormData({ ...formData, photoUrl: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('名前を入力してください')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          comment: formData.comment.trim() || null,
          photoUrl: formData.photoUrl || null,
          phone: formData.phone.trim() || null,
          googleCalendarEmbedUrl: formData.googleCalendarEmbedUrl.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error('プロフィールの更新に失敗しました')
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
      setSuccess('プロフィールを更新しました')
      
      // ページ全体をリロードして他のコンポーネントにも反映
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'プロフィールの更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <h1 className="text-2xl font-normal text-gray-900 mb-1">
          プロフィール設定
        </h1>
        <p className="text-gray-500 text-sm">サービス内で表示される情報を設定できます</p>
      </div>

      <main className="p-8 max-w-2xl mx-auto">
        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
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

        {/* 成功メッセージ */}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{success}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* プロフィール画像 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              プロフィール画像
            </h2>
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="プロフィール画像"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
                    {formData.name.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  JPG、PNG形式の画像をアップロードできます（最大2MB）
                </p>
                <div className="flex gap-3">
                  <label className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                    画像を選択
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                  </label>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isSaving}
                      className="px-4 py-2 border border-red-300 rounded-lg text-sm text-red-700 hover:bg-red-50"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              基本情報
            </h2>
            <div className="space-y-4">
              {/* メールアドレス（読み取り専用） */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  メールアドレスは変更できません
                </p>
              </div>

              {/* 名前 */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="例: 山田 太郎"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  サービス内で表示される名前です
                </p>
              </div>

              {/* 電話番号 */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="例: 090-1234-5678"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  予約が入った際のSMS通知に使用します。国際形式（+81）でも可
                </p>
              </div>

              {/* コメント */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  自己紹介
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows={4}
                  placeholder="例: 営業担当として、お客様のニーズに合わせた最適なソリューションをご提案いたします。"
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  予約ページなどで表示されるプロフィール文です
                </p>
              </div>

              {/* Googleカレンダー公開URL */}
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  Googleカレンダー公開URL
                </label>
                <input
                  type="url"
                  value={formData.googleCalendarEmbedUrl}
                  onChange={(e) => setFormData({ ...formData, googleCalendarEmbedUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="例: https://calendar.google.com/calendar/embed?src=..."
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs text-gray-500">
                  チームメンバーがあなたのカレンダーを確認できるようになります。
                  Googleカレンダーの「設定と共有」→「カレンダーの統合」→「このカレンダーの公開URL」からURLを取得してください。
                </p>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              戻る
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </>
              ) : (
                '変更を保存'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}