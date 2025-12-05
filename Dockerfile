# ベースイメージ
FROM node:20-alpine AS base

# 依存関係インストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# パッケージファイルをコピー
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 依存関係をインストール
RUN npm ci

# Prismaクライアントを生成
RUN npx prisma generate

# ビルドステージ
FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 環境変数（ビルド時）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# メモリ不足エラーを防ぐためにヒープサイズを増加
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Next.jsをビルド
RUN npm run build

# 本番環境用ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# publicフォルダをコピー
COPY --from=builder /app/public ./public

# スタンドアロン出力をコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prismaクライアントをコピー
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Prismaスキーマをコピー（マイグレーション用）
COPY --from=builder /app/prisma ./prisma

USER nextjs

# Cloud Runはポート8080を使用
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# アプリケーションを起動
CMD ["node", "server.js"]