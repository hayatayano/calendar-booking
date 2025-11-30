# セットアップガイド

## 1. Google Cloud Consoleの設定

### 1-1. プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを新規作成（例：calendar-booking）

### 1-2. OAuth同意画面の設定
1. 左メニュー > **APIとサービス** > **OAuth同意画面**
2. **外部**を選択して作成
3. アプリ情報を入力：
   - アプリ名：`Calendar Booking System`
   - ユーザーサポートメール：あなたのメールアドレス
   - デベロッパーの連絡先情報：あなたのメールアドレス
4. **スコープを追加または削除**をクリック：
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. テストユーザーを追加（開発中は自分のメールアドレス）
6. 保存して続行

### 1-3. OAuth 2.0クライアントIDの作成
1. 左メニュー > **APIとサービス** > **認証情報**
2. **+ 認証情報を作成** > **OAuth クライアント ID**
3. アプリケーションの種類：**ウェブアプリケーション**
4. 名前：`Calendar Booking Web Client`
5. **承認済みのリダイレクトURI**に以下を追加：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   （本番環境の場合は `https://yourdomain.com/api/auth/callback/google` も追加）
6. **作成**をクリック
7. **クライアントID**と**クライアントシークレット**をコピー

### 1-4. Calendar APIの有効化
1. 左メニュー > **APIとサービス** > **ライブラリ**
2. 検索バーで「Google Calendar API」を検索
3. **有効にする**をクリック

## 2. Resend（メール送信）の設定

1. [Resend](https://resend.com/)にアクセスしてアカウント作成
2. ダッシュボード > **API Keys** > **Create API Key**
3. APIキーをコピー
4. ドメインを追加（開発環境では不要、本番環境で必要）

## 3. Twilio（SMS送信）の設定

1. [Twilio](https://www.twilio.com/)にアクセスしてアカウント作成
2. ダッシュボードから以下をコピー：
   - **Account SID**
   - **Auth Token**
3. 電話番号を取得：
   - **Phone Numbers** > **Buy a Number**
   - SMS対応の番号を選択して購入
   - 購入した番号をコピー

## 4. Google Chat Webhook（オプション）

1. Google Chatでスペースを作成
2. スペース名 > **アプリと統合を管理**
3. **Webhooks** > **Webhook を追加**
4. 名前を入力して保存
5. Webhook URLをコピー

## 5. データベースの準備

### PostgreSQLのインストール（ローカル開発の場合）

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
createdb calendar_booking
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb calendar_booking
```

#### Windows
1. [PostgreSQL公式サイト](https://www.postgresql.org/download/windows/)からインストーラーをダウンロード
2. インストール後、pgAdmin 4を開く
3. `calendar_booking`という名前のデータベースを作成

### Supabase（クラウドデータベース）を使う場合
1. [Supabase](https://supabase.com/)でアカウント作成
2. 新しいプロジェクトを作成
3. **Settings** > **Database** > **Connection string** > **URI**をコピー

## 6. 環境変数の設定

### 環境変数ファイルの使い分け

Next.jsでは以下の環境変数ファイルが利用できます（優先度順）：

1. **`.env.local`** - ローカル開発用（Gitにコミットされない）✅ **推奨**
2. **`.env.development`** - 開発環境共通設定（チームで共有可能）
3. **`.env.production`** - 本番環境共通設定（チームで共有可能）
4. **`.env`** - 全環境共通のデフォルト設定
5. **`.env.example`** - 設定例テンプレート（Gitにコミット）

**推奨：`.env.local`を使用**

個人の認証情報を含むため、`.env.local`ファイルを作成して設定してください。このファイルは`.gitignore`により自動的にGitから除外されます。

### 設定手順

`.env.local`ファイルをプロジェクトルートに作成し、以下の値を設定します：

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/calendar_booking?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ここに32文字以上のランダムな文字列"

# Google OAuth & Calendar API
GOOGLE_CLIENT_ID="あなたのクライアントID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="あなたのクライアントシークレット"

# Resend (Email)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_PHONE_NUMBER="+1234567890"
TWILIO_SENDER_NAME="newgate"

# Google Chat Webhook（オプション）
GOOGLE_CHAT_WEBHOOK_URL="https://chat.googleapis.com/v1/spaces/xxx/messages?key=xxx"

# App Settings
APP_URL="http://localhost:3000"
```

### 環境変数の優先順位

Next.jsは以下の順序で環境変数を読み込みます：

1. `process.env`（システム環境変数）
2. `.env.$(NODE_ENV).local`（例：`.env.production.local`）
3. `.env.local`（`NODE_ENV=test`の場合は読み込まれない）
4. `.env.$(NODE_ENV)`（例：`.env.production`）
5. `.env`

より具体的なファイルが優先されるため、`.env.local`の値は`.env`の値を上書きします。

### NEXTAUTH_SECRETの生成方法

#### macOS/Linux
```bash
openssl rand -base64 32
```

#### Windows（PowerShell）
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### オンラインツール
https://generate-secret.vercel.app/32

## 7. プロジェクトのセットアップ

```bash
# 依存関係のインストール
npm install

# Prismaのセットアップ
npx prisma generate
npx prisma migrate dev --name init

# 開発サーバーの起動
npm run dev
```

## 8. 動作確認

1. ブラウザで http://localhost:3000 にアクセス
2. ログインページが表示される
3. **Sign in with Google**をクリック
4. Googleアカウントでログイン
5. カレンダーへのアクセス許可を承認
6. ダッシュボードにリダイレクトされることを確認

## トラブルシューティング

### エラー: `Error 401: invalid_client`
- `.env`ファイルの`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しく設定されているか確認
- Google Cloud Consoleで**承認済みのリダイレクトURI**が正しく設定されているか確認
- サーバーを再起動（`Ctrl+C` → `npm run dev`）

### エラー: `Error: Access blocked: This app's request is invalid`
- OAuth同意画面で必要なスコープが追加されているか確認
- テストユーザーに自分のメールアドレスが追加されているか確認

### エラー: `Can't reach database server`
- PostgreSQLが起動しているか確認
- `DATABASE_URL`の接続情報が正しいか確認
- データベース名が存在するか確認

### エラー: `Environment variable not found: NEXTAUTH_SECRET`
- `.env`ファイルが正しい場所に配置されているか確認
- サーバーを再起動

## 本番環境へのデプロイ

### Vercelへのデプロイ

1. [Vercel](https://vercel.com/)でアカウント作成
2. GitHubリポジトリと連携
3. 環境変数を設定（上記の`.env`の内容を全て設定）
4. `NEXTAUTH_URL`を本番URLに変更（例：`https://yourdomain.com`）
5. Google Cloud Consoleで本番URLのリダイレクトURIを追加
6. デプロイ

### データベース

本番環境ではSupabaseやRender、Neonなどのマネージドデータベースを使用することを推奨します。

---

何か問題が発生した場合は、エラーメッセージとともにお知らせください。