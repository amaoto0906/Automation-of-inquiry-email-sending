import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// パスワードリセット申請（未ログインから利用可能）。
// 申請内容は管理者へ通知され、管理者が確認のうえリセットを実行します。
// メール存在の有無は秘匿し、常に同じメッセージを返します。
const GENERIC_MESSAGE = "パスワードリセットの依頼を受け付けました。管理者が確認後、パスワードを再設定します。";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "メールアドレスを入力してください。" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true, status: true },
    });

    // 利用可能（承認済み）なアカウントのみ申請を受理。存在しなくても同じ応答。
    if (user && user.status === "active") {
      const existing = await prisma.passwordResetRequest.findFirst({
        where: { userId: user.id, status: "pending" },
        select: { id: true },
      });
      if (!existing) {
        await prisma.passwordResetRequest.create({ data: { userId: user.id } });
      }
    }

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (err) {
    console.error("パスワードリセット申請エラー:", err);
    return NextResponse.json({ message: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
