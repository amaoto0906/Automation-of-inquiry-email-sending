import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const keywordId = searchParams.get("keywordId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {};
  if (keywordId) where.keywordId = keywordId;
  if (status) where.status = status;

  const [results, total] = await Promise.all([
    prisma.searchResult.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        keyword: { select: { query: true, name: true } },
        _count: { select: { contactPages: true } },
      },
    }),
    prisma.searchResult.count({ where }),
  ]);

  return NextResponse.json({ results, total, page, limit });
}
