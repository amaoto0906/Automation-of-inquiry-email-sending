import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    if (!user) {
      return NextResponse.json({ message: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    await prisma.loginLog.create({ data: { userId: user.id, success: valid, ipAddress: ip } });

    if (!valid) {
      return NextResponse.json({ message: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    // アカウント状態のチェック（パスワード照合後に状態別メッセージを返す）
    if (user.status === "pending_verification") {
      return NextResponse.json({ message: "メールアドレスの確認が完了していません。登録時に届いた確認コードで認証してください。" }, { status: 403 });
    }
    if (user.status === "pending") {
      return NextResponse.json({ message: "アカウントは管理者の承認待ちです。承認後にログインできます。" }, { status: 403 });
    }
    if (user.status === "rejected") {
      return NextResponse.json({ message: "この登録は承認されませんでした。管理者にお問い合わせください。" }, { status: 403 });
    }
    if (!user.isActive || user.status !== "active") {
      return NextResponse.json({ message: "このアカウントは現在利用できません。管理者にお問い合わせください。" }, { status: 403 });
    }

    const token = await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error("ログインエラー:", err);
    return NextResponse.json({ message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
