import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";
import { getSearchProvider } from "@/lib/search";
import { extractDomain } from "@/lib/utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const keyword = await prisma.keyword.findUnique({ where: { id } });
  if (!keyword) return NextResponse.json({ error: "キーワードが見つかりません" }, { status: 404 });
  if (!keyword.isActive) return NextResponse.json({ error: "このキーワードは無効です" }, { status: 400 });

  const excludeRules = await prisma.excludeRule.findMany({ where: { isActive: true } });
  const excludedDomains = excludeRules.filter(r => r.ruleType === "domain").map(r => r.value.toLowerCase());
  const sentDomains = await prisma.searchResult.findMany({
    where: { status: "sent" },
    select: { domain: true },
  });
  const sentDomainSet = new Set(sentDomains.map(s => s.domain.toLowerCase()));

  let provider;
  try {
    provider = await getSearchProvider();
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const results = await provider.search(keyword.query, keyword.region ?? undefined);
  let added = 0;
  let skipped = 0;

  for (const result of results) {
    const domain = extractDomain(result.url).toLowerCase();

    const existing = await prisma.searchResult.findFirst({
      where: { keywordId: id, domain },
    });
    if (existing) { skipped++; continue; }

    const isExcluded = excludedDomains.some(d => domain.includes(d));
    const alreadySent = sentDomainSet.has(domain);

    await prisma.searchResult.create({
      data: {
        keywordId: id,
        url: result.url,
        domain,
        title: result.title,
        snippet: result.snippet,
        position: result.position,
        status: isExcluded ? "excluded" : alreadySent ? "excluded" : "pending",
        excludeReason: isExcluded ? "除外ルール一致" : alreadySent ? "送信済みドメイン" : null,
      },
    });
    added++;
  }

  await prisma.keyword.update({ where: { id }, data: { lastExecutedAt: new Date() } });
  await logActivity(session.id, "keyword_executed", id, `${keyword.query} - ${added}件追加`);

  return NextResponse.json({ added, skipped, total: results.length });
}
