import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const rules = await prisma.excludeRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const body = await request.json();
  const { ruleType, value, memo } = body;

  if (!ruleType || !value) {
    return NextResponse.json({ error: "種別と値は必須です" }, { status: 400 });
  }

  const rule = await prisma.excludeRule.create({ data: { ruleType, value, memo } });
  await logActivity(session.id, "exclude_rule_created", rule.id, `除外ルール「${value}」を登録`);
  return NextResponse.json(rule, { status: 201 });
}
