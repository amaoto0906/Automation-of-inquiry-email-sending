import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "処理待ち",
  contact_page_found: "問い合わせページ検出",
  form_found: "フォーム検出",
  no_form: "フォームなし",
  captcha_detected: "CAPTCHAあり",
  manual_check: "手動確認",
  excluded: "除外対象",
  approved: "確認済み",
  sent: "送信済み",
  failed: "送信失敗",
  success: "成功",
  dry_run: "テスト送信",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  contact_page_found: "bg-purple-100 text-purple-800",
  form_found: "bg-indigo-100 text-indigo-800",
  no_form: "bg-gray-100 text-gray-600",
  captcha_detected: "bg-orange-100 text-orange-800",
  manual_check: "bg-yellow-100 text-yellow-800",
  excluded: "bg-gray-200 text-gray-500",
  approved: "bg-cyan-100 text-cyan-800",
  sent: "bg-green-100 text-green-800",
  success: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  dry_run: "bg-slate-100 text-slate-700",
};
