import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden } from "@/lib/api-helpers";

// 承認待ちのパスワードリセット申請一覧（管理者のみ）
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const rows = await prisma.passwordResetRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, company: true } },
    },
  });

  const requests = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    userId: r.user.id,
    name: r.user.name,
    email: r.user.email,
    company: r.user.company,
  }));

  return NextResponse.json({ requests });
}
