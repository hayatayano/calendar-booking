'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type CompanyMember = {
  id: string
  name: string
  email: string
  photoUrl: string | null
  title: string | null
  isCompanyAdmin: boolean
}

type RequiredMember = {
  userId: string
  name: string
  email: string
  photoUrl: string | null
  role: 'OWNER' | 'VIEWER'
}

export default function EditBookingLinkPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([])
  const [requiredMembers, setRequiredMembers] = useState<RequiredMember[]>([])
  const [bookingCondition, setBookingCondition] = useState<'ALL' | 'ANY'>('ALL')
  const [roundRobinEnabled, setRoundRobinEnabled] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    duration: 30,
    meetingType: 'BOTH' as 'ONLINE' | 'OFFLINE' | 'BOTH',
    advanceNotice: 60,
    formTitle: '',
    notificationMethod: 'BOTH',
  })

  // 受付期限の数値と単位を管理
  const [deadlineValue, setDeadlineValue] = useState(59)
  const [deadlineUnit, setDeadlineUnit] = useState<'minutes' | 'days'>('minutes')

  // 受付期限の変更時にformDataを更新（分単位に変換）
  const handleDeadlineChange = (value: number, unit: 'minutes' | 'days') => {
    setDeadlineValue(value)
    setDeadlineUnit(unit)
    const minutes = unit === 'days' ? value * 1440 : value
    setFormData({ ...formData, advanceNotice: minutes })
  }

  const [formFields, setFormFields] = useState<Array<{
    label: string
    fieldType: string
    required: boolean
    options?: string
  }>>([])

  const [newField, setNewField] = useState({
    label: '',
    fieldType: 'TEXT',
    required: false,
    options: '',
  })

  useEffect(() => {
    fetchBookingLink()
    fetchMembers()
  }, [id])

  const fetchBookingLink = async () => {
    try {
      console.log('Fetching booking link with ID:', id)
      const response = await fetch(`/api/booking-links/${id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched booking link data:', data)
        console.log('formFields from API:', data.formFields)
        console.log('formFields length:', data.formFields ? data.formFields.length : 0)
        console.log('members from API:', data.members)
        
        // 受付期限を日数または分に変換
        const advanceMinutes = data.advanceNotice || 60
        if (advanceMinutes >= 1440 && advanceMinutes % 1440 === 0) {
          setDeadlineValue(advanceMinutes / 1440)
          setDeadlineUnit('days')
        } else {
          setDeadlineValue(advanceMinutes)
          setDeadlineUnit('minutes')
        }

        setFormData({
          title: data.title,
          slug: data.slug,
          description: data.description || '',
          duration: data.duration,
          meetingType: data.meetingType,
          advanceNotice: advanceMinutes,
          formTitle: data.formTitle || '',
          notificationMethod: data.notificationMethod || 'BOTH',
        })
        // formFieldsを適切な形式に変換
        const fields = (data.formFields || []).map((field: any) => ({
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          options: Array.isArray(field.options) ? field.options.join(', ') : (field.options || ''),
        }))
        console.log('Converted fields:', fields)
        setFormFields(fields)
        
        // メンバー情報を設定
        if (data.members && data.members.length > 0) {
          const members = data.members.map((m: any) => ({
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            photoUrl: m.user.photoUrl,
            role: m.role,
          }))
          console.log('Converted members:', members)
          setRequiredMembers(members)
        }
        
        // 予約条件を設定
        if (data.bookingCondition) {
          setBookingCondition(data.bookingCondition)
        }
        if (data.roundRobinEnabled !== undefined) {
          setRoundRobinEnabled(data.roundRobinEnabled)
        }
        
        console.log('Set form data:', data.title)
        console.log('formFields state should be:', fields)
      } else {
        console.error('Failed to fetch booking link - response not ok:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch booking link:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/company/members')
      if (response.ok) {
        const data = await response.json()
        setCompanyMembers(data || [])
        
        // 現在のユーザーを取得
        const session = await fetch('/api/auth/session').then(res => res.json())
        if (session?.user?.email) {
          const currentMember = data.find((m: CompanyMember) => m.email === session.user.email)
          if (currentMember) {
            setCurrentUserId(currentMember.id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }

  // 必須メンバーを追加
  const handleAddRequiredMember = (member: CompanyMember) => {
    if (requiredMembers.some(m => m.userId === member.id)) return
    setRequiredMembers([...requiredMembers, {
      userId: member.id,
      name: member.name,
      email: member.email,
      photoUrl: member.photoUrl,
      role: 'VIEWER'
    }])
    setMemberSearchQuery('')
  }

  // 必須メンバーを削除（オーナーは削除不可）
  const handleRemoveRequiredMember = (userId: string) => {
    const member = requiredMembers.find(m => m.userId === userId)
    if (member?.role === 'OWNER') {
      alert('オーナーは削除できません。別のメンバーをオーナーに設定してから削除してください。')
      return
    }
    setRequiredMembers(requiredMembers.filter(m => m.userId !== userId))
  }

  // メンバーのロールを変更（オーナーは一人だけ）
  const handleChangeRole = (userId: string, role: 'OWNER' | 'VIEWER') => {
    if (role === 'OWNER') {
      // 既存のオーナーを閲覧者に変更し、新しいオーナーを設定
      setRequiredMembers(requiredMembers.map(m => {
        if (m.userId === userId) {
          return { ...m, role: 'OWNER' }
        } else if (m.role === 'OWNER') {
          return { ...m, role: 'VIEWER' }
        }
        return m
      }))
    } else {
      // VIEWERに変更（オーナーが他にいる場合のみ）
      const ownerCount = requiredMembers.filter(m => m.role === 'OWNER').length
      if (ownerCount > 1 || requiredMembers.find(m => m.userId === userId)?.role !== 'OWNER') {
        setRequiredMembers(requiredMembers.map(m =>
          m.userId === userId ? { ...m, role } : m
        ))
      } else {
        alert('最低1人のオーナーが必要です')
      }
    }
  }

  const handleAddField = () => {
    if (!newField.label) return
    setFormFields([...formFields, { ...newField }])
    setNewField({ label: '', fieldType: 'TEXT', required: false, options: '' })
  }

  const handleRemoveField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index))
  }

  const updateFormField = (index: number, updates: any) => {
    setFormFields(
      formFields.map((field, i) => (i === index ? { ...field, ...updates } : field))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`/api/booking-links/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          formFields,
          requiredMembers,
          bookingCondition,
          roundRobinEnabled,
        }),
      })

      if (response.ok) {
        alert('予約リンクを更新しました')
        router.push('/home/booking-links')
      } else {
        const data = await response.json()
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update booking link:', error)
      alert('更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

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

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <h1 className="text-2xl font-normal text-gray-900 mb-1">
          予約リンクを編集
        </h1>
        <p className="text-gray-500 text-sm">{formData.title}</p>
      </div>

      <main className="p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              基本情報
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  予約リンクURL
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm whitespace-nowrap">/book/</span>
                  <input
                    type="text"
                    disabled
                    value={formData.slug}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  URLは編集できません
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ミーティング設定 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              ミーティング設定
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  面談の長さ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value={15}>15分</option>
                  <option value={30}>30分</option>
                  <option value={45}>45分</option>
                  <option value={60}>60分</option>
                  <option value={90}>90分</option>
                  <option value={120}>120分</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  面談形式 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.meetingType}
                  onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as 'ONLINE' | 'OFFLINE' | 'BOTH' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="BOTH">オンライン（Google Meet）・対面（選択可）</option>
                  <option value="ONLINE">オンラインのみ（Google Meet）</option>
                  <option value="OFFLINE">対面のみ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-2">
                  受付期限
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={deadlineUnit === 'minutes' ? 1440 : 365}
                    value={deadlineValue}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      handleDeadlineChange(value, deadlineUnit)
                    }}
                    className="w-[140px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <select
                    value={deadlineUnit}
                    onChange={(e) => {
                      const unit = e.target.value as 'minutes' | 'days'
                      handleDeadlineChange(deadlineValue, unit)
                    }}
                    className="w-[160px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="minutes">分</option>
                    <option value="days">日</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  予約開始時刻の何{deadlineUnit === 'minutes' ? '分' : '日'}前まで受け付けるか設定します
                </p>
              </div>
            </div>
          </div>

          {/* 参加メンバー設定 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              参加メンバー
            </h2>
            <div className="space-y-6">
              {/* 必須メンバー */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-700">必須 メンバー</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">必須</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  この予定に一緒に参加するユーザーを選択してください。選択されたユーザーがカレンダー連携している場合、そのユーザーも空いている時間帯を自動で表示します。またこの予約ページの管理権限を設定することが出来ます。
                </p>

                {/* メンバー検索 */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="名前またはメールアドレスで検索"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {memberSearchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {companyMembers
                        .filter(m =>
                          m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                          m.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                        )
                        .filter(m => !requiredMembers.some(rm => rm.userId === m.id))
                        .map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleAddRequiredMember(member)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{member.name}</div>
                              <div className="text-xs text-gray-500">{member.email}</div>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* 追加済みメンバーリスト */}
                {requiredMembers.length > 0 && (
                  <div className="space-y-2">
                    {requiredMembers.map(member => (
                      <div key={member.userId} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.userId, e.target.value as 'OWNER' | 'VIEWER')}
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value="OWNER">オーナー</option>
                          <option value="VIEWER">閲覧者</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequiredMember(member.userId)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 予約を可能にする条件 - 複数メンバー時のみ表示 */}
              {requiredMembers.length > 1 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-700">予約を可能にする条件</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">必須</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    予約可能日程の条件を設定します。
                    <span className="font-medium text-gray-700">「誰か1人が参加」を選択すると、担当者自動割当（ラウンドロビン）方式が自動的に適用されます。</span>
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="bookingCondition"
                        checked={bookingCondition === 'ALL'}
                        onChange={() => {
                          setBookingCondition('ALL')
                          setRoundRobinEnabled(false)
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">全メンバーが参加できる日程</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="bookingCondition"
                        checked={bookingCondition === 'ANY'}
                        onChange={() => {
                          setBookingCondition('ANY')
                          setRoundRobinEnabled(true)
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-700">誰か1人が参加</span>
                        <span className="text-xs text-blue-600 mt-0.5">※ 担当者自動割当（ラウンドロビン）方式を使用</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* カスタムフォーム項目 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-1">
              カスタムフォーム項目
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              予約時にゲストに聞きたい質問を追加できます
            </p>

            {/* 既存フィールド一覧 */}
            {formFields.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-blue-900">✓ 追加済みの質問</span>
                  <span className="text-xs text-blue-700">({formFields.length}件)</span>
                </div>
                <div className="space-y-3">
                  {formFields.map((field, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="ml-3 px-3 py-1 text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新規フィールド追加 */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-semibold text-green-900">+ 新しい質問を追加</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    質問タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ゲストに表示される質問のタイトルです
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required-field"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="required-field" className="text-sm font-medium text-gray-700">
                    この項目を必須にする
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  + この質問を追加
                </button>
              </div>
            </div>
          </div>

          {/* 通知設定 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-normal text-gray-900 mb-4">
              通知設定
            </h2>
            <div>
              <label className="block text-xs text-gray-700 mb-2">
                通知方法
              </label>
              <select
                value={formData.notificationMethod}
                onChange={(e) => setFormData({ ...formData, notificationMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="BOTH">メール・SMS両方</option>
                <option value="EMAIL">メールのみ</option>
                <option value="SMS">SMSのみ</option>
              </select>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? '更新中...' : '予約リンクを更新'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}