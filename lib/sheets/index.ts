import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

async function getAuth() {
  const email = await getSetting("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const key = (await getSetting("GOOGLE_PRIVATE_KEY"))?.replace(/\\n/g, "\n");

  if (!email || !key) return null;

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function syncToSheets(sendLogId: string): Promise<void> {
  const spreadsheetId = await getSetting("GOOGLE_SHEETS_SPREADSHEET_ID");
  const auth = await getAuth();

  if (!spreadsheetId || !auth) {
    await prisma.sheetSyncLog.create({
      data: { sendLogId, status: "failed", errorMessage: "Google Sheets設定が未完了です" },
    });
    return;
  }

  const sendLog = await prisma.sendLog.findUnique({
    where: { id: sendLogId },
    include: {
      user: { select: { name: true } },
      template: { select: { name: true } },
      contactPage: {
        select: {
          contactUrl: true,
          estimatedCompanyName: true,
          hasCaptcha: true,
          status: true,
          searchResult: { select: { domain: true, url: true, keyword: { select: { query: true } } } },
        },
      },
    },
  });

  if (!sendLog) return;

  const sheets = google.sheets({ version: "v4", auth });
  const row = [
    new Date(sendLog.sentAt).toLocaleString("ja-JP"),
    sendLog.user.name,
    sendLog.contactPage.searchResult.keyword.query,
    sendLog.contactPage.searchResult.url,
    sendLog.contactPage.contactUrl,
    sendLog.status,
    sendLog.errorMessage ?? "",
    sendLog.template?.name ?? "",
    sendLog.contactPage.hasCaptcha ? "あり" : "なし",
    sendLog.contactPage.estimatedCompanyName ?? "",
    sendLog.isDryRun ? "テスト送信" : "本番送信",
  ];

  let retries = 3;
  while (retries > 0) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "送信履歴!A:K",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });

      await prisma.sendLog.update({
        where: { id: sendLogId },
        data: { sheetSynced: true, sheetSyncedAt: new Date() },
      });

      await prisma.sheetSyncLog.create({
        data: { sendLogId, status: "success", rowsWritten: 1 },
      });
      return;
    } catch (err: unknown) {
      retries--;
      const isRateLimit = String(err).includes("429") || String(err).includes("Quota");
      if (isRateLimit && retries > 0) {
        await new Promise(r => setTimeout(r, Math.pow(2, 3 - retries) * 1000));
      } else {
        await prisma.sheetSyncLog.create({
          data: { sendLogId, status: "failed", errorMessage: String(err) },
        });
        return;
      }
    }
  }
}

export async function syncPendingLogs(): Promise<{ synced: number; failed: number }> {
  const unsynced = await prisma.sendLog.findMany({
    where: { sheetSynced: false },
    take: 50,
  });

  let synced = 0;
  let failed = 0;

  for (const log of unsynced) {
    try {
      await syncToSheets(log.id);
      synced++;
    } catch {
      failed++;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return { synced, failed };
}
