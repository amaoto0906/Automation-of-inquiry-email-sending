import { chromium } from "playwright";
import path from "path";
import { sleep } from "@/lib/utils";
import { getNumberSetting } from "@/lib/settings";

interface ContactPageData {
  contactUrl: string;
  formFields: Array<{
    fieldType: string;
    label: string | null;
    name: string | null;
    placeholder: string | null;
    isRequired: boolean;
    detectedAs: string | null;
  }>;
  hasCaptcha: boolean;
}

interface TemplateData {
  senderCompany: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  subject: string;
  body: string;
  signature: string | null;
}

export interface SubmitResult {
  success: boolean;
  manualCheck: boolean;
  errorMessage: string | null;
  screenshotPath: string | null;
}

const FIELD_VALUES: Record<string, (template: TemplateData) => string> = {
  company: (t) => t.senderCompany,
  name: (t) => t.senderName,
  email: (t) => t.senderEmail,
  phone: (t) => t.senderPhone ?? "",
  subject: (t) => t.subject,
  body: (t) => [t.body, t.signature ?? ""].filter(Boolean).join("\n\n"),
  agree: () => "true",
};

export async function submitForm(
  contactPage: ContactPageData,
  template: TemplateData
): Promise<SubmitResult> {
  const screenshotDir = path.join(process.cwd(), "public", "screenshots");
  const screenshotFile = `submit-${Date.now()}-${new URL(contactPage.contactUrl).hostname}.png`;
  const screenshotPath = path.join(screenshotDir, screenshotFile);

  if (contactPage.hasCaptcha) {
    return { success: false, manualCheck: true, errorMessage: "CAPTCHAが検出されたため送信できません", screenshotPath: null };
  }

  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "ja,en;q=0.9" });

    await page.goto(contactPage.contactUrl, { waitUntil: "networkidle", timeout: 20000 });

    const delay = (await getNumberSetting("DEFAULT_SEND_DELAY_SECONDS", 5)) * 1000;
    await sleep(delay);

    for (const field of contactPage.formFields) {
      const detectedAs = field.detectedAs;
      if (!detectedAs) continue;
      const value = FIELD_VALUES[detectedAs]?.(template);
      if (!value && !field.isRequired) continue;
      if (!value) continue;

      const selector = buildSelector(field);
      const el = await page.$(selector).catch(() => null);
      if (!el) continue;

      if (field.fieldType === "checkbox" && field.detectedAs === "agree") {
        await el.check().catch(() => {});
      } else if (field.fieldType === "select") {
        await el.selectOption({ index: 1 }).catch(() => {});
      } else {
        await el.fill(value).catch(() => {});
      }
    }

    const submitBtn = await page.$("input[type='submit'], button[type='submit'], button:has-text('送信'), button:has-text('確認'), button:has-text('Submit')").catch(() => null);
    if (!submitBtn) {
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
      return { success: false, manualCheck: true, errorMessage: "送信ボタンが見つかりませんでした", screenshotPath };
    }

    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
      submitBtn.click(),
    ]);

    const successPatterns = ["ありがとうございます", "送信しました", "完了", "thank you", "submitted", "受け付けました"];
    const pageText = await page.innerText("body").catch(() => "");
    const isSuccess = successPatterns.some(p => pageText.toLowerCase().includes(p.toLowerCase()));

    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

    return { success: isSuccess, manualCheck: !isSuccess, errorMessage: isSuccess ? null : "送信完了確認できませんでした", screenshotPath };
  } catch (err) {
    return { success: false, manualCheck: false, errorMessage: String(err), screenshotPath };
  } finally {
    if (browser) await browser.close();
  }
}

function buildSelector(field: { fieldType: string; name: string | null; label: string | null; placeholder: string | null; detectedAs: string | null }): string {
  const selectors: string[] = [];

  if (field.name) {
    selectors.push(`[name="${field.name}"]`);
  }
  if (field.placeholder) {
    selectors.push(`[placeholder="${field.placeholder}"]`);
  }
  if (field.detectedAs === "email") selectors.push("input[type='email']");
  if (field.detectedAs === "phone") selectors.push("input[type='tel']");
  if (field.detectedAs === "body") selectors.push("textarea");

  return selectors[0] ?? "input";
}
