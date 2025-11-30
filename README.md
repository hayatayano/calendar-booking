# カレンダー連携予約システム

Googleカレンダーと連携した予約管理システム。jicooのような機能を持つ、面接や商談の日程調整を効率化するためのWebアプリケーションです。

## 主な機能

### ✅ 実装済み機能

1. **Googleカレンダー連携**
   - 社員のカレンダーと自動連携
   - 予定が入っている時間は予約不可（二重予約防止）
   - 予約やキャンセルを自動反映

2. **予約リンク作成**
   - 用途に合わせてカスタマイズ可能なリンクを発行
   - 対面/オンライン（Google Meet）の選択
   - 面談時間の設定（30分/60分など）
   - 受付期限の設定
   - カスタムフォーム項目の追加
   - 通知方法の選択（メール/SMS/両方）

3. **外部予約ページ**
   - 担当者情報の表示（写真、肩書、コメント）
   - 日付と時間の選択UI
   - 対面/オンラインの選択
   - 予約者情報の入力（氏名、メール、電話番号）
   - SNS連携ボタン（Instagram、Facebook、X、TikTok）

4. **通知機能**
   - メール通知（Resend使用）
   - SMS通知（Twilio使用、"newgate"名義）
   - 予約確認、キャンセル、リマインダーの自動送信
   - カレンダー登録（ICSファイル）付きメール

5. **Googleチャット通知**
   - 予約/キャンセル/リマインドの自動投稿
   - 予約内容の詳細表示
   - 営業や採用チームへの通知

6. **カスタムフォーム**
   - 動的なフォーム項目の作成
   - 回答内容をGoogleカレンダーのメモ欄に自動反映

7. **担当者自動割り当て**
   - ラウンドロビン方式での自動割り当て
   - 優先度設定
   - 手動割り当ても可能

8. **管理画面（完全実装済み）**
   - **ダッシュボード**: 統計情報、予約推移グラフ、直近の予約
   - **予約一覧**: 検索・フィルター、詳細表示、キャンセル機能
   - **予約リンク管理**: 作成・編集・削除、有効/無効切り替え、URLコピー
   - CSV出力機能（準備完了）
   - 稼働時間・休暇設定（データモデル実装済み）
   - 通知エラー・再送履歴の確認

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: PostgreSQL (Prisma ORM)
- **認証**: NextAuth.js (Google OAuth)
- **Google API**: googleapis (Calendar API)
- **メール**: Resend
- **SMS**: Twilio
- **フォーム**: React Hook Form + Zod
- **日付操作**: date-fns

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成して以下の情報を設定してください：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/calendar_booking?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here-generate-with-openssl-rand-base64-32"

# Google OAuth & Calendar API
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend (Email)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"
TWILIO_SENDER_NAME="newgate"

# Google Chat Webhook
GOOGLE_CHAT_WEBHOOK_URL="your-google-chat-webhook-url"

# App Settings
APP_URL="http://localhost:3000"
```

### 3. データベースのセットアップ

```bash
# Prisma Clientの生成
npx prisma generate

# マイグレーションの実行
npx prisma migrate dev --name init

# （オプション）Prisma Studioでデータベースを確認
npx prisma studio
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

- 管理画面: `http://localhost:3000/admin/dashboard`
- 予約ページ例: `http://localhost:3000/book/[slug]`

## Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「OAuth 同意画面」で設定
4. 「APIとサービス」→「認証情報」でOAuth 2.0クライアントIDを作成
5. 承認済みのリダイレクトURIに `http://localhost:3000/api/auth/callback/google` を追加
6. Google Calendar APIを有効化
7. クライアントIDとシークレットを `.env` に設定

## Resend設定

1. [Resend](https://resend.com/)でアカウント作成
2. APIキーを取得
3. ドメインを検証（本番環境の場合）
4. APIキーを `.env` に設定

## Twilio設定

1. [Twilio](https://www.twilio.com/)でアカウント作成
2. 電話番号を取得
3. Account SIDとAuth Tokenを取得
4. 情報を `.env` に設定

## Google Chat Webhook設定

1. Google Chatでスペースを作成
2. スペースの設定からWebhook URLを取得
3. URLを `.env` に設定

## プロジェクト構造

```
calendar-booking/
├── app/
│   ├── api/                    # APIルート
│   │   ├── admin/             # 管理画面用API
│   │   │   └── dashboard/     # ダッシュボード統計
│   │   ├── auth/              # NextAuth認証
│   │   ├── booking-links/     # 予約リンク管理
│   │   ├── bookings/          # 予約管理
│   │   └── public/            # 公開API
│   ├── admin/                 # 管理画面
│   │   ├── dashboard/         # ダッシュボード
│   │   ├── bookings/          # 予約一覧
│   │   └── booking-links/     # 予約リンク管理
│   ├── book/[slug]/           # 外部予約ページ
│   └── layout.tsx             # ルートレイアウト
├── lib/
│   ├── auth.ts                # NextAuth設定
│   ├── prisma.ts              # Prisma Client
│   ├── google-calendar.ts     # Googleカレンダー連携
│   ├── notifications.ts       # メール・SMS通知
│   ├── google-chat.ts         # Googleチャット通知
│   └── assignment.ts          # 担当者自動割り当て
├── prisma/
│   └── schema.prisma          # データベーススキーマ
├── .env                       # 環境変数
└── package.json
```

## 主要ページ

### 管理画面

- `/admin/dashboard` - ダッシュボード
  - 今月/今週/今日の予約数
  - アクティブリンク数
  - 直近の予約一覧
  - 予約リンク別統計
  - 過去30日間の予約推移グラフ
  - キャンセル率

- `/admin/bookings` - 予約一覧
  - 検索・フィルター機能
  - ステータス別表示
  - 予約詳細モーダル
  - キャンセル機能

- `/admin/booking-links` - 予約リンク管理
  - 予約リンクの作成・編集・削除
  - 有効/無効の切り替え
  - URLコピー機能
  - プレビュー機能

### 公開ページ

- `/book/[slug]` - 予約ページ
  - 担当者情報表示
  - カレンダーから日時選択
  - リアルタイム空き状況確認
  - フォーム入力
  - 予約完了画面

## データベーススキーマ

主要なモデル：

- `User`: ユーザー（社員・担当者）
- `Account`: 外部認証アカウント（Google）
- `BookingLink`: 予約リンク
- `Booking`: 予約
- `FormField`: カスタムフォームフィールド
- `FormResponse`: フォーム回答
- `WorkingHours`: 稼働時間設定
- `Holiday`: 休暇設定
- `NotificationLog`: 通知ログ
- `AssignmentRule`: 担当者割り当てルール
- `SocialLink`: SNSリンク

## API エンドポイント

### 認証

- `GET/POST /api/auth/[...nextauth]` - NextAuth認証

### 管理画面用API

- `GET /api/admin/dashboard` - ダッシュボード統計情報取得

### 予約リンク管理

- `GET /api/booking-links` - 予約リンク一覧取得
- `POST /api/booking-links` - 予約リンク作成
- `GET /api/booking-links/[id]` - 予約リンク詳細取得
- `PATCH /api/booking-links/[id]` - 予約リンク更新
- `DELETE /api/booking-links/[id]` - 予約リンク削除

### 予約管理

- `GET /api/bookings` - 予約一覧取得
- `POST /api/bookings` - 予約手動作成
- `GET /api/bookings/[id]` - 予約詳細取得
- `PATCH /api/bookings/[id]` - 予約更新
- `DELETE /api/bookings/[id]` - 予約キャンセル

### 公開API

- `GET /api/public/booking-links/[slug]` - 予約リンク情報取得
- `GET /api/public/booking-links/[slug]/available-slots` - 予約可能時間取得
- `POST /api/public/bookings` - 予約作成

## 今後の実装予定

- [ ] ログイン・認証画面
- [ ] 予約リンク詳細編集ページ
- [ ] CSV出力実装
- [ ] リマインダー自動送信（Cron Job）
- [ ] ユーザー設定ページ（稼働時間・休暇管理）
- [ ] 予約統計・レポート機能
- [ ] 多言語対応
- [ ] ダークモード対応

## 開発のヒント

### 開発時のデバッグ

```bash
# Prisma Studioでデータベースを確認
npx prisma studio

# データベースをリセット
npx prisma migrate reset

# TypeScriptの型チェック
npm run type-check
```

### テストデータの作成

管理画面から予約リンクを作成し、そのスラッグを使って外部予約ページにアクセスできます。

```
http://localhost:3000/book/[生成されたslug]
```

## トラブルシューティング

### データベース接続エラー

- `.env`ファイルの`DATABASE_URL`を確認
- PostgreSQLが起動しているか確認
- `npx prisma migrate dev`を実行してマイグレーション

### Googleカレンダー連携エラー

- Google Cloud Consoleで正しく設定されているか確認
- OAuth 2.0のリダイレクトURIが正しいか確認
- Calendar APIが有効化されているか確認

### 通知が送信されない

- Resend/TwilioのAPIキーが正しいか確認
- 送信元メールアドレス/電話番号が検証済みか確認

## ライセンス

MIT

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
