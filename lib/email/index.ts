/**
 * メール送信サービス
 * SMTP（SMTP_HOST など）が設定されていれば nodemailer で実送信。
 * 未設定の場合は「モックモード」：サーバーログに出力し、devCode を返す（デモ・開発用）。
 */

import { getSetting, getSettingOr } from "@/lib/settings";

/** ホスト名らしき文字列か（メールアドレスや空白の誤入力を弾く） */
function looksLikeHostname(host: string): boolean {
  return host.length > 0 && !/[@\s]/.test(host);
}

/** SMTPホストとユーザーが設定されていれば実送信可能（DB設定→env） */
export async function isEmailConfigured(): Promise<boolean> {
  const [host, user] = await Promise.all([getSetting("SMTP_HOST"), getSetting("SMTP_USER")]);
  return Boolean(host && user);
}

interface SendResult {
  ok: boolean;
  mock: boolean;
  error?: string;
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<SendResult> {
  const [hostRaw, user, pass, portRaw, secure, fromSetting] = await Promise.all([
    getSetting("SMTP_HOST"),
    getSetting("SMTP_USER"),
    getSetting("SMTP_PASS"),
    getSettingOr("SMTP_PORT", "587"),
    getSettingOr("SMTP_SECURE", "false"),
    getSetting("MAIL_FROM"),
  ]);
  const host = hostRaw?.trim() ?? null;

  if (!host || !user) {
    // モックモード（SMTP未設定）：実送信せずログ出力
    console.log("\n──────── [MOCK MAIL] ────────");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("─────────────────────────────\n");
    return { ok: true, mock: true };
  }

  // SMTPホストの形式チェック（メールアドレスの誤入力などを明確なエラーにする）
  if (!looksLikeHostname(host)) {
    const error = `SMTPホストの形式が正しくありません（"${host}"）。"smtp.gmail.com" のようなホスト名を指定してください（メールアドレスは「SMTPユーザー」欄に入力します）。`;
    console.error("メール送信エラー:", error);
    return { ok: false, mock: false, error };
  }

  // ポートとTLSの正規化。465番は暗黙TLSなので secure を自動でON。
  const portNum = Number.parseInt(portRaw, 10);
  const port = Number.isFinite(portNum) && portNum > 0 ? portNum : 587;
  const useSecure = secure === "true" || port === 465;
  // 差出人は MAIL_FROM。未設定なら認証ユーザー（Gmail等は From を認証ユーザーに一致させる必要がある）。
  const from = (fromSetting && fromSetting.trim()) || user;

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: useSecure,
      auth: { user, pass: pass ?? undefined },
      // 設定ミス時に長く待たされないよう接続タイムアウトを短めに
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    await transport.sendMail({ from, to, subject, text, html });
    return { ok: true, mock: false };
  } catch (err) {
    console.error("メール送信エラー:", err);
    return { ok: false, mock: false, error: String(err) };
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<SendResult> {
  const subject = "【Outreach Hub】メールアドレス確認コード";
  const text = [
    "Outreach Hub をご利用いただきありがとうございます。",
    "",
    `確認コード： ${code}`,
    "",
    "このコードは10分間有効です。登録画面に入力して認証を完了してください。",
    "本メールに心当たりがない場合は破棄してください。",
  ].join("\n");
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#13213b">
      <h2 style="font-size:18px">メールアドレスの確認</h2>
      <p>Outreach Hub の新規登録ありがとうございます。下記の確認コードを登録画面に入力してください。</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:.3em;text-align:center;padding:18px;margin:18px 0;background:#eef4ff;border-radius:12px;color:#2563eb">${code}</div>
      <p style="color:#5a6783;font-size:13px">このコードは10分間有効です。本メールに心当たりがない場合は破棄してください。</p>
    </div>`;
  return sendMail(to, subject, text, html);
}

export async function sendEmailChangeVerification(to: string, code: string): Promise<SendResult> {
  const subject = "【Outreach Hub】メールアドレス変更の確認コード";
  const text = [
    "メールアドレスの変更リクエストを受け付けました。",
    "",
    `確認コード： ${code}`,
    "",
    "このコードは10分間有効です。変更画面に入力して認証を完了してください。",
    "心当たりがない場合は、このメールを破棄してください（変更は行われません）。",
  ].join("\n");
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#13213b">
      <h2 style="font-size:18px">メールアドレス変更の確認</h2>
      <p>新しいメールアドレスの確認のため、下記のコードを変更画面に入力してください。</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:.3em;text-align:center;padding:18px;margin:18px 0;background:#eef4ff;border-radius:12px;color:#2563eb">${code}</div>
      <p style="color:#5a6783;font-size:13px">このコードは10分間有効です。心当たりがない場合は破棄してください。</p>
    </div>`;
  return sendMail(to, subject, text, html);
}

export async function sendApprovalEmail(to: string, name: string, approved: boolean, reason?: string): Promise<SendResult> {
  if (approved) {
    const subject = "【Outreach Hub】アカウントが承認されました";
    const text = `${name} 様\n\nアカウントが管理者によって承認されました。ログインしてご利用いただけます。\n\nログイン: ${process.env.APP_URL || "http://localhost:3000"}/login`;
    const html = `<div style="font-family:sans-serif;padding:24px;color:#13213b"><h2>アカウントが承認されました</h2><p>${name} 様<br>管理者の承認が完了しました。ログインしてご利用いただけます。</p></div>`;
    return sendMail(to, subject, text, html);
  }
  const subject = "【Outreach Hub】登録申請の結果について";
  const text = `${name} 様\n\n誠に恐れ入りますが、今回の登録申請は承認されませんでした。\n${reason ? `理由: ${reason}\n` : ""}ご不明な点は管理者までお問い合わせください。`;
  const html = `<div style="font-family:sans-serif;padding:24px;color:#13213b"><h2>登録申請の結果</h2><p>${name} 様<br>恐れ入りますが、今回の登録申請は承認されませんでした。</p>${reason ? `<p style="color:#5a6783">理由：${reason}</p>` : ""}</div>`;
  return sendMail(to, subject, text, html);
}
