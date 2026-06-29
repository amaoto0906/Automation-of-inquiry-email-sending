import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, logActivity } from "@/lib/api-helpers";
import { sendApprovalEmail } from "@/lib/email";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const { id } = await params;
  const { action, reason } = await request.json();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  if (target.status !== "pending") {
    return NextResponse.json({ error: "このユーザーは承認待ち状態ではありません。" }, { status: 400 });
  }

  if (action === "approve") {
    const user = await prisma.user.update({
      where: { id },
      data: { status: "active", isActive: true, approvedAt: new Date() },
      select: { id: true, name: true, email: true, status: true },
    });
    await logActivity(admin.id, "user_approved", id, `ユーザー「${user.name}」を承認`);
    await sendApprovalEmail(user.email, user.name, true);
    return NextResponse.json({ ok: true, user });
  }

  if (action === "reject") {
    const user = await prisma.user.update({
      where: { id },
      data: { status: "rejected", isActive: false, rejectedReason: reason || null },
      select: { id: true, name: true, email: true, status: true },
    });
    await logActivity(admin.id, "user_rejected", id, `ユーザー「${user.name}」を却下${reason ? `（${reason}）` : ""}`);
    await sendApprovalEmail(user.email, user.name, false, reason);
    return NextResponse.json({ ok: true, user });
  }

  return NextResponse.json({ error: "action は approve または reject を指定してください。" }, { status: 400 });
}
