import { NextRequest, NextResponse } from "next/server";
import { getSession, SessionUser } from "./auth/session";
import { prisma } from "./prisma";

export async function requireSession(
  request: NextRequest
): Promise<SessionUser | null> {
  return getSession();
}

export async function requireAdmin(
  request: NextRequest
): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json(
    { error: "認証が必要です。ログインしてください。" },
    { status: 401 }
  );
}

export function forbidden() {
  return NextResponse.json(
    { error: "この操作には管理者権限が必要です。" },
    { status: 403 }
  );
}

export async function logActivity(
  userId: string,
  action: string,
  target?: string,
  detail?: string
) {
  await prisma.activityLog.create({
    data: { userId, action, target, detail },
  });
}
