import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;

function generateCode(): string {
  // 6桁（000000〜999999）。先頭ゼロを保持。
  let n = 0;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  n = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(n % 1000000).padStart(6, "0");
}

/**
 * 新しい認証コードを発行し、既存の未使用コードは無効化。
 * 生成した平文コードと有効期限（10分後）を返す。平文コードはメール送信用で、DBには保存しない。
 */
export async function issueVerificationCode(
  email: string,
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  // 同一メールの未使用コードを消費済みにする
  await prisma.verificationCode.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
  await prisma.verificationCode.create({
    data: { email, codeHash, expiresAt },
  });
  return { code, expiresAt };
}

/**
 * 直近のコード発行からの経過時間に基づき、再送信が可能になるまでの残り秒数を返す。
 * 0 なら即時再送信可。短時間の連打・メール爆撃の抑止に使う。
 */
export async function getResendWaitSeconds(email: string): Promise<number> {
  const last = await prisma.verificationCode.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return 0;
  const elapsedSec = (Date.now() - last.createdAt.getTime()) / 1000;
  const remaining = Math.ceil(RESEND_COOLDOWN_SEC - elapsedSec);
  return remaining > 0 ? remaining : 0;
}

type VerifyResult = { ok: true } | { ok: false; reason: string };

/** コードを検証。成功時は consumed にする。 */
export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const record = await prisma.verificationCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, reason: "確認コードが見つかりません。再送信してください。" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "確認コードの有効期限が切れています。再送信してください。" };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "試行回数の上限に達しました。コードを再送信してください。" };

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: record.attempts + 1 } });
    return { ok: false, reason: `確認コードが正しくありません（残り ${MAX_ATTEMPTS - record.attempts - 1} 回）。` };
  }

  await prisma.verificationCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
