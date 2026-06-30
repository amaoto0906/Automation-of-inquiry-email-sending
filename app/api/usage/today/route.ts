import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";
import { getNumberSetting } from "@/lib/settings";

// サイドバーの「本日 X / Y 件」表示用。当日の送信成功数と1日の送信上限を返す軽量エンドポイント。
export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todaySentCount, maxSendsPerDay] = await Promise.all([
    prisma.sendLog.count({ where: { sentAt: { gte: today }, status: "success" } }),
    getNumberSetting("MAX_SENDS_PER_DAY", 50),
  ]);

  return NextResponse.json({ todaySentCount, maxSendsPerDay });
}
