import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const keyword = await prisma.keyword.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      searchResults: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!keyword) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(keyword);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  const keyword = await prisma.keyword.update({
    where: { id },
    data: {
      name: body.name,
      query: body.query,
      region: body.region,
      memo: body.memo,
      isActive: body.isActive,
    },
  });
  await logActivity(session.id, "keyword_updated", id, `キーワード「${keyword.name}」を更新`);
  return NextResponse.json(keyword);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  await prisma.keyword.delete({ where: { id } });
  await logActivity(session.id, "keyword_deleted", id);
  return NextResponse.json({ ok: true });
}
