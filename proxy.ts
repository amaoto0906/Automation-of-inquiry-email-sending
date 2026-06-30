import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

const publicPaths = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/auth/resend",
  "/api/auth/password-reset",
];

// 管理者専用ページ（メンバーはダッシュボードへリダイレクト）
const adminPagePaths = ["/users", "/settings", "/sheet-sync"];
// 管理者専用API（メンバーは403）
const adminApiPaths = ["/api/sheet-sync", "/api/password-resets", "/api/settings", "/api/email-changes"];

// CORS: 環境変数 CORS_ALLOWED_ORIGINS（カンマ区切り、または "*"）で許可オリジンを指定。
// 未設定なら CORS 無効＝同一オリジンのみ許可（このアプリの既定構成）。
// 別オリジンのクライアントから API を呼ぶ場合のみ設定する。
const corsAllowed = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function resolveCorsOrigin(origin: string | null): string | null {
  if (!origin || corsAllowed.length === 0) return null;
  // credentials を伴うため "*" でも実オリジンを反映する（ワイルドカード返却は不可）
  if (corsAllowed.includes("*")) return origin;
  return corsAllowed.includes(origin) ? origin : null;
}

function applyCors(res: NextResponse, origin: string | null): NextResponse {
  const allow = resolveCorsOrigin(origin);
  if (allow) {
    res.headers.set("Access-Control-Allow-Origin", allow);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.append("Vary", "Origin");
  }
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const isApi = pathname.startsWith("/api/");

  // CORS プリフライト（認証前に応答）
  if (isApi && request.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }), origin);
  }

  // API レスポンスにのみ CORS ヘッダを付与するためのラッパー
  const withCors = (res: NextResponse) => (isApi ? applyCors(res, origin) : res);

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return withCors(NextResponse.next());
  }

  const token = request.cookies.get("session")?.value;
  if (!token) {
    // API は HTML リダイレクトではなく 401 を返す（クライアントが正しく扱えるように）
    if (isApi) {
      return withCors(
        NextResponse.json({ error: "認証が必要です。ログインしてください。" }, { status: 401 }),
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await verifySession(token);
  if (!user) {
    if (isApi) {
      const res = NextResponse.json(
        { error: "セッションが無効です。再度ログインしてください。" },
        { status: 401 },
      );
      res.cookies.delete("session");
      return withCors(res);
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  // 権限チェック：管理者以外は管理者専用領域へアクセス不可
  if (user.role !== "admin") {
    const isAdminPage = adminPagePaths.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (isAdminPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const isAdminApi = adminApiPaths.some((p) => pathname.startsWith(p));
    if (isAdminApi) {
      return withCors(
        NextResponse.json({ error: "この操作には管理者権限が必要です" }, { status: 403 }),
      );
    }
  }

  return withCors(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:webp|png|jpg|jpeg|svg|gif|ico|css|js)$).*)",
  ],
};
