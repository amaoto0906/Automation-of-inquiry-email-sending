import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, unauthorized } from "@/lib/api-helpers";
import { detectContactPage } from "@/lib/crawler/detector";
import path from "path";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const page = await prisma.contactPage.findUnique({
    where: { id },
    include: {
      formFields: true,
      searchResult: { include: { keyword: true } },
      sendLogs: { include: { user: { select: { name: true } } }, orderBy: { sentAt: "desc" }, take: 5 },
      reviewActions: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!page) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(page);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(request);
  if (!session) return unauthorized();
  const { id } = await params;

  const searchResult = await prisma.searchResult.findUnique({ where: { id } });
  if (!searchResult) return NextResponse.json({ error: "検索結果が見つかりません" }, { status: 404 });

  const screenshotDir = path.join(process.cwd(), "public", "screenshots");

  const detection = await detectContactPage(searchResult.url, screenshotDir);

  const existingPage = await prisma.contactPage.findFirst({
    where: { searchResultId: id },
  });

  let contactPage;
  const pageData = {
    contactUrl: detection.contactUrl,
    estimatedCompanyName: detection.estimatedCompanyName,
    hasForm: detection.hasForm,
    hasCaptcha: detection.hasCaptcha,
    hasNoSolicitationText: detection.hasNoSolicitationText,
    isJsHeavy: detection.isJsHeavy,
    requiresManualCheck: detection.requiresManualCheck,
    detectedFields: JSON.stringify(detection.detectedFields),
    screenshotPath: detection.screenshotPath,
    errorMessage: detection.errorMessage,
    status: !detection.hasForm
      ? "no_form"
      : detection.hasCaptcha || detection.hasNoSolicitationText
        ? "manual_check"
        : "form_found",
  };

  if (existingPage) {
    contactPage = await prisma.contactPage.update({ where: { id: existingPage.id }, data: pageData });
  } else {
    contactPage = await prisma.contactPage.create({ data: { searchResultId: id, ...pageData } });
  }

  if (detection.detectedFields.length > 0) {
    await prisma.formField.deleteMany({ where: { contactPageId: contactPage.id } });
    await prisma.formField.createMany({
      data: detection.detectedFields.map(f => ({
        contactPageId: contactPage.id,
        fieldType: f.fieldType,
        label: f.label,
        name: f.name,
        placeholder: f.placeholder,
        isRequired: f.isRequired,
        detectedAs: f.detectedAs,
      })),
    });
  }

  await prisma.searchResult.update({
    where: { id },
    data: { status: pageData.status === "form_found" ? "form_found" : pageData.status === "no_form" ? "no_form" : "contact_page_found" },
  });

  return NextResponse.json(contactPage);
}
