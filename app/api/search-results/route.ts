import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

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

/**
 * 検索結果の削除。`{ all: true }` で全件、`{ ids: [...] }` で選択削除。
 * SearchResult → ContactPage は Cascade だが、その ContactPage を SendLog /
 * ReviewAction が参照（Restrict）しているため、先に孫レコードを消してから削除する。
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

  const where = all ? {} : { id: { in: ids } };
  const targets = await prisma.searchResult.findMany({ where, select: { id: true } });
  const targetIds = targets.map((t) => t.id);
  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const contactPages = await prisma.contactPage.findMany({
    where: { searchResultId: { in: targetIds } },
    select: { id: true },
  });
  const contactPageIds = contactPages.map((c) => c.id);

  await prisma.$transaction([
    prisma.sendLog.deleteMany({ where: { contactPageId: { in: contactPageIds } } }),
    prisma.reviewAction.deleteMany({ where: { contactPageId: { in: contactPageIds } } }),
    // ContactPage / FormField は SearchResult への Cascade で自動削除される
    prisma.searchResult.deleteMany({ where: { id: { in: targetIds } } }),
  ]);

  await logActivity(session.id, "search_results_deleted", undefined, `検索結果 ${targetIds.length} 件を削除`);
  return NextResponse.json({ ok: true, deleted: targetIds.length });
}
