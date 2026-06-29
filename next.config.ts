import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // バンドル削減：アイコン/日付ライブラリをツリーシェイク（barrel import を直接 import に変換）
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
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
