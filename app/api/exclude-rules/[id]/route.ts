import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const rule = await prisma.excludeRule.update({
    where: { id },
    data: { ruleType: body.ruleType, value: body.value, memo: body.memo, isActive: body.isActive },
  });
  await logActivity(session.id, "exclude_rule_updated", id);
  return NextResponse.json(rule);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  await prisma.excludeRule.delete({ where: { id } });
  await logActivity(session.id, "exclude_rule_deleted", id);
  return NextResponse.json({ ok: true });
}
