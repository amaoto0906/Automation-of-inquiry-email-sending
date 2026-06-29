"use client";

import { useId } from "react";

/**
 * Outreach Hub ロゴマーク
 * 「送信＝アウトリーチ」を表すペーパープレーン＋発信ノードを、
 * ブランドグラデーションのスクワークル（角丸正方形）に配置したカスタムマーク。
 */
export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  const raw = useId().replace(/[:]/g, "");
  const grad = `og-${raw}`;
  const sheen = `os-${raw}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={`logo-mark ${className}`}
      role="img"
      aria-label="Outreach Hub"
    >
      <defs>
        <linearGradient id={grad} x1="3" y1="2" x2="37" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f8df9" />
          <stop offset="0.52" stopColor="#2563eb" />
          <stop offset="1" stopColor="#0ea5c4" />
        </linearGradient>
        <linearGradient id={sheen} x1="20" y1="0" x2="20" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* スクワークル本体 */}
      <rect width="40" height="40" rx="12" fill={`url(#${grad})`} />
      {/* 上部の光沢 */}
      <rect width="40" height="40" rx="12" fill={`url(#${sheen})`} />

      {/* 発信の軌道（アウトリーチの広がり） */}
      <circle cx="11.5" cy="28.5" r="1.9" fill="#86efc5" />

      {/* ペーパープレーン（送信） — 2トーン */}
      <path
        d="M30.6 9.8 L10.2 18.4 a0.9 0.9 0 0 0 0.05 1.7 L18.3 21.4 Z"
        fill="#ffffff"
        strokeLinejoin="round"
      />
      <path
        d="M30.6 9.8 L18.3 21.4 L20.4 30.2 a0.9 0.9 0 0 0 1.66 0.14 Z"
        fill="#cfe4ff"
        strokeLinejoin="round"
      />
    </svg>
  );
}
