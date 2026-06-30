import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, logActivity } from "@/lib/api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;
  const body = await request.json();

  // 無効化（isActive=false）時のガード：自分自身・最後の有効な管理者は無効化不可
  if (body.isActive === false) {
    if (id === admin.id) {
      return NextResponse.json({ error: "ご自身のアカウントは無効化できません。" }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "admin") {
      const activeAdmins = await prisma.user.count({ where: { role: "admin", status: "active", isActive: true } });
      if (activeAdmins <= 1) {
        return NextResponse.json({ error: "最後の有効な管理者は無効化できません。" }, { status: 400 });
      }
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name: body.name, role: body.role, isActive: body.isActive },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  await logActivity(admin.id, "user_updated", id, `ユーザー「${user.name}」を更新`);
  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;

  // ガード：自分自身・最後の管理者は削除不可
  if (id === admin.id) {
    return NextResponse.json({ error: "ご自身のアカウントは削除できません。" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true, role: true } });
  if (!target) return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  if (target.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "最後の管理者は削除できません。" }, { status: 400 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // このユーザーが作成したキーワード配下の連絡先ページを特定
      const kws = await tx.keyword.findMany({ where: { createdById: id }, select: { id: true } });
      const kwIds = kws.map((k) => k.id);
      let cpIds: string[] = [];
      if (kwIds.length) {
        const srs = await tx.searchResult.findMany({ where: { keywordId: { in: kwIds } }, select: { id: true } });
        const srIds = srs.map((s) => s.id);
        if (srIds.length) {
          const cps = await tx.contactPage.findMany({ where: { searchResultId: { in: srIds } }, select: { id: true } });
          cpIds = cps.map((c) => c.id);
        }
      }
      // 連絡先ページに紐づく送信・確認履歴（他ユーザー分含む）を先に削除（FK制約回避）
      if (cpIds.length) {
        await tx.reviewAction.deleteMany({ where: { contactPageId: { in: cpIds } } });
        await tx.sendLog.deleteMany({ where: { contactPageId: { in: cpIds } } });
      }
      // ユーザー自身に紐づく記録を削除
      await tx.reviewAction.deleteMany({ where: { userId: id } });
      await tx.sendLog.deleteMany({ where: { userId: id } });
      await tx.loginLog.deleteMany({ where: { userId: id } });
      await tx.activityLog.deleteMany({ where: { userId: id } });
      await tx.verificationCode.deleteMany({ where: { email: target.email } });
      await tx.passwordResetRequest.deleteMany({ where: { userId: id } });
      // キーワード削除（searchResult→contactPage→formField はCascade）
      await tx.keyword.deleteMany({ where: { createdById: id } });
      // 本体
      await tx.user.delete({ where: { id } });
    });
  } catch (err) {
    console.error("ユーザー削除エラー:", err);
    return NextResponse.json({ error: "関連データの整合性により削除できませんでした。" }, { status: 409 });
  }

  await logActivity(admin.id, "user_deleted", id, `ユーザー「${target.name}」を削除`);
  return NextResponse.json({ ok: true });
}
