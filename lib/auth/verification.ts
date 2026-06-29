import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  // 6桁（000000〜999999）。先頭ゼロを保持。
  let n = 0;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  n = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(n % 1000000).padStart(6, "0");
}

/** 新しい認証コードを発行し、既存の未使用コードは無効化。生成した平文コードを返す。 */
export async function issueVerificationCode(email: string): Promise<string> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  // 同一メールの未使用コードを消費済みにする
  await prisma.verificationCode.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.verificationCode.create({
    data: {
      email,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    },
  });
  return code;
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
