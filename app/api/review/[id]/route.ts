import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const contactPage = await prisma.contactPage.findUnique({
    where: { id },
    include: {
      formFields: true,
      searchResult: {
        include: { keyword: { select: { query: true, name: true } } },
      },
      sendLogs: {
        orderBy: { sentAt: "desc" }, take: 3,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!contactPage) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  const defaultTemplate = await prisma.messageTemplate.findFirst({
    where: { isDefault: true, isActive: true },
  });

  const excludeRules = await prisma.excludeRule.findMany({ where: { isActive: true } });
  const domain = contactPage.searchResult.domain;

  const matchedRules = excludeRules.filter(rule => {
    if (rule.ruleType === "domain") return domain.toLowerCase().includes(rule.value.toLowerCase());
    if (rule.ruleType === "keyword") {
      const pageText = contactPage.contactUrl + (contactPage.estimatedCompanyName ?? "");
      return pageText.toLowerCase().includes(rule.value.toLowerCase());
    }
    return false;
  });

  const hasPreviousSend = contactPage.sendLogs.some(l => l.status === "success");

  return NextResponse.json({
    contactPage,
    defaultTemplate,
    excludeRules: matchedRules,
    hasPreviousSend,
    canAutoSend: !contactPage.hasCaptcha && !contactPage.hasNoSolicitationText && matchedRules.length === 0 && contactPage.hasForm,
    isDryRun: process.env.ALLOW_LIVE_SEND !== "true",
  });
}
