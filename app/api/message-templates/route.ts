import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const templates = await prisma.messageTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorized();

  const body = await request.json();
  const { name, senderCompany, senderName, senderEmail, senderPhone, subject, body: msgBody, signature, isDefault } = body;

  if (!name || !senderCompany || !senderName || !senderEmail || !subject || !msgBody) {
    return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
  }

  if (isDefault) {
    await prisma.messageTemplate.updateMany({ data: { isDefault: false } });
  }

  const template = await prisma.messageTemplate.create({
    data: { name, senderCompany, senderName, senderEmail, senderPhone, subject, body: msgBody, signature, isDefault: isDefault ?? false },
  });
  await logActivity(session.id, "template_created", template.id, `テンプレート「${name}」を作成`);
  return NextResponse.json(template, { status: 201 });
}
