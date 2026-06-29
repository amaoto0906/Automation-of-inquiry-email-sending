import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCode } from "@/lib/auth/verification";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: "メールアドレスと確認コードを入力してください。" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "pending_verification") {
      return NextResponse.json({ error: "認証対象の登録が見つかりません。" }, { status: 404 });
    }

    const result = await verifyCode(email, String(code).trim());
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    // メール認証完了 → 管理者承認待ちへ
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, status: "pending" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("認証エラー:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
