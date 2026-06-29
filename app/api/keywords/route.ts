import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const keywords = await prisma.keyword.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { searchResults: true } },
    },
  });
  return NextResponse.json(keywords);
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const body = await request.json();
  const { name, query, region, memo } = body;

  if (!name || !query) {
    return NextResponse.json({ error: "キーワード名と検索クエリは必須です" }, { status: 400 });
  }

  const keyword = await prisma.keyword.create({
    data: { name, query, region, memo, createdById: session.id },
  });

  await logActivity(session.id, "keyword_created", keyword.id, `キーワード「${name}」を登録`);
  return NextResponse.json(keyword, { status: 201 });
}
