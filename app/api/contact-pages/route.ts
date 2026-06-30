import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where = status ? { status } : {};
  const [pages, total, formFound, manualCheck, approved, noForm] = await Promise.all([
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
    // ミニ統計は絞り込みに関係なく全体の件数を返す
    prisma.contactPage.count({ where: { hasForm: true } }),
    prisma.contactPage.count({ where: { OR: [{ status: "manual_check" }, { requiresManualCheck: true }] } }),
    prisma.contactPage.count({ where: { status: "approved" } }),
    prisma.contactPage.count({ where: { hasForm: false } }),
  ]);

  return NextResponse.json({
    pages,
    total,
    page,
    limit,
    stats: { formFound, manualCheck, approved, noForm },
  });
}

/**
 * 検出結果の削除。`{ all: true }` で全件、`{ ids: [...] }` で選択削除。
 * ContactPage は SendLog / ReviewAction から参照（Restrict）されているため、
 * 先に子レコードを削除してからトランザクションでまとめて削除する。
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
  const targets = await prisma.contactPage.findMany({ where, select: { id: true } });
  const targetIds = targets.map((t) => t.id);
  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  await prisma.$transaction([
    prisma.sendLog.deleteMany({ where: { contactPageId: { in: targetIds } } }),
    prisma.reviewAction.deleteMany({ where: { contactPageId: { in: targetIds } } }),
    prisma.contactPage.deleteMany({ where: { id: { in: targetIds } } }),
  ]);

  await logActivity(session.id, "contact_pages_deleted", undefined, `検出結果 ${targetIds.length} 件を削除`);
  return NextResponse.json({ ok: true, deleted: targetIds.length });
}
