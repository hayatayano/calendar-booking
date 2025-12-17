'use client'

import { useState, useEffect, useCallback } from 'react'

type NotificationLog = {
  id: string
  type: string
  category: string
  method: string
  recipient: string
  subject: string | null
  status: string
  errorMessage: string | null
  retryCount: number
  maxRetries: number
  lastAttemptAt: string | null
  sentAt: string | null
  createdAt: string
  booking: {
    id: string
    guestName: string
    guestEmail: string
    startTime: string
    bookingLink: {
      title: string
    }
  } | null
  user: {
    id: string
    name: string
    email: string
  } | null
}

type Stats = {
  total: number
  sent: number
  failed: number
  pending: number
  retrying: number
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, failed: 0, pending: 0, retrying: 0 })
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // フィルター
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [methodFilter, setMethodFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', pagination.limit.toString())
      if (statusFilter) params.set('status', statusFilter)
      if (methodFilter) params.set('method', methodFilter)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/admin/notifications?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setPagination(data.pagination)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter, methodFilter, searchQuery])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleRetry = async (id: string) => {
    setRetryingId(id)
    try {
      const response = await fetch(`/api/admin/notifications/${id}/retry`, {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        // 成功時は一覧を再取得
        await fetchNotifications()
      } else {
        alert(data.error || '再送に失敗しました')
      }
    } catch (error) {
      console.error('Failed to retry notification:', error)
      alert('再送に失敗しました')
    } finally {
      setRetryingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            送信済み
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            失敗
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            保留中
          </span>
        )
      case 'RETRYING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            再送中
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'EMAIL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
            メール
          </span>
        )
      case 'SMS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
            SMS
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700">
            {method}
          </span>
        )
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'BOOKING_CREATED':
        return '予約確認'
      case 'BOOKING_CANCELLED':
        return '予約キャンセル'
      case 'BOOKING_REMINDER':
        return 'リマインダー'
      case 'BOOKING_UPDATED':
        return '予約変更'
      case 'INVITATION':
        return '招待'
      case 'SYSTEM':
        return 'システム'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">通知履歴</h1>
        <p className="mt-1 text-sm text-gray-600">
          メール・SMS送信の履歴を確認し、失敗した通知を再送できます
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">総送信数</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">送信成功</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{stats.sent}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">送信失敗</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">{stats.failed}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">成功率</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">
            {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
            >
              <option value="">すべて</option>
              <option value="SENT">送信済み</option>
              <option value="FAILED">失敗</option>
              <option value="PENDING">保留中</option>
              <option value="RETRYING">再送中</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              送信方法
            </label>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5"
            >
              <option value="">すべて</option>
              <option value="EMAIL">メール</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              送信先で検索
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              placeholder="メールアドレスまたは電話番号"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5 px-3"
            />
          </div>
        </div>
      </div>

      {/* 通知一覧 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">通知履歴がありません</h3>
            <p className="mt-1 text-sm text-gray-500">
              予約が作成されると、通知履歴がここに表示されます
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      送信日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      種別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      送信先
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      関連予約
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(notification.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMethodBadge(notification.method)}
                          <span className="text-sm text-gray-600">
                            {getTypeName(notification.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notification.recipient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.booking ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {notification.booking.guestName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {notification.booking.bookingLink.title}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(notification.status)}
                          {notification.status === 'FAILED' && notification.errorMessage && (
                            <span className="text-xs text-red-600 max-w-xs truncate" title={notification.errorMessage}>
                              {notification.errorMessage}
                            </span>
                          )}
                          {notification.retryCount > 0 && (
                            <span className="text-xs text-gray-500">
                              再送: {notification.retryCount}/{notification.maxRetries}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(notification.status === 'FAILED' || notification.status === 'PENDING') &&
                          notification.retryCount < notification.maxRetries && (
                            <button
                              onClick={() => handleRetry(notification.id)}
                              disabled={retryingId === notification.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryingId === notification.id ? (
                                <>
                                  <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  再送中...
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  再送
                                </>
                              )}
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
