'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isAfter, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function BookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [bookingLink, setBookingLink] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    meetingType: '',
    location: '',
  })
  const [formResponses, setFormResponses] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchBookingLink()
  }, [slug])

  useEffect(() => {
    if (bookingLink) {
      fetchAvailableSlots()
    }
  }, [selectedDate, bookingLink])

  const fetchBookingLink = async () => {
    try {
      const response = await fetch(`/api/public/booking-links/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setBookingLink(data)
        if (data.meetingType !== 'BOTH') {
          setFormData(prev => ({ ...prev, meetingType: data.meetingType }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch booking link:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(
        `/api/public/booking-links/${slug}/available-slots?date=${dateStr}`
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots)
      }
    } catch (error) {
      console.error('Failed to fetch available slots:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const responses = Object.entries(formResponses).map(([formFieldId, value]) => ({
        formFieldId,
        value,
      }))

      const response = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingLinkSlug: slug,
          ...formData,
          startTime: selectedSlot.start,
          formResponses: responses.length > 0 ? responses : undefined,
        }),
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        alert('予約に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('Failed to create booking:', error)
      alert('予約に失敗しました。もう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-sm">予約リンクが見つかりませんでした。</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-8 text-center">
            <div className="inline-block p-4 bg-blue-600 rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-normal text-gray-900 mb-4">
              予約が完了しました
            </h2>
            <div className="space-y-2 mb-6">
              <p className="text-gray-700 text-sm">
                確認メールを送信しました。
              </p>
              <p className="text-gray-600 text-sm">
                ご予約ありがとうございました。
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                メールが届かない場合は迷惑メールフォルダをご確認ください
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 表示するユーザー（ラウンドロビンの場合は次の担当者、それ以外は予約リンクのオーナー）
  // スロット選択時はそのスロットの担当者を優先
  const displayUser = selectedSlot?.assignedUser || bookingLink.nextAssignedUser || bookingLink.user
  
  // ラウンドロビン方式かつ担当者が決まっている場合
  const isRoundRobinWithAssignee = bookingLink.roundRobinEnabled && (selectedSlot?.assignedUser || bookingLink.nextAssignedUser)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            {displayUser.photoUrl && (
              <img
                src={displayUser.photoUrl}
                alt={displayUser.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-normal text-gray-900 mb-2">
                {bookingLink.title}
              </h1>
              <p className="text-base text-gray-700 mb-1">
                {displayUser.name}
                {isRoundRobinWithAssignee && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">担当者</span>
                )}
              </p>
              {displayUser.comment && (
                <p className="text-gray-600 text-sm mb-4">{displayUser.comment}</p>
              )}
              {bookingLink.description && (
                <p className="mt-3 text-gray-700 text-sm p-4 bg-gray-50 rounded-lg">{bookingLink.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-gray-600">所要時間:</span>
                  <span className="text-sm text-gray-900">{bookingLink.duration}分</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-xs text-blue-600">形式:</span>
                  <span className="text-sm text-blue-900 font-medium">
                    {bookingLink.meetingType === 'BOTH'
                      ? 'オンライン・対面から選択可'
                      : bookingLink.meetingType === 'ONLINE'
                      ? 'オンライン'
                      : '対面'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SNSリンク */}
          {bookingLink.socialLinks && bookingLink.socialLinks.length > 0 && (
            <div className="mt-6 flex gap-3 pt-6 border-t border-gray-200">
              {bookingLink.socialLinks.map((link: any) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  {link.platform}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 予約フォーム */}
        {!selectedSlot ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* 左カラム: カレンダー */}
              <div className="p-8 border-r border-gray-200">
                <h2 className="text-xl font-normal text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  日付を選択
                </h2>
                
                {/* 月表示 */}
                <div className="mb-4 text-center">
                  <div className="text-lg font-normal text-gray-900">
                    {format(selectedDate, 'yyyy年M月', { locale: ja })}
                  </div>
                </div>

                {/* カレンダーグリッド */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                    <div key={day} className="text-center text-xs font-normal text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {(() => {
                    const days = eachDayOfInterval({
                      start: startOfMonth(selectedDate),
                      end: endOfMonth(selectedDate)
                    })
                    const firstDayOfWeek = days[0].getDay()
                    const emptyDays = Array.from({ length: firstDayOfWeek })
                    
                    return [
                      ...emptyDays.map((_, idx) => (
                        <div key={`empty-${idx}`} />
                      )),
                      ...days.map((date) => {
                        const isSelected = isSameDay(date, selectedDate)
                        const isToday = isSameDay(date, new Date())
                        const isPast = !isAfter(startOfDay(date), startOfDay(new Date())) && !isToday
                        const isCurrentMonth = isSameMonth(date, selectedDate)
                        
                        return (
                          <button
                            key={date.toString()}
                            onClick={() => !isPast && setSelectedDate(date)}
                            disabled={isPast}
                            className={`
                              aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                              ${isSelected
                                ? 'bg-blue-600 text-white'
                                : isPast
                                ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                : isCurrentMonth
                                ? 'text-gray-900 hover:bg-gray-100'
                                : 'text-gray-400 bg-gray-50'
                              }
                              ${isToday && !isSelected ? 'border-2 border-blue-600' : ''}
                            `}
                          >
                            {format(date, 'd')}
                          </button>
                        )
                      })
                    ]
                  })()}
                </div>

                {/* 月移動ボタン */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedDate(addDays(selectedDate, -30))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    ← 前月
                  </button>
                  <button
                    onClick={() => setSelectedDate(addDays(selectedDate, 30))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    翌月 →
                  </button>
                </div>
              </div>

              {/* 右カラム: 時間選択 */}
              <div className="p-8 bg-gray-50">
                <h2 className="text-xl font-normal text-gray-900 mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {format(selectedDate, 'M月d日(EEE)', { locale: ja })}
                </h2>
                
                {availableSlots.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm">この日は予約可能な時間がありません</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedSlot(slot)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-left text-gray-900"
                      >
                        {format(new Date(slot.start), 'HH:mm', { locale: ja })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-normal text-gray-900">
                  予約情報を入力
                </h2>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← 日時を変更
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">選択した日時</p>
                <p className="text-base text-gray-900">
                  {format(new Date(selectedSlot.start), 'yyyy年M月d日(EEE) HH:mm', { locale: ja })} -
                  {format(new Date(selectedSlot.end), 'HH:mm', { locale: ja })}
                </p>
              </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 氏名 */}
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.guestName}
                  onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.guestEmail}
                  onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 電話番号 */}
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 面談形式 */}
              {bookingLink.meetingType === 'BOTH' ? (
                <div>
                  <label className="block text-sm font-normal text-gray-700 mb-2">
                    面談形式 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.meetingType}
                    onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">選択してください</option>
                    <option value="ONLINE">オンライン</option>
                    <option value="OFFLINE">対面</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-normal text-gray-700 mb-2">
                    面談形式
                  </label>
                  <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                    {bookingLink.meetingType === 'ONLINE' ? 'オンライン' : '対面'}
                  </div>
                </div>
              )}

              {/* 対面の場合は場所 */}
              {formData.meetingType === 'OFFLINE' && (
                <div>
                  <label className="block text-sm font-normal text-gray-700 mb-2">
                    場所
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* カスタムフォームフィールド */}
              {bookingLink.formFields && bookingLink.formFields.map((field: any) => (
                <div key={field.id}>
                  <label className="block text-sm font-normal text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.fieldType === 'TEXTAREA' ? (
                    <textarea
                      required={field.required}
                      value={formResponses[field.id] || ''}
                      onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                    />
                  ) : field.fieldType === 'SELECT' ? (
                    <select
                      required={field.required}
                      value={formResponses[field.id] || ''}
                      onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {field.options.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.fieldType.toLowerCase()}
                      required={field.required}
                      value={formResponses[field.id] || ''}
                      onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              ))}

              {/* カスタムメッセージ */}
              {bookingLink.customMessage && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700">{bookingLink.customMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? '予約中...' : '予約を確定する'}
              </button>
            </form>
            </div>
          </div>
        )}

        {/* フッター - SNS連携ボタン（会社のSNSリンクを表示） */}
        {bookingLink.user?.company?.socialLinks && bookingLink.user.company.socialLinks.length > 0 && (
          <footer className="mt-8 py-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">SNSでフォローする</p>
              <div className="flex justify-center gap-3">
                {bookingLink.user.company.socialLinks.map((link: any) => {
                  // SNSプラットフォームに応じたアイコンを表示
                  const getIcon = (platform: string) => {
                    const platformLower = platform.toLowerCase()
                    if (platformLower.includes('twitter') || platformLower.includes('x')) {
                      return (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      )
                    }
                    if (platformLower.includes('instagram')) {
                      return (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      )
                    }
                    if (platformLower.includes('facebook')) {
                      return (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )
                    }
                    if (platformLower.includes('linkedin')) {
                      return (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      )
                    }
                    if (platformLower.includes('youtube')) {
                      return (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      )
                    }
                    if (platformLower.includes('tiktok')) {
                      return (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      )
                    }
                    // デフォルトアイコン（リンク）
                    return (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )
                  }

                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                      title={link.platform}
                    >
                      {getIcon(link.platform)}
                    </a>
                  )
                })}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}