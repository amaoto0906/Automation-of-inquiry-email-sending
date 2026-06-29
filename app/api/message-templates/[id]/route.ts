import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized, logActivity } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const template = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;
  const body = await request.json();

  if (body.isDefault) {
    await prisma.messageTemplate.updateMany({ data: { isDefault: false } });
  }

  const template = await prisma.messageTemplate.update({
    where: { id },
    data: {
      name: body.name,
      senderCompany: body.senderCompany,
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      senderPhone: body.senderPhone,
      subject: body.subject,
      body: body.body,
      signature: body.signature,
      isActive: body.isActive,
      isDefault: body.isDefault,
    },
  });
  await logActivity(session.id, "template_updated", id, `テンプレート「${template.name}」を更新`);
  return NextResponse.json(template);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  await prisma.messageTemplate.delete({ where: { id } });
  await logActivity(session.id, "template_deleted", id);
  return NextResponse.json({ ok: true });
}
