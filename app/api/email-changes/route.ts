import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden } from "@/lib/api-helpers";

// 承認待ちのメールアドレス変更申請一覧（管理者のみ）
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const rows = await prisma.emailChangeRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      newEmail: true,
      user: { select: { id: true, name: true, email: true, company: true } },
    },
  });

  const requests = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    newEmail: r.newEmail,
    userId: r.user.id,
    name: r.user.name,
    currentEmail: r.user.email,
    company: r.user.company,
  }));

  return NextResponse.json({ requests });
}
