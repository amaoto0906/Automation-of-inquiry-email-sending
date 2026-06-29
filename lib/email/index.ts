/**
 * メール送信サービス
 * SMTP（SMTP_HOST など）が設定されていれば nodemailer で実送信。
 * 未設定の場合は「モックモード」：サーバーログに出力し、devCode を返す（デモ・開発用）。
 */

const SENDER = process.env.MAIL_FROM || "Outreach Hub <no-reply@outreach-hub.jp>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

interface SendResult {
  ok: boolean;
  mock: boolean;
  error?: string;
}

async function sendMail(to: string, subject: string, text: string, html: string): Promise<SendResult> {
  if (!isEmailConfigured()) {
    // モックモード：実送信せずログ出力
    console.log("\n──────── [MOCK MAIL] ────────");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("─────────────────────────────\n");
    return { ok: true, mock: true };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({ from: SENDER, to, subject, text, html });
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
