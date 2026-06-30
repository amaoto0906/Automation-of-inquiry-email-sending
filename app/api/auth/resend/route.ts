import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "メールアドレスを入力してください。" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "pending_verification") {
      return NextResponse.json({ error: "認証対象の登録が見つかりません。" }, { status: 404 });
    }

    const code = await issueVerificationCode(email);
    const sent = await sendVerificationEmail(email, code);
    return NextResponse.json({ ok: true, devCode: sent.mock ? code : undefined });
  } catch (err) {
    console.error("再送信エラー:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
