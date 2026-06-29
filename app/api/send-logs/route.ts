import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const status = searchParams.get("status");
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [logs, total] = await Promise.all([
    prisma.sendLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sentAt: "desc" },
      include: {
        user: { select: { name: true } },
        template: { select: { name: true } },
        contactPage: {
          select: {
            contactUrl: true,
            estimatedCompanyName: true,
            searchResult: { select: { domain: true, keyword: { select: { query: true } } } },
          },
        },
      },
    }),
    prisma.sendLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
