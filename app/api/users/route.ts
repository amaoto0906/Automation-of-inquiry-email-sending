import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, forbidden, unauthorized, logActivity } from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth/password";
import { requireSession } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  const users = await prisma.user.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      status: true, emailVerified: true, company: true, department: true,
      position: true, phone: true, createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users, total: users.length });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return forbidden();

  const body = await request.json();
  const { email, name, password, role, company } = body;

  if (!email || !name || !password) {
    return NextResponse.json({ error: "メール・名前・パスワードは必須です" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  // 管理者が直接作成したユーザーは即時有効
  const user = await prisma.user.create({
    data: {
      email, name, passwordHash, role: role ?? "member", company: company || null,
      status: "active", isActive: true, emailVerified: true, approvedAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  await logActivity(admin.id, "user_created", user.id, `ユーザー「${name}」を作成`);
  return NextResponse.json(user, { status: 201 });
}
