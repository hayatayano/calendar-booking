# GCP Cloud Run デプロイガイド（Webコンソール版）

このドキュメントでは、GCPコンソール（Webブラウザ）を使用してCalendar BookingアプリケーションをCloud Runにデプロイする手順を説明します。

## 前提条件

1. **GCPアカウント**: [Google Cloud Console](https://console.cloud.google.com/) にアクセス可能
2. **GitHubアカウント**: ソースコードをGitHubにホスティング
3. **課金の有効化**: GCPプロジェクトで課金が有効になっていること

---

## Step 1: GCPプロジェクトの作成

1. [GCPコンソール](https://console.cloud.google.com/) にアクセス
2. 画面上部のプロジェクト選択ドロップダウンをクリック
3. **「新しいプロジェクト」** をクリック
4. 以下を入力:
   - **プロジェクト名**: `Calendar Booking`（任意）
   - **プロジェクトID**: `calendar-booking-prod`（グローバルで一意である必要があります）
   - **場所**: 組織を選択（個人の場合は「組織なし」）
5. **「作成」** をクリック

### 課金の有効化

1. ナビゲーションメニュー → **「お支払い」**
2. プロジェクトに課金アカウントをリンク

---

## Step 2: 必要なAPIの有効化

1. ナビゲーションメニュー → **「APIとサービス」** → **「ライブラリ」**
2. 以下のAPIを検索して有効化:
   - ✅ **Cloud Run Admin API**
   - ✅ **Cloud Build API**
   - ✅ **Cloud SQL Admin API**
   - ✅ **Secret Manager API**
   - ✅ **Artifact Registry API**

---

## Step 3: Cloud SQL（PostgreSQL）の作成

### 3.1 インスタンスの作成

1. ナビゲーションメニュー → **「SQL」**
2. **「インスタンスを作成」** をクリック
3. **「PostgreSQL」** を選択
4. 設定を入力:
   - **インスタンスID**: `calendar-booking-db`
   - **パスワード**: 安全なパスワードを設定（メモしておく）
   - **データベースバージョン**: `PostgreSQL 15`
   - **リージョン**: `asia-northeast1（東京）`
   - **ゾーン**: `任意`
5. **構成オプション**:
   - **マシンタイプ**: `軽量`（開発用）または `高メモリ`（本番用）
   - **ストレージ**: `SSD` / `10GB`
6. **「インスタンスを作成」** をクリック（5-10分かかります）

### 3.2 データベースの作成

1. 作成したインスタンスをクリック
2. **「データベース」** タブ → **「データベースを作成」**
3. **データベース名**: `calendar_booking`
4. **「作成」** をクリック

### 3.3 ユーザーの作成（オプション）

1. **「ユーザー」** タブ → **「ユーザーアカウントを追加」**
2. **ユーザー名**: `app_user`
3. **パスワード**: 安全なパスワードを設定
4. **「追加」** をクリック

---

## Step 4: Secret Manager で環境変数を設定

1. ナビゲーションメニュー → **「セキュリティ」** → **「Secret Manager」**
2. 各環境変数をシークレットとして作成:

### 必須シークレット

| シークレット名 | 値の例 |
|---------------|-------|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@/calendar_booking?host=/cloudsql/PROJECT_ID:asia-northeast1:calendar-booking-db` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` で生成した値 |
| `NEXTAUTH_URL` | `https://calendar-booking-xxxxx-an.a.run.app`（後で更新） |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

### シークレットの作成手順

1. **「シークレットを作成」** をクリック
2. **名前**: `DATABASE_URL`
3. **シークレットの値**: 上記の形式で入力
4. **「シークレットを作成」** をクリック
5. 他のシークレットも同様に作成

---

## Step 5: GitHubリポジトリの準備

### 5.1 GitHubにコードをプッシュ

1. GitHubで新しいリポジトリを作成
2. ローカルからプッシュ:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/calendar-booking.git
git push -u origin main
```

---

## Step 6: Cloud Buildでビルドトリガーを設定

### 6.1 GitHubとの接続

1. ナビゲーションメニュー → **「Cloud Build」** → **「トリガー」**
2. **「リポジトリを接続」** をクリック
3. **「GitHub（Cloud Build GitHub アプリ）」** を選択
4. GitHubの認証を完了
5. リポジトリ `calendar-booking` を選択
6. **「接続」** をクリック

### 6.2 ビルドトリガーの作成

1. **「トリガーを作成」** をクリック
2. 設定を入力:
   - **名前**: `deploy-to-cloud-run`
   - **リージョン**: `グローバル`
   - **イベント**: `ブランチにプッシュ`
   - **ソース**: 接続したGitHubリポジトリ
   - **ブランチ**: `^main$`
   - **構成**: `Cloud Build 構成ファイル`
   - **ファイルの場所**: `cloudbuild.yaml`
3. **置換変数**（詳細設定）:
   - `_SERVICE_NAME`: `calendar-booking`
   - `_REGION`: `asia-northeast1`
4. **「作成」** をクリック

---

## Step 7: Cloud Runサービスの手動デプロイ（初回）

### 7.1 Cloud Buildを手動実行

1. **「Cloud Build」** → **「トリガー」**
2. 作成したトリガーの **「実行」** をクリック
3. ブランチ `main` を選択して **「トリガーを実行」**
4. **「履歴」** でビルドの進捗を確認

### 7.2 Cloud Runサービスの設定

ビルドが成功したら、Cloud Runサービスを設定します。

1. ナビゲーションメニュー → **「Cloud Run」**
2. デプロイされたサービス `calendar-booking` をクリック
3. **「新しいリビジョンの編集とデプロイ」** をクリック

### 7.3 環境変数とシークレットの設定

**「変数とシークレット」** タブで以下を設定:

#### シークレットの参照（推奨）

1. **「シークレットの参照」** をクリック
2. 各シークレットを追加:
   - **シークレット**: `DATABASE_URL` → **バージョン**: `latest` → **環境変数として公開**: `DATABASE_URL`
   - 同様に `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` を追加

### 7.4 Cloud SQL接続の設定

**「接続」** タブで:

1. **「Cloud SQL 接続」** セクション
2. **「接続を追加」** をクリック
3. 作成したCloud SQLインスタンス `calendar-booking-db` を選択

### 7.5 コンテナ設定

**「コンテナ」** タブで:

- **コンテナポート**: `8080`
- **メモリ**: `512Mi`（または必要に応じて増加）
- **CPU**: `1`
- **最小インスタンス数**: `0`
- **最大インスタンス数**: `10`

### 7.6 デプロイ

**「デプロイ」** をクリック

---

## Step 8: サービスURLの取得と設定

1. Cloud Runサービスの詳細ページでURLを確認
   - 例: `https://calendar-booking-xxxxx-an.a.run.app`
2. **Secret Manager** で `NEXTAUTH_URL` を更新:
   - 新しいバージョンを追加して、上記URLを設定

---

## Step 9: データベースマイグレーション

### Cloud Shellを使用

1. GCPコンソール右上の **「Cloud Shellをアクティブにする」** をクリック
2. 以下のコマンドを実行:

```bash
# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# Cloud Run Jobを作成してマイグレーションを実行
gcloud run jobs create migrate-database \
  --image gcr.io/YOUR_PROJECT_ID/calendar-booking:latest \
  --region asia-northeast1 \
  --set-cloudsql-instances YOUR_PROJECT_ID:asia-northeast1:calendar-booking-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --command "npx" \
  --args "prisma,migrate,deploy"

# ジョブを実行
gcloud run jobs execute migrate-database --region asia-northeast1
```

---

## Step 10: Google OAuth設定の更新

1. [Google Cloud Console](https://console.cloud.google.com/) → **「APIとサービス」** → **「認証情報」**
2. OAuth 2.0 クライアント ID をクリック
3. **「承認済みのリダイレクト URI」** に追加:
   - `https://calendar-booking-xxxxx-an.a.run.app/api/auth/callback/google`

---

## トラブルシューティング

### ビルドが失敗する場合

1. **「Cloud Build」** → **「履歴」** でログを確認
2. よくあるエラー:
   - `npm ci` の失敗 → `package-lock.json` が最新か確認
   - Prisma生成エラー → `prisma/schema.prisma` の構文確認

### Cloud Runが起動しない場合

1. **「Cloud Run」** → サービス → **「ログ」** タブ
2. よくあるエラー:
   - `DATABASE_URL` が設定されていない → Secret Managerの設定確認
   - ポート8080でリッスンしていない → Dockerfileの`EXPOSE`確認

### データベース接続エラー

1. Cloud SQL接続が設定されているか確認
2. `DATABASE_URL` の形式が正しいか確認:
   ```
   postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
   ```

---

## コスト見積もり（月額概算）

| サービス | 構成 | 概算コスト |
|---------|------|-----------|
| Cloud Run | 512MB, 1 CPU, 最小0インスタンス | $0〜$50/月（トラフィック依存） |
| Cloud SQL | db-f1-micro | $7〜$10/月 |
| Secret Manager | 6シークレット | $0.06/月 |
| Cloud Build | 120分/日無料 | $0（無料枠内） |

**合計**: 約 $10〜$60/月（トラフィックとスケール設定による）

---

## 参考リンク

- [GCPコンソール](https://console.cloud.google.com/)
- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)