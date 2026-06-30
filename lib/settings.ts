import { prisma } from "@/lib/prisma";

/**
 * アプリ設定レイヤー。
 * 値は AppSetting テーブル（管理画面から更新可能）を優先し、
 * 未設定の場合は環境変数（.env）→ 既定値の順でフォールバックする。
 * これにより、本番稼働に必要なAPIキー等を再デプロイなしでUIから更新できる。
 */

export type SettingType = "text" | "password" | "textarea" | "number" | "boolean" | "select";
export type SettingGroup = "search" | "sheets" | "sending" | "mail" | "smtp";

export interface SettingField {
  key: string;
  label: string;
  group: SettingGroup;
  type: SettingType;
  secret?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  placeholder?: string;
  default?: string;
}

// UIに表示し、APIで更新を許可する設定項目の一覧
export const SETTING_FIELDS: SettingField[] = [
  {
    key: "SEARCH_PROVIDER", label: "検索プロバイダ", group: "search", type: "select", default: "mock",
    options: [
      { value: "mock", label: "モック（開発・動作確認用）" },
      { value: "serpapi", label: "SerpAPI（本番）" },
    ],
    help: "本番ではSerpAPIを選択し、下のAPIキーを設定してください。",
  },
  {
    key: "SERPAPI_API_KEY", label: "SerpAPI APIキー", group: "search", type: "password", secret: true,
    placeholder: "sk-...", help: "https://serpapi.com/ で発行したAPIキー。",
  },
  {
    key: "GOOGLE_SHEETS_SPREADSHEET_ID", label: "スプレッドシートID", group: "sheets", type: "text",
    placeholder: "1AbC...xyz",
    help: "送信結果を出力するGoogleスプレッドシートのID（URLの /d/ と /edit の間の文字列）。",
  },
  {
    key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", label: "サービスアカウントのメール", group: "sheets", type: "text",
    placeholder: "xxxx@xxxx.iam.gserviceaccount.com",
    help: "このアドレスに対象スプレッドシートの「編集者」権限を付与してください。",
  },
  {
    key: "GOOGLE_PRIVATE_KEY", label: "サービスアカウント秘密鍵", group: "sheets", type: "textarea", secret: true,
    placeholder: "-----BEGIN PRIVATE KEY-----\n...",
    help: "Google CloudのJSONキー内 private_key の値。安全に管理されます。",
  },
  {
    key: "MAIL_FROM", label: "通知メールの差出人", group: "mail", type: "text",
    placeholder: "Outreach Hub <no-reply@example.jp>",
    help: "確認コードや承認通知などのシステムメールの差出人表示。",
  },
  {
    key: "SMTP_HOST", label: "SMTPホスト", group: "smtp", type: "text",
    placeholder: "smtp.example.com",
    help: "設定するとモック表示をやめ、確認コードを実際にメール送信します。",
  },
  {
    key: "SMTP_PORT", label: "SMTPポート", group: "smtp", type: "number", default: "587",
  },
  {
    key: "SMTP_SECURE", label: "SSL/TLS（465番ポート等）", group: "smtp", type: "boolean", default: "false",
    help: "ポート465など暗黙のTLSを使う場合はオン。587（STARTTLS）はオフ。",
  },
  {
    key: "SMTP_USER", label: "SMTPユーザー", group: "smtp", type: "text",
    placeholder: "user@example.com",
  },
  {
    key: "SMTP_PASS", label: "SMTPパスワード", group: "smtp", type: "password", secret: true,
    help: "SMTP認証のパスワード。安全に保管されます。",
  },
  {
    key: "ALLOW_LIVE_SEND", label: "本番送信を有効化", group: "sending", type: "boolean", default: "false",
    help: "オフの間は実送信せず、dry-run（テスト送信・ログのみ）として動作します。本番運用時のみオンにしてください。",
  },
  {
    key: "MAX_SENDS_PER_DAY", label: "1日の送信上限", group: "sending", type: "number", default: "50",
    help: "ユーザーごと・1日あたりの送信上限件数。",
  },
  {
    key: "DEFAULT_SEND_DELAY_SECONDS", label: "送信間隔（秒）", group: "sending", type: "number", default: "5",
    help: "連続送信時に挟む待機秒数。短時間の大量送信を防ぎます。",
  },
];

export const SETTING_FIELD_MAP: Record<string, SettingField> = Object.fromEntries(
  SETTING_FIELDS.map((f) => [f.key, f])
);

/** DB → env → null の順で1件取得 */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (row && row.value !== "") return row.value;
  const env = process.env[key];
  if (env != null && env !== "") return env;
  return null;
}

/** DB → env → fallback の順で取得 */
export async function getSettingOr(key: string, fallback: string): Promise<string> {
  return (await getSetting(key)) ?? fallback;
}

export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key);
  if (raw == null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? fallback : n;
}

export async function getBoolSetting(key: string, fallback = false): Promise<boolean> {
  const raw = await getSetting(key);
  if (raw == null) return fallback;
  return raw === "true";
}

/** 設定の一括更新（既知キーのみ。upsert） */
export async function setSettings(values: Record<string, string>): Promise<void> {
  const ops = Object.entries(values)
    .filter(([key]) => key in SETTING_FIELD_MAP)
    .map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );
  if (ops.length) await prisma.$transaction(ops);
}

/** 設定を削除（DBの値を消去）。env/既定値へフォールバックする。既知キーのみ。 */
export async function deleteSetting(key: string): Promise<void> {
  if (!(key in SETTING_FIELD_MAP)) return;
  await prisma.appSetting.deleteMany({ where: { key } });
}

/** 現在値（DB→env）と、シークレットの設定済み有無を返す（マスク用） */
export async function getSettingsForAdmin(): Promise<{
  values: Record<string, string>;
  secrets: Record<string, boolean>;
}> {
  const values: Record<string, string> = {};
  const secrets: Record<string, boolean> = {};
  for (const f of SETTING_FIELDS) {
    const current = await getSetting(f.key);
    if (f.secret) {
      // シークレットは値を返さず、設定済みかどうかのみ返す
      secrets[f.key] = current != null && current !== "";
    } else {
      values[f.key] = current ?? f.default ?? "";
    }
  }
  return { values, secrets };
}
