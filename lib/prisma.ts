import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ビルド時にはDATABASE_URLがないため、Prismaクライアントの初期化をスキップ
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    // ビルド時のダミークライアント
    return null as unknown as PrismaClient
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma
}