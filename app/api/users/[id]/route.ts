import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, logActivity } from "@/lib/api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();
  const { id } = await params;
  const body = await request.json();

  const user = await prisma.user.update({
    where: { id },
    data: { name: body.name, role: body.role, isActive: body.isActive },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  await logActivity(admin.id, "user_updated", id, `ユーザー「${user.name}」を更新`);
  return NextResponse.json(user);
}
