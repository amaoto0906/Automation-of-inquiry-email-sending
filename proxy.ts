import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

const publicPaths = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify",
  "/api/auth/resend",
];

// 管理者専用ページ（メンバーはダッシュボードへリダイレクト）
const adminPagePaths = ["/users", "/settings", "/sheet-sync"];
// 管理者専用API（メンバーは403）
const adminApiPaths = ["/api/sheet-sync"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await verifySession(token);
  if (!user) {
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
      return NextResponse.json(
        { error: "この操作には管理者権限が必要です" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:webp|png|jpg|jpeg|svg|gif|ico|css|js)$).*)",
  ],
};
