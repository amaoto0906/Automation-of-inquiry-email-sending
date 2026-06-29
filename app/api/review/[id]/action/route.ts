import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";
import { submitForm } from "@/lib/crawler/submitter";
import { syncToSheets } from "@/lib/sheets";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const body = await request.json();
  const { action, templateId, memo } = body;
  // action: "send" | "skip" | "manual_check" | "exclude"

  if (!action) return NextResponse.json({ error: "actionは必須です" }, { status: 400 });

  const contactPage = await prisma.contactPage.findUnique({
    where: { id },
    include: { formFields: true, searchResult: true },
  });
  if (!contactPage) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  // 二重送信防止
  if (action === "send") {
    const recentSend = await prisma.sendLog.findFirst({
      where: { contactPageId: id, status: "success" },
    });
    if (recentSend) {
      return NextResponse.json({ error: "このページはすでに送信済みです" }, { status: 409 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.sendLog.count({
      where: { userId: session.id, sentAt: { gte: today }, status: { in: ["success", "dry_run"] } },
    });
    const maxPerDay = parseInt(process.env.MAX_SENDS_PER_DAY ?? "50");
    if (todayCount >= maxPerDay) {
      return NextResponse.json({ error: `本日の送信上限（${maxPerDay}件）に達しました` }, { status: 429 });
    }
  }

  await prisma.reviewAction.create({
    data: { contactPageId: id, userId: session.id, action, memo },
  });

  if (action === "skip") {
    await prisma.contactPage.update({ where: { id }, data: { status: "pending" } });
    return NextResponse.json({ ok: true, action: "skip" });
  }

  if (action === "manual_check") {
    await prisma.contactPage.update({ where: { id }, data: { status: "manual_check" } });
    await prisma.searchResult.update({ where: { id: contactPage.searchResultId }, data: { status: "manual_check" } });
    return NextResponse.json({ ok: true, action: "manual_check" });
  }

  if (action === "exclude") {
    await prisma.contactPage.update({ where: { id }, data: { status: "excluded" } });
    await prisma.searchResult.update({ where: { id: contactPage.searchResultId }, data: { status: "excluded", excludeReason: memo ?? "手動除外" } });
    return NextResponse.json({ ok: true, action: "exclude" });
  }

  if (action === "send") {
    const template = templateId
      ? await prisma.messageTemplate.findUnique({ where: { id: templateId } })
      : await prisma.messageTemplate.findFirst({ where: { isDefault: true, isActive: true } });

    if (!template) return NextResponse.json({ error: "送信テンプレートが見つかりません" }, { status: 404 });

    const isDryRun = process.env.ALLOW_LIVE_SEND !== "true";

    let status: string;
    let errorMessage: string | null = null;
    let screenshotPath: string | null = null;

    if (isDryRun) {
      status = "dry_run";
      const delay = parseInt(process.env.DEFAULT_SEND_DELAY_SECONDS ?? "5") * 1000;
      await new Promise(r => setTimeout(r, Math.min(delay, 2000)));
    } else {
      const result = await submitForm(contactPage, template);
      status = result.success ? "success" : result.manualCheck ? "manual_check" : "failed";
      errorMessage = result.errorMessage ?? null;
      screenshotPath = result.screenshotPath ?? null;
    }

    const sendLog = await prisma.sendLog.create({
      data: {
        contactPageId: id,
        templateId: template.id,
        userId: session.id,
        status,
        isDryRun,
        errorMessage,
        screenshotPath,
      },
    });

    await prisma.contactPage.update({ where: { id }, data: { status } });
    await prisma.searchResult.update({
      where: { id: contactPage.searchResultId },
      data: { status: status === "success" || status === "dry_run" ? "sent" : status },
    });

    await logActivity(session.id, "form_submitted", id, `${isDryRun ? "[DRY-RUN] " : ""}${contactPage.contactUrl}`);

    // Google Sheets 同期（非同期）
    syncToSheets(sendLog.id).catch(console.error);

    return NextResponse.json({ ok: true, action: "send", status, isDryRun, sendLogId: sendLog.id });
  }

  return NextResponse.json({ error: "不明なアクション" }, { status: 400 });
}
