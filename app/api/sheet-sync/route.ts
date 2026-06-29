import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";
import { syncPendingLogs } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const [syncLogs, unsyncedCount, lastSync] = await Promise.all([
    prisma.sheetSyncLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.sendLog.count({ where: { sheetSynced: false } }),
    prisma.sheetSyncLog.findFirst({ where: { status: "success" }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    syncLogs,
    unsyncedCount,
    lastSyncAt: lastSync?.createdAt ?? null,
    isConfigured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const result = await syncPendingLogs();
  return NextResponse.json(result);
}
