import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode, getResendWaitSeconds } from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "メールアドレスを入力してください。" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "pending_verification") {
      return NextResponse.json({ error: "認証対象の登録が見つかりません。" }, { status: 404 });
    }

    // 連打・乱用防止のクールダウン（直近の発行から60秒）
    const wait = await getResendWaitSeconds(email);
    if (wait > 0) {
      return NextResponse.json(
        { error: `確認コードの再送信は約${wait}秒後に可能です。`, retryAfter: wait },
        { status: 429 },
      );
    }

    const { code, expiresAt } = await issueVerificationCode(email);
    const sent = await sendVerificationEmail(email, code);
    if (!sent.ok && !sent.mock) {
      return NextResponse.json(
        { error: "確認コードのメール送信に失敗しました。管理者のSMTP設定をご確認ください。" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      expiresAt: expiresAt.toISOString(),
      devCode: sent.mock ? code : undefined,
    });
  } catch (err) {
    console.error("再送信エラー:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
