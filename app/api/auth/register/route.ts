import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { issueVerificationCode } from "@/lib/auth/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company, department, position, phone } = body ?? {};

    if (!email || !password || !name || !company) {
      return NextResponse.json({ error: "氏名・会社名・メールアドレス・パスワードは必須です。" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上で入力してください。" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません。" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.status === "rejected") {
        return NextResponse.json({ error: "このメールアドレスは登録できません。管理者にお問い合わせください。" }, { status: 409 });
      }
      // 認証未完了なら情報を更新して再送可能にする
      if (existing.status === "pending_verification") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { name, company, department, position, phone, passwordHash: await hashPassword(password) },
        });
        const { code, expiresAt } = await issueVerificationCode(email);
        const sent = await sendVerificationEmail(email, code);
        if (!sent.ok && !sent.mock) return mailFailed();
        return NextResponse.json({
          ok: true,
          email,
          expiresAt: expiresAt.toISOString(),
          devCode: sent.mock ? code : undefined,
        });
      }
      return NextResponse.json({ error: "このメールアドレスは既に登録されています。" }, { status: 409 });
    }

    await prisma.user.create({
      data: {
        email,
        name,
        company,
        department: department || null,
        position: position || null,
        phone: phone || null,
        passwordHash: await hashPassword(password),
        role: "member",
        status: "pending_verification",
        emailVerified: false,
        isActive: false,
      },
    });

    const { code, expiresAt } = await issueVerificationCode(email);
    const sent = await sendVerificationEmail(email, code);
    if (!sent.ok && !sent.mock) return mailFailed();

    return NextResponse.json({
      ok: true,
      email,
      expiresAt: expiresAt.toISOString(),
      // モックモード（SMTP未設定）の場合のみ、デモ用にコードを返す。実送信時は返さない。
      devCode: sent.mock ? code : undefined,
    });
  } catch (err) {
    console.error("登録エラー:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}

// SMTP実送信に失敗したときの共通レスポンス（コードを発行済みでもメールが届かないため明示エラーにする）
function mailFailed() {
  return NextResponse.json(
    { error: "確認コードのメール送信に失敗しました。管理者のSMTP設定（ホスト・ポート・ユーザー・パスワード）をご確認ください。" },
    { status: 502 },
  );
}
