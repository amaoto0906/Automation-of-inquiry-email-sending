import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where = status ? { status } : {};
  const [pages, total] = await Promise.all([
    prisma.contactPage.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        searchResult: { include: { keyword: { select: { query: true } } } },
        formFields: true,
        _count: { select: { sendLogs: true } },
      },
    }),
    prisma.contactPage.count({ where }),
  ]);

  return NextResponse.json({ pages, total, page, limit });
}
