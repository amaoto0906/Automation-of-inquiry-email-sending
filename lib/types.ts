export type OutreachStatus =
  | "pending"
  | "contact_page_found"
  | "form_found"
  | "no_form"
  | "captcha_detected"
  | "manual_check"
  | "excluded"
  | "approved"
  | "sent"
  | "failed"
  | "sheet_synced"
  | "sheet_sync_failed";

export const statusLabels: Record<OutreachStatus, string> = {
  pending: "処理待ち",
  contact_page_found: "問い合わせ先検出",
  form_found: "フォーム検出",
  no_form: "フォームなし",
  captcha_detected: "CAPTCHA検出",
  manual_check: "手動確認",
  excluded: "除外済み",
  approved: "承認済み",
  sent: "送信成功",
  failed: "送信失敗",
  sheet_synced: "同期済み",
  sheet_sync_failed: "同期失敗",
};

export const statusTone: Record<OutreachStatus, string> = {
  pending: "neutral",
  contact_page_found: "info",
  form_found: "cyan",
  no_form: "neutral",
  captcha_detected: "warning",
  manual_check: "warning",
  excluded: "muted",
  approved: "indigo",
  sent: "success",
  failed: "danger",
  sheet_synced: "success",
  sheet_sync_failed: "danger",
};
