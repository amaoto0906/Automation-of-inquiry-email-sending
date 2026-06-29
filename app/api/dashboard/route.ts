import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    keywordCount,
    searchResultCount,
    formFoundCount,
    sentCount,
    failedCount,
    captchaCount,
    manualCount,
    excludedCount,
    todaySentCount,
    recentLogs,
  ] = await Promise.all([
    prisma.keyword.count({ where: { isActive: true } }),
    prisma.searchResult.count(),
    prisma.contactPage.count({ where: { hasForm: true } }),
    prisma.sendLog.count({ where: { status: "success" } }),
    prisma.sendLog.count({ where: { status: "failed" } }),
    prisma.contactPage.count({ where: { hasCaptcha: true } }),
    prisma.contactPage.count({ where: { status: "manual_check" } }),
    prisma.searchResult.count({ where: { status: "excluded" } }),
    prisma.sendLog.count({ where: { sentAt: { gte: today }, status: "success" } }),
    prisma.sendLog.findMany({
      take: 10,
      orderBy: { sentAt: "desc" },
      include: {
        user: { select: { name: true } },
        contactPage: { select: { contactUrl: true, estimatedCompanyName: true, searchResult: { select: { domain: true } } } },
        template: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    keywordCount,
    searchResultCount,
    formFoundCount,
    sentCount,
    failedCount,
    captchaCount,
    manualCount,
    excludedCount,
    todaySentCount,
    maxSendsPerDay: parseInt(process.env.MAX_SENDS_PER_DAY ?? "50"),
    recentLogs,
  });
}
