'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface WorkingHour {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface Holiday {
  id: string
  date: string
  reason: string | null
}

const DAYS_OF_WEEK = [
  { value: 0, label: '日曜日' },
  { value: 1, label: '月曜日' },
  { value: 2, label: '火曜日' },
  { value: 3, label: '水曜日' },
  { value: 4, label: '木曜日' },
  { value: 5, label: '金曜日' },
  { value: 6, label: '土曜日' },
]

export default function SchedulePage() {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<number, { startTime: string; endTime: string; isAvailable: boolean }>>({})
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    reason: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [workingResponse, holidayResponse] = await Promise.all([
        fetch('/api/working-hours'),
        fetch('/api/holidays'),
      ])

      if (workingResponse.ok) {
        const workingData = await workingResponse.json()
        setWorkingHours(workingData)
      }

      if (holidayResponse.ok) {
        const holidayData = await holidayResponse.json()
        setHolidays(holidayData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = () => {
    const form: Record<number, { startTime: string; endTime: string; isAvailable: boolean }> = {}
    DAYS_OF_WEEK.forEach((day) => {
      const existing = workingHours.find((wh) => wh.dayOfWeek === day.value)
      form[day.value] = existing
        ? {
            startTime: existing.startTime,
            endTime: existing.endTime,
            isAvailable: existing.isAvailable,
          }
        : {
            startTime: '09:00',
            endTime: '18:00',
            isAvailable: true,
          }
    })
    setEditForm(form)
    setIsEditing(true)
  }

  const handleSaveAll = async () => {
    try {
      const promises = Object.entries(editForm).map(([dayOfWeek, data]) =>
        fetch('/api/working-hours', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dayOfWeek: parseInt(dayOfWeek),
            ...data,
          }),
        })
      )

      const results = await Promise.all(promises)
      const allSuccess = results.every((res) => res.ok)

      if (allSuccess) {
        alert('稼働時間を一括設定しました')
        setIsEditing(false)
        fetchData()
      } else {
        alert('一部の設定に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save working hours:', error)
      alert('設定に失敗しました')
    }
  }

  const updateDayForm = (dayOfWeek: number, field: string, value: any) => {
    setEditForm({
      ...editForm,
      [dayOfWeek]: {
        ...editForm[dayOfWeek],
        [field]: value,
      },
    })
  }

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(holidayForm),
      })

      if (response.ok) {
        alert('休暇を追加しました')
        setHolidayForm({ date: '', reason: '' })
        fetchData()
      } else {
        alert('追加に失敗しました')
      }
    } catch (error) {
      console.error('Failed to add holiday:', error)
      alert('追加に失敗しました')
    }
  }

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('この休暇を削除しますか？')) return

    try {
      const response = await fetch(`/api/holidays?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('休暇を削除しました')
        fetchData()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete holiday:', error)
      alert('削除に失敗しました')
    }
  }

  const getDayStatus = (dayOfWeek: number) => {
    const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek)
    if (!wh) return { label: '未設定', color: 'text-gray-500' }
    if (!wh.isAvailable) return { label: '休み', color: 'text-red-600' }
    return { label: `${wh.startTime} - ${wh.endTime}`, color: 'text-green-600' }
  }

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-8 px-8">
        <h1 className="text-2xl font-normal text-gray-900 mb-1">
          予約受付スケジュール設定
        </h1>
        <p className="text-gray-500 text-sm">稼働時間と休暇の管理</p>
      </div>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 稼働時間設定 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-base font-normal text-gray-900">
                稼働時間設定
              </h2>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  編集
                </button>
              )}
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-gray-500 text-sm">読み込み中...</p>
                </div>
              ) : !isEditing ? (
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => {
                    const status = getDayStatus(day.value)
                    return (
                      <div
                        key={day.value}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-1">
                            <div className="font-normal text-gray-900 text-sm">{day.label}</div>
                            <div className={`text-xs ${status.color}`}>{status.label}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="p-4 border border-gray-200 rounded-lg">
                      <div className="font-normal text-gray-900 mb-3 text-sm">
                        {day.label}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`available-${day.value}`}
                            checked={editForm[day.value]?.isAvailable ?? true}
                            onChange={(e) =>
                              updateDayForm(day.value, 'isAvailable', e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`available-${day.value}`}
                            className="text-sm text-gray-700"
                          >
                            予約を受け付ける
                          </label>
                        </div>

                        {editForm[day.value]?.isAvailable && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                開始時間
                              </label>
                              <input
                                type="time"
                                value={editForm[day.value]?.startTime ?? '09:00'}
                                onChange={(e) =>
                                  updateDayForm(day.value, 'startTime', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                終了時間
                              </label>
                              <input
                                type="time"
                                value={editForm[day.value]?.endTime ?? '18:00'}
                                onChange={(e) =>
                                  updateDayForm(day.value, 'endTime', e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveAll}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      すべて保存
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 休暇設定 */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-base font-normal text-gray-900">
                休暇設定
              </h2>
            </div>

            <div className="p-6">
              {/* 休暇追加フォーム */}
              <form onSubmit={handleAddHoliday} className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">
                      日付 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={holidayForm.date}
                      onChange={(e) =>
                        setHolidayForm({ ...holidayForm, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">
                      理由
                    </label>
                    <input
                      type="text"
                      value={holidayForm.reason}
                      onChange={(e) =>
                        setHolidayForm({ ...holidayForm, reason: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    休暇を追加
                  </button>
                </div>
              </form>

              {/* 休暇一覧 */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-500 text-sm">読み込み中...</p>
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm">休暇の設定がありません</p>
                  </div>
                ) : (
                  holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <div className="font-normal text-gray-900 text-sm">
                          {format(new Date(holiday.date), 'yyyy年M月d日(EEE)', { locale: ja })}
                        </div>
                        {holiday.reason && (
                          <div className="text-xs text-gray-600 mt-1">{holiday.reason}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(holiday.id)}
                        className="px-3 py-2 text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}