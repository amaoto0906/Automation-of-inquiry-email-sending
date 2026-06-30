import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, logActivity } from "@/lib/api-helpers";

// メールアドレス変更の承認（管理者のみ）。対象ユーザーのメールを更新します。
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;

  const req = await prisma.emailChangeRequest.findUnique({
    where: { id },
    select: { id: true, status: true, newEmail: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!req) return NextResponse.json({ error: "申請が見つかりません。" }, { status: 404 });
  if (req.status !== "pending") {
    return NextResponse.json({ error: "この申請は既に処理済みです。" }, { status: 409 });
  }

  // 承認時点で新メールが他者に取得されていないか再確認
  const taken = await prisma.user.findUnique({ where: { email: req.newEmail } });
  if (taken && taken.id !== req.user.id) {
    return NextResponse.json({ error: "この新しいメールアドレスは既に使用されています。" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user.id }, data: { email: req.newEmail } }),
    prisma.emailChangeRequest.update({
      where: { id },
      data: { status: "completed", resolvedAt: new Date(), resolvedById: admin.id },
    }),
  ]);

  await logActivity(admin.id, "email_change_approved", req.user.id, `「${req.user.name}」のメールを ${req.user.email} → ${req.newEmail} に変更`);

  return NextResponse.json({ ok: true, name: req.user.name, newEmail: req.newEmail });
}

// 申請の却下（管理者のみ・変更せず取り下げ）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;

  await prisma.emailChangeRequest.deleteMany({ where: { id, status: "pending" } });
  await logActivity(admin.id, "email_change_dismissed", id, "メールアドレス変更申請を却下");
  return NextResponse.json({ ok: true });
}
