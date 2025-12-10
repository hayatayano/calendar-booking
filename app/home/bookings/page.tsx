'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    startTime: '',
    endTime: '',
    userId: '',
  })
  const [companyMembers, setCompanyMembers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  
  // 手動予約モーダル用のstate
  const [showManualBookingModal, setShowManualBookingModal] = useState(false)
  const [manualBookingForm, setManualBookingForm] = useState({
    startTime: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    meetingType: 'ONLINE' as 'ONLINE' | 'OFFLINE',
    location: '',
    notes: '',
    assignedUserIds: [] as string[],
  })
  const [manualBookingErrors, setManualBookingErrors] = useState<string[]>([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityResults, setAvailabilityResults] = useState<any[]>([])
  const [creatingBooking, setCreatingBooking] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchCompanyMembers()
  }, [filters])

  const fetchCompanyMembers = async () => {
    try {
      const response = await fetch('/api/company/members')
      if (response.ok) {
        const data = await response.json()
        setCompanyMembers(data)
      }
    } catch (error) {
      console.error('Failed to fetch company members:', error)
    }
  }

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/bookings?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('この予約をキャンセルしますか?')) return

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('予約をキャンセルしました')
        fetchBookings()
        setSelectedBooking(null)
      } else {
        alert('キャンセルに失敗しました')
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      alert('キャンセルに失敗しました')
    }
  }

  const handleEditBooking = (booking: any) => {
    setEditForm({
      startTime: format(new Date(booking.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(booking.endTime), "yyyy-MM-dd'T'HH:mm"),
      userId: booking.userId,
    })
    setIsEditing(true)
  }

  const handleSaveBooking = async () => {
    if (!selectedBooking) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: new Date(editForm.startTime).toISOString(),
          endTime: new Date(editForm.endTime).toISOString(),
          userId: editForm.userId,
        }),
      })

      if (response.ok) {
        alert('予約を更新しました。変更内容は予約者にメールで通知されます。')
        fetchBookings()
        setIsEditing(false)
        setSelectedBooking(null)
      } else {
        const error = await response.json()
        alert(`更新に失敗しました: ${error.error || '不明なエラー'}`)
      }
    } catch (error) {
      console.error('Failed to update booking:', error)
      alert('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (selectedBooking) {
      setEditForm({
        startTime: format(new Date(selectedBooking.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(new Date(selectedBooking.endTime), "yyyy-MM-dd'T'HH:mm"),
        userId: selectedBooking.userId,
      })
    }
  }

  const handleExportCSV = () => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    
    window.location.href = `/api/bookings/export?${params.toString()}`
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONFIRMED: { label: '確定', className: 'bg-green-600 text-white' },
      CANCELLED: { label: 'キャンセル', className: 'bg-red-600 text-white' },
      COMPLETED: { label: '完了', className: 'bg-gray-600 text-white' },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${config.className}`}>
        {config.label}
      </span>
    )
  }

  // 手動予約モーダルを開く
  const openManualBookingModal = () => {
    // 現在時刻の1時間後を初期値に
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(0, 0, 0)
    
    setManualBookingForm({
      startTime: format(now, "yyyy-MM-dd'T'HH:mm"),
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      meetingType: 'ONLINE',
      location: '',
      notes: '',
      assignedUserIds: [],
    })
    setManualBookingErrors([])
    setAvailabilityResults([])
    setShowManualBookingModal(true)
  }

  // 空き時間チェック
  const checkAvailability = async () => {
    if (!manualBookingForm.startTime || manualBookingForm.assignedUserIds.length === 0) {
      setManualBookingErrors(['日時と担当者を選択してください'])
      return
    }

    setCheckingAvailability(true)
    setManualBookingErrors([])

    try {
      const startTime = new Date(manualBookingForm.startTime)
      const endTime = new Date(startTime.getTime() + 60 * 60000) // 1時間後

      const response = await fetch('/api/bookings/manual', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          userIds: manualBookingForm.assignedUserIds,
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setAvailabilityResults(data.results)
        if (!data.allAvailable) {
          const unavailable = data.results.filter((r: any) => !r.available)
          setManualBookingErrors(unavailable.map((r: any) => `${r.userName}: ${r.reason}`))
        }
      } else {
        setManualBookingErrors([data.error])
      }
    } catch (error) {
      console.error('Failed to check availability:', error)
      setManualBookingErrors(['空き時間の確認に失敗しました'])
    } finally {
      setCheckingAvailability(false)
    }
  }

  // 手動予約を作成
  const handleCreateManualBooking = async () => {
    // バリデーション
    const errors: string[] = []
    if (!manualBookingForm.startTime) errors.push('日時は必須です')
    if (!manualBookingForm.guestName) errors.push('面談相手の氏名は必須です')
    if (!manualBookingForm.guestEmail) errors.push('メールアドレスは必須です')
    if (!manualBookingForm.meetingType) errors.push('面談形式は必須です')
    if (manualBookingForm.assignedUserIds.length === 0) errors.push('担当者を1人以上選択してください')

    if (errors.length > 0) {
      setManualBookingErrors(errors)
      return
    }

    setCreatingBooking(true)
    setManualBookingErrors([])

    try {
      const startTime = new Date(manualBookingForm.startTime)
      const endTime = new Date(startTime.getTime() + 60 * 60000) // 1時間後

      const response = await fetch('/api/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          guestName: manualBookingForm.guestName,
          guestEmail: manualBookingForm.guestEmail,
          guestPhone: manualBookingForm.guestPhone,
          meetingType: manualBookingForm.meetingType,
          location: manualBookingForm.location,
          notes: manualBookingForm.notes,
          assignedUserIds: manualBookingForm.assignedUserIds,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert('予約を作成しました。担当者とゲストにメールが送信されます。')
        setShowManualBookingModal(false)
        fetchBookings()
      } else {
        if (data.unavailableUsers) {
          setManualBookingErrors([
            data.error,
            ...data.unavailableUsers.map((u: any) => `${u.userName}: ${u.reason}`)
          ])
        } else {
          setManualBookingErrors([data.error || '予約の作成に失敗しました'])
        }
      }
    } catch (error) {
      console.error('Failed to create manual booking:', error)
      setManualBookingErrors(['予約の作成に失敗しました'])
    } finally {
      setCreatingBooking(false)
    }
  }

  // 担当者選択のトグル
  const toggleUserSelection = (userId: string) => {
    setManualBookingForm(prev => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(userId)
        ? prev.assignedUserIds.filter(id => id !== userId)
        : [...prev.assignedUserIds, userId]
    }))
    // 選択が変わったら空き時間結果をリセット
    setAvailabilityResults([])
  }

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-gray-900 mb-1">
              予約一覧
            </h1>
            <p className="text-gray-500 text-sm">すべての予約を管理</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openManualBookingModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              手動で予約を追加
            </button>
            <button
              onClick={handleExportCSV}
              disabled={bookings.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV出力
            </button>
          </div>
        </div>
      </div>

      <main className="p-8 max-w-7xl mx-auto">
        {/* フィルター */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                placeholder="名前、メール、電話番号"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">すべて</option>
                <option value="CONFIRMED">確定</option>
                <option value="CANCELLED">キャンセル</option>
                <option value="COMPLETED">完了</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchBookings}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                検索
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-600 text-sm">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* 予約リスト */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        予約者
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        担当者
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        予約タイプ
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        形式
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-gray-500 text-sm">予約がありません</p>
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(booking.startTime), 'M月d日(EEE) HH:mm', { locale: ja })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {booking.guestName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.guestEmail}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                                {booking.user?.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="text-sm text-gray-900">
                                  {booking.user?.name || '未設定'}
                                </div>
                                {booking.bookingLink?.members && booking.bookingLink.members.length > 1 && (
                                  <div className="text-xs text-gray-500">
                                    他{booking.bookingLink.members.length - 1}名
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {booking.bookingLink.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {booking.meetingType === 'ONLINE' ? 'オンライン' : '対面'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(booking.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              詳細
                            </button>
                            {booking.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                キャンセル
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 予約詳細モーダル */}
      {selectedBooking && (
        <div className="fixed z-[300] inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-black/70 transition-opacity z-[300]"
              onClick={() => setSelectedBooking(null)}
            />

            <div className="relative z-[301] inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200">
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-normal text-gray-900">
                  予約詳細
                </h3>
              </div>
              <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* 日時 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-gray-600">日時</label>
                    {selectedBooking.status === 'CONFIRMED' && !isEditing && (
                      <button
                        onClick={() => handleEditBooking(selectedBooking)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">開始日時</label>
                        <input
                          type="datetime-local"
                          value={editForm.startTime}
                          onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">終了日時</label>
                        <input
                          type="datetime-local"
                          value={editForm.endTime}
                          onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedBooking.startTime), 'yyyy年M月d日(EEE) HH:mm', { locale: ja })} -
                      {format(new Date(selectedBooking.endTime), 'HH:mm', { locale: ja })}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">予約者名</label>
                    <p className="text-sm text-gray-900">{selectedBooking.guestName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">電話番号</label>
                    <p className="text-sm text-gray-900">{selectedBooking.guestPhone}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs text-gray-600 mb-1">メール</label>
                  <p className="text-sm text-gray-900">{selectedBooking.guestEmail}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">予約タイプ</label>
                    <p className="text-sm text-gray-900">{selectedBooking.bookingLink.title}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">形式</label>
                    <p className="text-sm text-gray-900">
                      {selectedBooking.meetingType === 'ONLINE' ? 'オンライン' : '対面'}
                    </p>
                  </div>
                </div>
                {/* 担当者情報 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs text-gray-600">担当者</label>
                    {selectedBooking.status === 'CONFIRMED' && !isEditing && (
                      <button
                        onClick={() => handleEditBooking(selectedBooking)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <select
                      value={editForm.userId}
                      onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {companyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                        {selectedBooking.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedBooking.user?.name || '未設定'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedBooking.user?.email}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* 参加メンバー（複数いる場合） */}
                {selectedBooking.bookingLink?.members && selectedBooking.bookingLink.members.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-2">
                      参加メンバー ({selectedBooking.bookingLink.members.length}名)
                    </label>
                    <div className="space-y-2">
                      {selectedBooking.bookingLink.members.map((member: any) => (
                        <div key={member.user.id} className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            member.user.id === selectedBooking.user?.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {member.user.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">
                              {member.user.name}
                              {member.user.id === selectedBooking.user?.id && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">担当</span>
                              )}
                              {member.role === 'OWNER' && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">オーナー</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{member.user.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedBooking.meetingUrl && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">ミーティングURL</label>
                    <a
                      href={selectedBooking.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 break-all"
                    >
                      {selectedBooking.meetingUrl}
                    </a>
                  </div>
                )}
                {selectedBooking.location && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">場所</label>
                    <p className="text-sm text-gray-900">{selectedBooking.location}</p>
                  </div>
                )}
                {selectedBooking.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-1">メモ</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedBooking.notes}
                    </p>
                  </div>
                )}
                {selectedBooking.formResponses && selectedBooking.formResponses.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-xs text-gray-600 mb-3">
                      フォーム回答
                    </label>
                    <div className="space-y-2">
                      {selectedBooking.formResponses.map((response: any) => (
                        <div key={response.id} className="bg-white p-3 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">
                            {response.formField.label}
                          </p>
                          <p className="text-sm text-gray-900">{response.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs text-gray-600 mb-1">ステータス</label>
                  <div>{getStatusBadge(selectedBooking.status)}</div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveBooking}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {saving ? '保存中...' : '変更を保存'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedBooking(null)
                        setIsEditing(false)
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                    >
                      閉じる
                    </button>
                    {selectedBooking.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() => handleEditBooking(selectedBooking)}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => {
                            handleCancelBooking(selectedBooking.id)
                          }}
                          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                        >
                          キャンセル
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 手動予約モーダル */}
      {showManualBookingModal && (
        <div className="fixed z-[300] inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-black/70 transition-opacity z-[300]"
              onClick={() => setShowManualBookingModal(false)}
            />

            <div className="relative z-[301] inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200">
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-normal text-gray-900">
                  手動で予約を追加
                </h3>
              </div>
              <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* エラー表示 */}
                {manualBookingErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="text-sm text-red-600 space-y-1">
                      {manualBookingErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 日時 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    日時 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={manualBookingForm.startTime}
                    onChange={(e) => {
                      setManualBookingForm({ ...manualBookingForm, startTime: e.target.value })
                      setAvailabilityResults([])
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">※ 予約時間は1時間です</p>
                </div>

                {/* 面談相手の氏名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    面談相手の氏名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualBookingForm.guestName}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, guestName: e.target.value })}
                    placeholder="山田 太郎"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* メールアドレス */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={manualBookingForm.guestEmail}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, guestEmail: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* 電話番号 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={manualBookingForm.guestPhone}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, guestPhone: e.target.value })}
                    placeholder="090-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                {/* 面談形式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    面談形式 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={manualBookingForm.meetingType}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, meetingType: e.target.value as 'ONLINE' | 'OFFLINE' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="ONLINE">オンライン</option>
                    <option value="OFFLINE">対面</option>
                  </select>
                </div>

                {/* 対面の場合の場所 */}
                {manualBookingForm.meetingType === 'OFFLINE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      場所
                    </label>
                    <input
                      type="text"
                      value={manualBookingForm.location}
                      onChange={(e) => setManualBookingForm({ ...manualBookingForm, location: e.target.value })}
                      placeholder="東京都渋谷区..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                )}

                {/* 担当者選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    担当者 <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">（複数選択可）</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                    {companyMembers.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">メンバーを読み込み中...</p>
                    ) : (
                      companyMembers.map((member) => {
                        const isSelected = manualBookingForm.assignedUserIds.includes(member.id)
                        const availability = availabilityResults.find(r => r.userId === member.id)
                        
                        return (
                          <div
                            key={member.id}
                            onClick={() => toggleUserSelection(member.id)}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              isSelected ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                              {member.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                            {availability && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                availability.available
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {availability.available ? '空き' : '予定あり'}
                              </span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    選択中: {manualBookingForm.assignedUserIds.length}名
                  </p>
                </div>

                {/* 空き時間チェックボタン */}
                <div>
                  <button
                    onClick={checkAvailability}
                    disabled={checkingAvailability || !manualBookingForm.startTime || manualBookingForm.assignedUserIds.length === 0}
                    className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white text-sm"
                  >
                    {checkingAvailability ? '確認中...' : '空き時間を確認'}
                  </button>
                  {availabilityResults.length > 0 && availabilityResults.every(r => r.available) && (
                    <p className="text-sm text-green-600 mt-2 text-center">
                      ✓ 全員の予定が空いています
                    </p>
                  )}
                </div>

                {/* メモ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メモ
                  </label>
                  <textarea
                    value={manualBookingForm.notes}
                    onChange={(e) => setManualBookingForm({ ...manualBookingForm, notes: e.target.value })}
                    rows={3}
                    placeholder="面談に関するメモ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={() => setShowManualBookingModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateManualBooking}
                  disabled={creatingBooking}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:bg-gray-400"
                >
                  {creatingBooking ? '作成中...' : '予約を作成'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}