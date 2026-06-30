import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [keywords, formRows, sentRows, monthUrlCount] = await Promise.all([
    prisma.keyword.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { searchResults: true } },
      },
    }),
    prisma.contactPage.findMany({ where: { hasForm: true }, select: { searchResult: { select: { keywordId: true } } } }),
    prisma.sendLog.findMany({ where: { status: "success" }, select: { contactPage: { select: { searchResult: { select: { keywordId: true } } } } } }),
    prisma.searchResult.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  // キーワードIDごとに「フォーム検出数」「送信済み数」を集計
  const formCounts = new Map<string, number>();
  for (const r of formRows) {
    const k = r.searchResult?.keywordId;
    if (k) formCounts.set(k, (formCounts.get(k) ?? 0) + 1);
  }
  const sentCounts = new Map<string, number>();
  for (const r of sentRows) {
    const k = r.contactPage?.searchResult?.keywordId;
    if (k) sentCounts.set(k, (sentCounts.get(k) ?? 0) + 1);
  }

  const items = keywords.map((k) => ({
    id: k.id,
    name: k.name,
    query: k.query,
    region: k.region,
    memo: k.memo,
    isActive: k.isActive,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    createdByName: k.createdBy?.name ?? null,
    urlCount: k._count.searchResults,
    formCount: formCounts.get(k.id) ?? 0,
    sentCount: sentCounts.get(k.id) ?? 0,
  }));

  const total = items.length;
  const active = items.filter((k) => k.isActive).length;
  const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

  return NextResponse.json({ keywords: items, stats: { total, active, activeRate, monthUrlCount } });
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

/**
 * キーワードの削除。`{ all: true }` で全件、`{ ids: [...] }` で選択削除。
 * Keyword → SearchResult → ContactPage → FormField は Cascade だが、
 * SendLog / ReviewAction は ContactPage を参照したまま残るため、FK制約に依存せず
 * 子テーブルから順にトランザクションでまとめて削除する。
 */
export async function DELETE(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const all = body?.all === true;
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (!all && ids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const targets = await prisma.keyword.findMany({
    where: all ? {} : { id: { in: ids } },
    select: { id: true },
  });
  const keywordIds = targets.map((t) => t.id);
  if (keywordIds.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  // 配下の検出ページ（孫テーブルの送信ログ・確認履歴を先に消すため）
  const pages = await prisma.contactPage.findMany({
    where: { searchResult: { keywordId: { in: keywordIds } } },
    select: { id: true },
  });
  const pageIds = pages.map((p) => p.id);

  await prisma.$transaction([
    prisma.sendLog.deleteMany({ where: { contactPageId: { in: pageIds } } }),
    prisma.reviewAction.deleteMany({ where: { contactPageId: { in: pageIds } } }),
    prisma.formField.deleteMany({ where: { contactPageId: { in: pageIds } } }),
    prisma.contactPage.deleteMany({ where: { id: { in: pageIds } } }),
    prisma.searchResult.deleteMany({ where: { keywordId: { in: keywordIds } } }),
    prisma.keyword.deleteMany({ where: { id: { in: keywordIds } } }),
  ]);

  await logActivity(session.id, "keywords_deleted", undefined, `キーワード ${keywordIds.length} 件を削除`);
  return NextResponse.json({ ok: true, deleted: keywordIds.length });
}
