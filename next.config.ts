import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker/Cloud Run用: スタンドアロン出力を有効化
  // これにより、node_modulesを含まない最小限のサーバーが生成されます
  output: "standalone",

  // 実験的機能
  experimental: {
    // サーバーアクションを有効化
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // 画像最適化設定
  images: {
    // 外部画像ドメインを許可する場合はここに追加
    remotePatterns: [],
    // Cloud Runではunoptimizedを推奨
    unoptimized: process.env.NODE_ENV === "production",
  },

  // 環境変数のバリデーション（ビルド時）
  env: {
    // クライアント側で使用する環境変数を明示的に設定
  },

  // ヘッダー設定
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
