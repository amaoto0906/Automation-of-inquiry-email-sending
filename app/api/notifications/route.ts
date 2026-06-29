import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  // 承認待ちの新規登録は管理者への通知
  let items: Array<{ id: string; type: string; name: string; company: string | null; email: string; createdAt: Date }> = [];
  if (session.role === "admin") {
    const pending = await prisma.user.findMany({
      where: { status: "pending" },
      select: { id: true, name: true, company: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    items = pending.map((u) => ({ id: u.id, type: "approval", name: u.name, company: u.company, email: u.email, createdAt: u.createdAt }));
  }

  return NextResponse.json({
    pendingApprovals: items.length,
    count: items.length,
    items,
  });
}
