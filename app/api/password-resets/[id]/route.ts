import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, logActivity } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth/password";

// 管理者がリセットを実行したときに設定される初期パスワード
const RESET_PASSWORD = "12345678";

// パスワードリセットの実行（管理者のみ）。対象ユーザーのパスワードを初期化します。
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;

  const reset = await prisma.passwordResetRequest.findUnique({
    where: { id },
    select: { id: true, status: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!reset) {
    return NextResponse.json({ error: "申請が見つかりません。" }, { status: 404 });
  }
  if (reset.status !== "pending") {
    return NextResponse.json({ error: "この申請は既に処理済みです。" }, { status: 409 });
  }

  const passwordHash = await hashPassword(RESET_PASSWORD);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.user.id }, data: { passwordHash } }),
    prisma.passwordResetRequest.update({
      where: { id },
      data: { status: "completed", resolvedAt: new Date(), resolvedById: admin.id },
    }),
  ]);

  await logActivity(admin.id, "password_reset", reset.user.id, `「${reset.user.name}」のパスワードをリセット`);

  return NextResponse.json({
    ok: true,
    tempPassword: RESET_PASSWORD,
    user: { name: reset.user.name, email: reset.user.email },
  });
}

// 申請の取り下げ（管理者のみ・リセットせず却下）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;

  await prisma.passwordResetRequest.deleteMany({ where: { id, status: "pending" } });
  await logActivity(admin.id, "password_reset_dismissed", id, "パスワードリセット申請を却下");
  return NextResponse.json({ ok: true });
}
