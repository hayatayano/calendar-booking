'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
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

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 text-sm">データの取得に失敗しました</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <h1 className="text-2xl font-normal text-gray-900 mb-1">
          ホーム
        </h1>
        <p className="text-gray-500 text-sm">システムの概要と最新の予約状況</p>
      </div>

      <main className="p-8 max-w-7xl mx-auto">
        {/* サマリーカード */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  今月の予約
                </div>
                <div className="text-3xl font-light text-gray-900 mb-1">
                  {dashboardData.summary.thisMonth}
                </div>
                <div className="text-xs text-gray-400">件</div>
              </div>
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  今週の予約
                </div>
                <div className="text-3xl font-light text-gray-900 mb-1">
                  {dashboardData.summary.thisWeek}
                </div>
                <div className="text-xs text-gray-400">件</div>
              </div>
              <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  今日の予約
                </div>
                <div className="text-3xl font-light text-gray-900 mb-1">
                  {dashboardData.summary.today}
                </div>
                <div className="text-xs text-gray-400">件</div>
              </div>
              <svg className="w-10 h-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  アクティブリンク
                </div>
                <div className="text-3xl font-light text-gray-900 mb-1">
                  {dashboardData.summary.activeLinks}
                </div>
                <div className="text-xs text-gray-400">個</div>
              </div>
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* 直近の予約 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-normal text-gray-900">
                直近の予約
              </h3>
              <p className="mt-1 text-xs text-gray-500">今後7日間の予約</p>
            </div>
            <div className="p-6">
              {dashboardData.upcomingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 text-sm">直近の予約はありません</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {dashboardData.upcomingBookings.map((booking: any) => (
                    <li key={booking.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-light text-sm flex-shrink-0">
                          {new Date(booking.startTime).getDate()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-normal text-gray-900 truncate">
                              {booking.guestName}
                            </h3>
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {booking.bookingLink.title}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {format(new Date(booking.startTime), 'M月d日(EEE) HH:mm', { locale: ja })}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 予約リンク別統計 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-normal text-gray-900">
                予約リンク別統計
              </h3>
              <p className="mt-1 text-xs text-gray-500">今月の予約数</p>
            </div>
            <div className="p-6">
              {dashboardData.bookingsByLink.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">データがありません</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {dashboardData.bookingsByLink.map((link: any, index: number) => (
                    <li key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-normal text-gray-900 truncate mb-1">
                            {link.title}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            /{link.slug}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-light bg-blue-600 text-white">
                            {link.bookingCount}件
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* 予約推移グラフ */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-normal text-gray-900">
              予約推移
            </h3>
            <p className="mt-1 text-xs text-gray-500">過去30日間</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between gap-1">
              {dashboardData.bookingTrend.map((day: any, index: number) => {
                const maxCount = Math.max(...dashboardData.bookingTrend.map((d: any) => d.count), 1)
                const height = (day.count / maxCount) * 100
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-blue-600 rounded-t transition-colors"
                        style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                        title={`${day.date}: ${day.count}件`}
                      />
                      {day.count > 0 && (
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                          {day.count}件
                        </div>
                      )}
                    </div>
                    {index % 5 === 0 && (
                      <span className="text-xs text-gray-400 mt-2">
                        {format(new Date(day.date), 'M/d')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* キャンセル率 */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-xs text-gray-500 mb-3">今月のキャンセル率</p>
          <p className="text-5xl font-light text-gray-900">
            {dashboardData.summary.cancellationRate}%
          </p>
        </div>
      </main>
    </div>
  )
}