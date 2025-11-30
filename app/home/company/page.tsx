'use client'

import { useEffect, useState } from 'react'

export default function CompanyPage() {
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invitations, setInvitations] = useState<any[]>([])
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([])
  const [savingSocialLinks, setSavingSocialLinks] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchCompany()
    fetchInvitations()
  }, [])

  const fetchCompany = async () => {
    try {
      const response = await fetch('/api/company')
      if (response.ok) {
        const data = await response.json()
        setCompany(data.company)
        setIsAdmin(data.isAdmin || false)
        setWebhookUrl(data.company?.googleChatWebhookUrl || '')
        // SNSリンクを設定
        if (data.company?.socialLinks) {
          setSocialLinks(data.company.socialLinks.map((link: any) => ({
            platform: link.platform,
            url: link.url
          })))
        }
      }
    } catch (error) {
      console.error('Failed to fetch company:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/company/invitations')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations)
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)

    try {
      const response = await fetch('/api/company/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail }),
      })

      if (response.ok) {
        alert('招待を送信しました')
        setInviteEmail('')
        fetchInvitations()
      } else {
        const data = await response.json()
        alert(data.error || '招待の送信に失敗しました')
      }
    } catch (error) {
      console.error('Failed to send invitation:', error)
      alert('招待の送信に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('この招待を削除しますか?')) return

    setDeletingInvitationId(invitationId)
    try {
      const response = await fetch(`/api/company/invitations?id=${invitationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('招待を削除しました')
        fetchInvitations()
      } else {
        const data = await response.json()
        alert(data.error || '招待の削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete invitation:', error)
      alert('招待の削除に失敗しました')
    } finally {
      setDeletingInvitationId(null)
    }
  }

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingWebhook(true)

    try {
      const response = await fetch('/api/company', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ googleChatWebhookUrl: webhookUrl }),
      })

      if (response.ok) {
        alert('Google Chat Webhook URLを保存しました')
        fetchCompany()
      } else {
        const data = await response.json()
        alert(data.error || '保存に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save webhook URL:', error)
      alert('保存に失敗しました')
    } finally {
      setSavingWebhook(false)
    }
  }

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: 'X', url: '' }])
  }

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index))
  }

  const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialLinks]
    updated[index][field] = value
    setSocialLinks(updated)
  }

  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSocialLinks(true)

    try {
      // 空のURLを除外
      const validLinks = socialLinks.filter(link => link.url.trim() !== '')

      const response = await fetch('/api/company', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ socialLinks: validLinks }),
      })

      if (response.ok) {
        alert('SNSリンクを保存しました')
        fetchCompany()
      } else {
        const data = await response.json()
        alert(data.error || '保存に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save social links:', error)
      alert('保存に失敗しました')
    } finally {
      setSavingSocialLinks(false)
    }
  }

  const socialPlatforms = [
    { value: 'X', label: 'X (Twitter)' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'TIKTOK', label: 'TikTok' },
    { value: 'YOUTUBE', label: 'YouTube' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'LINE', label: 'LINE' },
    { value: 'WEBSITE', label: 'ウェブサイト' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen">
        <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
          <h1 className="text-2xl font-normal text-gray-900 mb-1">
            会社設定
          </h1>
          <p className="text-gray-500 text-sm">会社情報と社員の管理</p>
        </div>

        <main className="p-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-600 text-sm mb-4">会社に所属していません</p>
            <p className="text-gray-500 text-xs">会社の管理者から招待を受けてください</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <h1 className="text-2xl font-normal text-gray-900 mb-1">
          会社設定
        </h1>
        <p className="text-gray-500 text-sm">会社情報と社員の管理</p>
      </div>

      <main className="p-8 max-w-4xl mx-auto space-y-6">
        {/* 会社情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-normal text-gray-900 mb-4">
            会社情報
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">会社名</label>
              <p className="text-sm text-gray-900">{company.name}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">社員数</label>
              <p className="text-sm text-gray-900">{company.users?.length || 0}名</p>
            </div>
          </div>
        </div>

        {/* Google Chat Webhook設定 - 管理者のみ編集可能 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-normal text-gray-900">
              Google Chat通知設定
            </h2>
            {!isAdmin && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">閲覧のみ</span>
            )}
          </div>
          <form onSubmit={handleSaveWebhook} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={!isAdmin}
              />
              <p className="text-xs text-gray-500 mt-2">
                Google Chatスペースの設定からWebhook URLを取得して設定してください
              </p>
            </div>
            {isAdmin && (
              <button
                type="submit"
                disabled={savingWebhook}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {savingWebhook ? '保存中...' : '保存'}
              </button>
            )}
          </form>
        </div>

        {/* SNSリンク設定 - 管理者のみ編集可能 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-normal text-gray-900">
              SNSリンク設定
            </h2>
            {!isAdmin && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">閲覧のみ</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            予約ページのフッターに表示する会社のSNSアカウントを設定できます
          </p>
          {isAdmin ? (
            <form onSubmit={handleSaveSocialLinks} className="space-y-4">
              {socialLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={link.platform}
                    onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {socialPlatforms.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSocialLink(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  + SNSリンクを追加
                </button>
                <button
                  type="submit"
                  disabled={savingSocialLinks}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  {savingSocialLinks ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {socialLinks.length > 0 ? (
                socialLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 w-32">
                      {socialPlatforms.find(p => p.value === link.platform)?.label || link.platform}
                    </span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {link.url}
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">SNSリンクが設定されていません</p>
              )}
            </div>
          )}
        </div>

        {/* 社員招待 - 管理者のみ */}
        {isAdmin && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              社員を招待
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {inviting ? '送信中...' : '招待を送信'}
              </button>
            </form>
          </div>
        )}

        {/* 招待一覧 - 管理者のみ */}
        {isAdmin && invitations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-normal text-gray-900">
                招待中
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900">{invitation.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      招待者: {invitation.inviter.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      invitation.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                      invitation.status === 'ACCEPTED' ? 'bg-green-50 text-green-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {invitation.status === 'PENDING' ? '保留中' :
                       invitation.status === 'ACCEPTED' ? '承認済み' : '期限切れ'}
                    </span>
                    {invitation.status === 'PENDING' && (
                      <button
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        disabled={deletingInvitationId === invitation.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="招待を削除"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 社員一覧 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-normal text-gray-900">
              社員一覧
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {company.users?.map((user: any) => (
              <div key={user.id} className="p-6 flex items-center gap-4">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900">{user.name}</p>
                    {user.isCompanyAdmin && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        管理者
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                  {user.title && (
                    <p className="text-xs text-gray-500">{user.title}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}