'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'

export default function BookingLinksPage() {
  const router = useRouter()
  const [bookingLinks, setBookingLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedLink, setSelectedLink] = useState<any>(null)

  useEffect(() => {
    fetchBookingLinks()
  }, [])

  const fetchBookingLinks = async () => {
    try {
      const response = await fetch('/api/booking-links')
      if (response.ok) {
        const data = await response.json()
        setBookingLinks(data)
      }
    } catch (error) {
      console.error('Failed to fetch booking links:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この予約リンクを削除しますか？')) return

    try {
      const response = await fetch(`/api/booking-links/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('予約リンクを削除しました')
        fetchBookingLinks()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete booking link:', error)
      alert('削除に失敗しました')
    }
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/booking-links/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchBookingLinks()
      } else {
        alert('更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to toggle active:', error)
      alert('更新に失敗しました')
    }
  }

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`
    navigator.clipboard.writeText(url)
    alert('URLをコピーしました')
  }

  const showQRCode = async (link: any) => {
    const url = `${window.location.origin}/book/${link.slug}`
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qrDataUrl)
      setSelectedLink(link)
      setShowQRModal(true)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      alert('QRコードの生成に失敗しました')
    }
  }

  const downloadQRCode = () => {
    const link = document.createElement('a')
    link.download = `qrcode-${selectedLink?.slug}.png`
    link.href = qrCodeUrl
    link.click()
  }

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-gray-900 mb-1">
              予約リンク管理
            </h1>
            <p className="text-gray-500 text-sm">予約リンクの作成・編集・管理</p>
          </div>
          <Link
            href="/home/booking-links/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規作成
          </Link>
        </div>
      </div>

      <main className="p-8 max-w-7xl mx-auto">

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-600 text-sm">読み込み中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bookingLinks.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-gray-500 text-sm">予約リンクがありません</p>
              </div>
            ) : (
              bookingLinks.map((link) => (
                <div key={link.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 pr-4">
                        <h3 className="text-lg font-normal text-gray-900">{link.title}</h3>
                        {/* オーナー情報を表示（自分がオーナーでない場合） */}
                        {!link.isOwner && link.user && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">作成者:</span>
                            <div className="flex items-center gap-1">
                              {link.user.photoUrl ? (
                                <img
                                  src={link.user.photoUrl}
                                  alt={link.user.name}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px]">
                                  {link.user.name.charAt(0)}
                                </div>
                              )}
                              <span className="text-xs text-gray-600">{link.user.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 権限バッジ */}
                        {link.isOwner ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            オーナー
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            参加者
                          </span>
                        )}
                        <button
                          onClick={() => link.isOwner && toggleActive(link.id, link.isActive)}
                          disabled={!link.isOwner}
                          className={`px-2 py-1 rounded text-xs ${
                            link.isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          } ${!link.isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {link.isActive ? '有効' : '無効'}
                        </button>
                      </div>
                    </div>
                    
                    {link.description && (
                      <p className="text-sm text-gray-600 mb-4">{link.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs text-gray-600">
                        <span className="mr-2">時間:</span>
                        <span className="text-gray-900">{link.duration}分</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <span className="mr-2">形式:</span>
                        <span className="text-gray-900">
                          {link.meetingType === 'ONLINE' ? 'オンライン' :
                           link.meetingType === 'OFFLINE' ? '対面' : '両方'}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <span className="mr-2">予約数:</span>
                        <span className="text-gray-900">{link._count.bookings}件</span>
                      </div>
                    </div>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">予約URL:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white px-2 py-1 rounded overflow-x-auto font-mono text-gray-700">
                          /book/{link.slug}
                        </code>
                        <button
                          onClick={() => copyToClipboard(link.slug)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <a
                        href={`/book/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
                      >
                        プレビュー
                      </a>
                      <button
                        onClick={() => showQRCode(link)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
                      >
                        QR
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {link.isOwner ? (
                        <>
                          <button
                            onClick={() => {
                              console.log('Editing booking link:', link.id, link.title)
                              router.push(`/home/booking-links/${link.id}`)
                            }}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 text-red-600"
                          >
                            削除
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 px-3 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs text-center">
                          閲覧のみ（編集権限なし）
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* QRコードモーダル */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-normal text-gray-900">
                QRコード
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">予約リンク: {selectedLink?.title}</p>
                <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto font-mono text-gray-700">
                  {window.location.origin}/book/{selectedLink?.slug}
                </code>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-4 flex justify-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="max-w-full rounded" />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  ダウンロード
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  閉じる
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                QRコードを印刷物やWebサイトに掲載して予約を受け付けることができます
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}