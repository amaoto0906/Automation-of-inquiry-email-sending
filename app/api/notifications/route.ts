import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

type NotifItem = { id: string; type: string; name: string; company: string | null; email: string; createdAt: Date };

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  let items: NotifItem[] = [];
  let pendingApprovals = 0;
  let pendingResets = 0;

  // 承認待ちの新規登録・パスワードリセット申請は管理者への通知
  if (session.role === "admin") {
    const [pending, resets] = await Promise.all([
      prisma.user.findMany({
        where: { status: "pending" },
        select: { id: true, name: true, company: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.passwordResetRequest.findMany({
        where: { status: "pending" },
        select: { id: true, createdAt: true, user: { select: { name: true, company: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    pendingApprovals = pending.length;
    pendingResets = resets.length;

    const approvalItems: NotifItem[] = pending.map((u) => ({
      id: u.id, type: "approval", name: u.name, company: u.company, email: u.email, createdAt: u.createdAt,
    }));
    const resetItems: NotifItem[] = resets.map((r) => ({
      id: r.id, type: "password_reset", name: r.user.name, company: r.user.company, email: r.user.email, createdAt: r.createdAt,
    }));

    items = [...approvalItems, ...resetItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  return NextResponse.json({
    pendingApprovals,
    pendingResets,
    count: pendingApprovals + pendingResets,
    items,
  });
}
