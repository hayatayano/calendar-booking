# GCP Cloud Run デプロイガイド

このドキュメントでは、Calendar BookingアプリケーションをGoogle Cloud Platform (GCP) のCloud Runにデプロイする手順を説明します。

## 前提条件

1. **GCPアカウント**: 有効なGCPアカウントとプロジェクト
2. **gcloud CLI**: インストールおよび認証済み
3. **Docker**: ローカルでのテスト用（オプション）

## アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloud Run     │────▶│   Cloud SQL     │     │  Secret Manager │
│  (Next.js App)  │     │  (PostgreSQL)   │     │  (環境変数)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Cloud Build    │
│  (CI/CD)        │
└─────────────────┘
```

## セットアップ手順

### 1. GCPプロジェクトの設定

```bash
# プロジェクトIDを設定
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com
```

### 2. Cloud SQL (PostgreSQL) の作成

```bash
# Cloud SQLインスタンスを作成
gcloud sql instances create calendar-booking-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast1 \
  --storage-type=SSD \
  --storage-size=10GB

# データベースを作成
gcloud sql databases create calendar_booking \
  --instance=calendar-booking-db

# ユーザーを作成
gcloud sql users create app_user \
  --instance=calendar-booking-db \
  --password=YOUR_SECURE_PASSWORD
```

### 3. Secret Manager で環境変数を管理

```bash
# 各シークレットを作成
echo -n "postgresql://app_user:PASSWORD@/calendar_booking?host=/cloudsql/PROJECT_ID:asia-northeast1:calendar-booking-db" | \
  gcloud secrets create DATABASE_URL --data-file=-

echo -n "your-nextauth-secret-key" | \
  gcloud secrets create NEXTAUTH_SECRET --data-file=-

echo -n "https://your-domain.run.app" | \
  gcloud secrets create NEXTAUTH_URL --data-file=-

# Google OAuth用
echo -n "your-google-client-id" | \
  gcloud secrets create GOOGLE_CLIENT_ID --data-file=-

echo -n "your-google-client-secret" | \
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

# その他の環境変数も同様に設定
```

### 4. Cloud Runサービスアカウントの権限設定

```bash
# サービスアカウントにSecret Managerへのアクセス権を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Cloud SQLへの接続権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### 5. 手動デプロイ（初回）

```bash
# Dockerイメージをビルド
docker build -t gcr.io/$PROJECT_ID/calendar-booking .

# Container Registryにプッシュ
docker push gcr.io/$PROJECT_ID/calendar-booking

# Cloud Runにデプロイ
gcloud run deploy calendar-booking \
  --image gcr.io/$PROJECT_ID/calendar-booking \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --add-cloudsql-instances $PROJECT_ID:asia-northeast1:calendar-booking-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --set-secrets NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest \
  --set-secrets NEXTAUTH_URL=NEXTAUTH_URL:latest \
  --set-secrets GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest \
  --set-secrets GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### 6. Cloud Build による自動デプロイ（CI/CD）

#### GitHub連携の設定

1. GCPコンソールで「Cloud Build」→「トリガー」に移動
2. 「トリガーを作成」をクリック
3. GitHubリポジトリを接続
4. トリガーの設定:
   - **名前**: `deploy-to-cloud-run`
   - **イベント**: `ブランチにプッシュ`
   - **ブランチ**: `^main$`
   - **構成ファイル**: `cloudbuild.yaml`

#### トリガーの置換変数を設定

```
_SERVICE_NAME: calendar-booking
_REGION: asia-northeast1
```

### 7. データベースマイグレーション

Cloud Runにデプロイ後、マイグレーションを実行する必要があります。

```bash
# Cloud Run Jobsを使用してマイグレーションを実行
gcloud run jobs create migrate-database \
  --image gcr.io/$PROJECT_ID/calendar-booking \
  --region asia-northeast1 \
  --add-cloudsql-instances $PROJECT_ID:asia-northeast1:calendar-booking-db \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --command "npx" \
  --args "prisma,migrate,deploy"

# ジョブを実行
gcloud run jobs execute migrate-database --region asia-northeast1
```

## 環境変数一覧

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL接続文字列 | ✅ |
| `NEXTAUTH_SECRET` | NextAuth暗号化キー | ✅ |
| `NEXTAUTH_URL` | アプリケーションURL | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | ✅ |
| `SMTP_HOST` | SMTPサーバーホスト | ❌ |
| `SMTP_PORT` | SMTPサーバーポート | ❌ |
| `SMTP_USER` | SMTP認証ユーザー | ❌ |
| `SMTP_PASSWORD` | SMTP認証パスワード | ❌ |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | ❌ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ❌ |
| `TWILIO_PHONE_NUMBER` | Twilio電話番号 | ❌ |

## トラブルシューティング

### ビルドが失敗する場合

```bash
# ビルドログを確認
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Cloud Runのログを確認

```bash
# ログをストリーミング
gcloud run services logs read calendar-booking --region asia-northeast1

# または GCPコンソールの「Cloud Logging」で確認
```

### データベース接続エラー

1. Cloud SQLインスタンスが起動しているか確認
2. Cloud Runサービスアカウントに`cloudsql.client`ロールがあるか確認
3. `--add-cloudsql-instances`フラグが正しく設定されているか確認

### 「502 Bad Gateway」エラー

- アプリケーションが8080ポートでリッスンしているか確認
- ヘルスチェックが通っているか確認
- メモリ不足の可能性があるため、メモリを増やす

## コスト最適化

### Cloud Run
- `--min-instances 0`: リクエストがない時はインスタンスを0にスケールダウン
- `--max-instances 10`: 最大インスタンス数を制限

### Cloud SQL
- 開発環境: `db-f1-micro`（共有CPU、0.6GB RAM）
- 本番環境: `db-custom-1-3840`（1 vCPU、3.75GB RAM）以上を推奨

## カスタムドメインの設定

```bash
# カスタムドメインをマッピング
gcloud run domain-mappings create \
  --service calendar-booking \
  --domain your-domain.com \
  --region asia-northeast1
```

DNSレコードの設定:
1. GCPコンソールで表示されるIPアドレスを確認
2. ドメインのDNS設定でAレコードまたはCNAMEレコードを追加

## セキュリティのベストプラクティス

1. **シークレット管理**: 環境変数は必ずSecret Managerで管理
2. **最小権限の原則**: サービスアカウントには必要最小限の権限のみ付与
3. **HTTPS強制**: Cloud Runはデフォルトでhttpsを使用
4. **Cloud Armor**: 必要に応じてWAFを設定

## 参考リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [Cloud Build ドキュメント](https://cloud.google.com/build/docs)
- [Next.js Docker デプロイ](https://nextjs.org/docs/deployment#docker-image)