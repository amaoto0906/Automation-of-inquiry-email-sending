import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";
import { syncPendingLogs } from "@/lib/sheets";
import { getSetting } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const [syncLogs, unsyncedCount, lastSync, saEmail, spreadsheetId] = await Promise.all([
    prisma.sheetSyncLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.sendLog.count({ where: { sheetSynced: false } }),
    prisma.sheetSyncLog.findFirst({ where: { status: "success" }, orderBy: { createdAt: "desc" } }),
    getSetting("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    getSetting("GOOGLE_SHEETS_SPREADSHEET_ID"),
  ]);

  return NextResponse.json({
    syncLogs,
    unsyncedCount,
    lastSyncAt: lastSync?.createdAt ?? null,
    isConfigured: !!(saEmail && spreadsheetId),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const result = await syncPendingLogs();
  return NextResponse.json(result);
}
