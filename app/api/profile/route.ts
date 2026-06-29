import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, email: true, name: true, role: true, company: true,
      department: true, position: true, phone: true, createdAt: true,
    },
  });
  if (!user) return unauthorized();
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const body = await request.json();
  const { name, company, department, position, phone, currentPassword, newPassword } = body ?? {};

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "氏名は必須です。" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (company !== undefined) data.company = company || null;
  if (department !== undefined) data.department = department || null;
  if (position !== undefined) data.position = position || null;
  if (phone !== undefined) data.phone = phone || null;

  // パスワード変更（任意）
  if (newPassword) {
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: "新しいパスワードは8文字以上で入力してください。" }, { status: 400 });
    }
    const me = await prisma.user.findUnique({ where: { id: session.id } });
    if (!me) return unauthorized();
    const ok = await verifyPassword(currentPassword || "", me.passwordHash);
    if (!ok) return NextResponse.json({ error: "現在のパスワードが正しくありません。" }, { status: 400 });
    data.passwordHash = await hashPassword(newPassword);
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data,
    select: {
      id: true, email: true, name: true, role: true, company: true,
      department: true, position: true, phone: true,
    },
  });
  await logActivity(session.id, "profile_updated", session.id, "プロフィールを更新");
  return NextResponse.json({ ok: true, user });
}
