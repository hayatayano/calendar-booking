import { prisma } from './prisma'
import { getAvailableSlots } from './google-calendar'

/**
 * 予約リンクのメンバーからラウンドロビン方式で担当者を選択
 * 最後に予約を担当した時間が最も古いメンバーを選択
 */
export async function selectMemberByRoundRobin(
  bookingLinkId: string,
  startTime: Date,
  duration: number
): Promise<string | null> {
  // 予約リンクとメンバーを取得
  const bookingLink = await prisma.bookingLink.findUnique({
    where: { id: bookingLinkId },
    include: {
      members: {
        include: {
          user: {
            include: {
              workingHours: true,
              holidays: true,
            },
          },
        },
      },
    },
  })

  if (!bookingLink) {
    throw new Error('Booking link not found')
  }

  // メンバーがいない場合は予約リンクの所有者を返す
  if (!bookingLink.members || bookingLink.members.length === 0) {
    return bookingLink.userId
  }

  // ラウンドロビンが無効の場合、全員が空いている必要がある (ALL条件)
  // ラウンドロビンが有効の場合、誰か1人が空いていればOK (ANY条件)
  if (!bookingLink.roundRobinEnabled) {
    // ALL条件: 全メンバーが空いているか確認
    for (const member of bookingLink.members) {
      const isAvailable = await isUserAvailableForTime(member.userId, startTime, duration)
      if (!isAvailable) {
        return null // 1人でも空いていなければ予約不可
      }
    }
    // 全員空いている場合、オーナーを担当者として返す
    const owner = bookingLink.members.find(m => m.role === 'OWNER')
    return owner ? owner.userId : bookingLink.userId
  }

  // ANY条件 (ラウンドロビン有効)
  // 各メンバーの最後の予約時間を取得
  const membersWithLastBooking = await Promise.all(
    bookingLink.members.map(async (member) => {
      // メンバーがこの時間に空いているか確認
      const isAvailable = await isUserAvailableForTime(member.userId, startTime, duration)
      
      if (!isAvailable) {
        return { ...member, isAvailable: false, lastBookingTime: null }
      }

      // この予約リンクでの最後の予約を取得
      const lastBooking = await prisma.booking.findFirst({
        where: {
          bookingLinkId: bookingLinkId,
          userId: member.userId,
          status: { not: 'CANCELLED' },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
      })

      return {
        ...member,
        isAvailable: true,
        lastBookingTime: lastBooking?.createdAt || new Date(0), // 予約履歴がない場合は最優先
      }
    })
  )

  // 空いているメンバーをフィルタリング
  const availableMembers = membersWithLastBooking.filter(m => m.isAvailable)

  if (availableMembers.length === 0) {
    return null // 誰も空いていない
  }

  // 最後の予約時間が最も古いメンバーを選択（ラウンドロビン）
  availableMembers.sort((a, b) => {
    const timeA = a.lastBookingTime?.getTime() || 0
    const timeB = b.lastBookingTime?.getTime() || 0
    return timeA - timeB
  })

  console.log('Round robin selection:', availableMembers.map(m => ({
    userId: m.userId,
    lastBookingTime: m.lastBookingTime,
    name: m.user.name,
  })))

  return availableMembers[0].userId
}

/**
 * 指定した時間にユーザーが空いているか簡易チェック
 */
async function isUserAvailableForTime(
  userId: string,
  startTime: Date,
  duration: number
): Promise<boolean> {
  const endTime = new Date(startTime.getTime() + duration * 60000)

  // 既存の予約と重複していないか確認
  const existingBooking = await prisma.booking.findFirst({
    where: {
      userId,
      status: { not: 'CANCELLED' },
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } },
          ],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    },
  })

  if (existingBooking) {
    return false
  }

  // 休暇チェック
  const startOfDay = new Date(startTime)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startTime)
  endOfDay.setHours(23, 59, 59, 999)

  const holiday = await prisma.holiday.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  if (holiday) {
    return false
  }

  return true
}

/**
 * ラウンドロビン方式で担当者を自動割り当て
 */
export async function assignStaffRoundRobin(
  bookingLinkId: string,
  startTime: Date,
  duration: number
): Promise<string | null> {
  // 予約リンクの所有者を取得
  const bookingLink = await prisma.bookingLink.findUnique({
    where: { id: bookingLinkId },
    include: {
      user: true,
    },
  })

  if (!bookingLink) {
    throw new Error('Booking link not found')
  }

  // アクティブな割り当てルールを持つユーザーを取得（優先度順）
  const assignmentRules = await prisma.assignmentRule.findMany({
    where: {
      isActive: true,
    },
    include: {
      user: {
        include: {
          workingHours: true,
          holidays: true,
        },
      },
    },
    orderBy: {
      priority: 'asc',
    },
  })

  // 割り当てルールがない場合は、予約リンクの所有者を返す
  if (assignmentRules.length === 0) {
    return bookingLink.userId
  }

  // 各担当者の予約可能状況をチェック
  for (const rule of assignmentRules) {
    const userId = rule.userId
    
    // その時間帯に予約可能かチェック
    const availableSlots = await getAvailableSlots(
      userId,
      startTime,
      duration,
      0
    )

    // 指定された時間が予約可能かチェック
    const isAvailable = availableSlots.some(
      slot => 
        slot.start.getTime() === startTime.getTime()
    )

    if (isAvailable) {
      return userId
    }
  }

  // 誰も空いていない場合は null を返す
  return null
}

/**
 * 指定したユーザーが指定時間に予約可能かチェック
 */
export async function isUserAvailable(
  userId: string,
  startTime: Date,
  duration: number
): Promise<boolean> {
  const availableSlots = await getAvailableSlots(
    userId,
    startTime,
    duration,
    0
  )

  return availableSlots.some(
    slot => slot.start.getTime() === startTime.getTime()
  )
}

/**
 * 担当者の稼働状況を取得
 */
export async function getStaffAvailability(userId: string, date: Date) {
  const dayOfWeek = date.getDay()
  
  // 稼働時間を取得
  const workingHours = await prisma.workingHours.findFirst({
    where: {
      userId,
      dayOfWeek,
      isAvailable: true,
    },
  })

  if (!workingHours) {
    return {
      isAvailable: false,
      reason: '稼働日ではありません',
    }
  }

  // 休暇チェック
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const holiday = await prisma.holiday.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  if (holiday) {
    return {
      isAvailable: false,
      reason: `休暇: ${holiday.reason || '予定あり'}`,
    }
  }

  return {
    isAvailable: true,
    workingHours: {
      start: workingHours.startTime,
      end: workingHours.endTime,
    },
  }
}

/**
 * 担当者の今月の予約数を取得
 */
export async function getStaffBookingCount(
  userId: string,
  month: Date
): Promise<number> {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)

  const count = await prisma.booking.count({
    where: {
      userId,
      startTime: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: {
        not: 'CANCELLED',
      },
    },
  })

  return count
}

/**
 * 全担当者の予約数を取得（統計用）
 */
export async function getAllStaffBookingStats(month: Date) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)

  const stats = await prisma.booking.groupBy({
    by: ['userId'],
    where: {
      startTime: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      status: {
        not: 'CANCELLED',
      },
    },
    _count: {
      id: true,
    },
  })

  // ユーザー情報を追加
  const statsWithUsers = await Promise.all(
    stats.map(async (stat: any) => {
      const user = await prisma.user.findUnique({
        where: { id: stat.userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      return {
        ...user,
        bookingCount: stat._count.id,
      }
    })
  )

  return statsWithUsers
}