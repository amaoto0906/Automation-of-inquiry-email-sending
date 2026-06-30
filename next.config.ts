import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // 開発サーバー（next dev）に別ホスト/IPからアクセスする際の許可オリジン。
  // 例: ALLOWED_DEV_ORIGINS="103.179.45.133,outreach.example.com"
  // 本番（next start）では無関係。未設定なら制限なしの既定動作。
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // バンドル削減：アイコン/日付ライブラリをツリーシェイク（barrel import を直接 import に変換）
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // 使用する品質値を明示（Next 16 は qualities 未指定だと既定 [75] 以外で警告）
    qualities: [60, 75],
    // 生成済みビジュアルは内容が変わらないため長期キャッシュ
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  // 静的アセット（背景画像・3Dビジュアル）を不変キャッシュにして再訪時の読込を高速化
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
