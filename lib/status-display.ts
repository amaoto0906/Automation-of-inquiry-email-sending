import { statusLabels } from "@/lib/types";
import type { OutreachStatus } from "@/lib/types";

/**
 * バックエンド（Prisma）の status 文字列を、画面表示用の OutreachStatus へ正規化するヘルパー。
 * モデルごとに status の語彙が異なる（SendLog は success/failed、ContactPage は hasForm 等）ため、
 * 表示（StatusBadge）に渡す前にここで一元的に変換する。
 */

const KNOWN = new Set<string>(Object.keys(statusLabels));

/** 既知の OutreachStatus ならそのまま、未知なら fallback を返す */
export function asOutreachStatus(raw: string | null | undefined, fallback: OutreachStatus = "pending"): OutreachStatus {
  return raw && KNOWN.has(raw) ? (raw as OutreachStatus) : fallback;
}

// SendLog.status（success | failed | manual_check | captcha | excluded | dry_run）→ 表示用
const SEND_LOG_MAP: Record<string, OutreachStatus> = {
  success: "sent",
  failed: "failed",
  manual_check: "manual_check",
  captcha: "captcha_detected",
  excluded: "excluded",
  dry_run: "pending",
};

export function sendLogStatus(raw: string): OutreachStatus {
  return SEND_LOG_MAP[raw] ?? asOutreachStatus(raw);
}

/**
 * ContactPage の表示ステータス。
 * status が既知の値ならそれを優先し、未設定（pending）の場合は hasForm から推定する。
 */
export function contactPageStatus(p: { status: string; hasForm: boolean; requiresManualCheck?: boolean }): OutreachStatus {
  if (p.status === "manual_check" || p.requiresManualCheck) return "manual_check";
  if (p.status && p.status !== "pending" && KNOWN.has(p.status)) return p.status as OutreachStatus;
  return p.hasForm ? "form_found" : "no_form";
}
