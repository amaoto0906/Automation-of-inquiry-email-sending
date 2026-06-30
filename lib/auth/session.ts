import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * セッション署名鍵を解決する。本番で未設定・プレースホルダのままの場合は警告する
 * （ビルドを止めないよう throw はしないが、安全でない値はログで明示する）。
 */
function resolveSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  const insecure =
    !value || value.length < 16 || value.includes("change") || value.includes("your-random");
  if (insecure && process.env.NODE_ENV === "production") {
    console.error(
      "[security] SESSION_SECRET が未設定、または安全でない値です。`openssl rand -base64 32` で生成した強固な値を環境変数に設定してください。",
    );
  }
  return new TextEncoder().encode(value || "dev-only-insecure-secret-change-me");
}

const secret = resolveSecret();

/**
 * Cookie の Secure 属性を決定する。
 * - COOKIE_SECURE=true / false で明示指定（HTTP で公開するデモ環境では false）
 * - 未指定なら NODE_ENV=production のとき true（= HTTPS 前提）
 * HTTP で Secure Cookie を発行するとブラウザが保存せず、ログインが無限ループになるため
 * 平文 HTTP で公開する場合は必ず COOKIE_SECURE=false を設定すること。
 */
function cookieSecure(): boolean {
  const v = (process.env.COOKIE_SECURE ?? "").toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return process.env.NODE_ENV === "production";
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

export async function verifySession(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
