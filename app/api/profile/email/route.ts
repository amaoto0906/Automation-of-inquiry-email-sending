import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";
import { issueVerificationCode, verifyCode } from "@/lib/auth/verification";
import { sendEmailChangeVerification } from "@/lib/email";
import { createSession, setSessionCookie } from "@/lib/auth/session";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * メールアドレス変更フロー（ログインユーザー本人）。
 * action="request": 新しいメールに確認コードを送信。
 * action="verify":  コード検証後、管理者は即時更新、一般ユーザーは管理者承認の申請を作成。
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string;
  const newEmail = String(body?.newEmail ?? "").trim();

  if (!EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません。" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.id } });
  if (!me) return unauthorized();
  if (newEmail === me.email) {
    return NextResponse.json({ error: "現在のメールアドレスと同じです。" }, { status: 400 });
  }
  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています。" }, { status: 409 });
  }

  if (action === "request") {
    const { code } = await issueVerificationCode(newEmail);
    const sent = await sendEmailChangeVerification(newEmail, code);
    if (!sent.ok && !sent.mock) {
      return NextResponse.json(
        { error: "確認コードのメール送信に失敗しました。SMTP設定をご確認ください。" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, devCode: sent.mock ? code : undefined });
  }

  if (action === "verify") {
    const code = String(body?.code ?? "").trim();
    if (!code) return NextResponse.json({ error: "確認コードを入力してください。" }, { status: 400 });

    const result = await verifyCode(newEmail, code);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

    // 念のため再確認（検証中に他者が取得していないか）
    const stillFree = await prisma.user.findUnique({ where: { email: newEmail } });
    if (stillFree) return NextResponse.json({ error: "このメールアドレスは既に使用されています。" }, { status: 409 });

    if (me.role === "admin") {
      // 管理者は即時更新し、セッションを再発行
      const updated = await prisma.user.update({ where: { id: me.id }, data: { email: newEmail } });
      await logActivity(me.id, "email_changed", me.id, `メールアドレスを ${me.email} → ${newEmail} に変更`);
      const token = await createSession({ id: updated.id, email: updated.email, name: updated.name, role: updated.role });
      await setSessionCookie(token);
      return NextResponse.json({ ok: true, updated: true, email: newEmail });
    }

    // 一般ユーザーは管理者承認の申請を作成（既存の保留申請は置き換え）
    await prisma.emailChangeRequest.updateMany({
      where: { userId: me.id, status: "pending" },
      data: { status: "completed", resolvedAt: new Date() },
    });
    await prisma.emailChangeRequest.create({ data: { userId: me.id, newEmail } });
    await logActivity(me.id, "email_change_requested", me.id, `メールアドレス変更を申請（→ ${newEmail}）`);
    return NextResponse.json({ ok: true, requested: true });
  }

  return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
}
