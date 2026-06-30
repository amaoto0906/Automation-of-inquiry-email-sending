import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const status = searchParams.get("status");
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [logs, total, sent, failed, manualCheck] = await Promise.all([
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
    // ミニ統計は絞り込みに関係なく全体の件数を返す
    prisma.sendLog.count({ where: { status: "success" } }),
    prisma.sendLog.count({ where: { status: "failed" } }),
    prisma.sendLog.count({ where: { status: "manual_check" } }),
  ]);

  const denom = sent + failed;
  const successRate = denom > 0 ? Math.round((sent / denom) * 1000) / 10 : null;

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    stats: { sent, failed, manualCheck, successRate },
  });
}

/**
 * 送信履歴の削除。`{ all: true }` で全件、`{ ids: [...] }` で選択削除。
 * SendLog は他から参照されないため deleteMany のみで完結する。
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
  const result = await prisma.sendLog.deleteMany({ where });

  await logActivity(session.id, "send_logs_deleted", undefined, `送信履歴 ${result.count} 件を削除`);
  return NextResponse.json({ ok: true, deleted: result.count });
}
