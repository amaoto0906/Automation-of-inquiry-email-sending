import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";

export interface DetectedField {
  fieldType: string;
  label: string | null;
  name: string | null;
  placeholder: string | null;
  isRequired: boolean;
  detectedAs: string;
}

export interface ContactPageDetection {
  contactUrl: string;
  hasForm: boolean;
  hasCaptcha: boolean;
  hasNoSolicitationText: boolean;
  isJsHeavy: boolean;
  requiresManualCheck: boolean;
  detectedFields: DetectedField[];
  estimatedCompanyName: string | null;
  screenshotPath: string | null;
  errorMessage: string | null;
}

const CONTACT_PATHS = [
  "/contact", "/contact-us", "/inquiry", "/toiawase", "/otoiawase",
  "/form", "/mail", "/お問い合わせ", "/contact/", "/inquiry/",
];

const CONTACT_LINK_PATTERNS = [
  "お問い合わせ", "問い合わせ", "Contact", "CONTACT", "資料請求",
  "ご連絡", "お申し込み", "contact", "inquiry",
];

const NO_SOLICITATION_PATTERNS = [
  "営業目的.*お断り", "営業.*禁止", "売り込み.*お断り",
  "セールス.*お断り", "業者.*お断り", "営業メール",
  "no solicitation", "no sales",
];

const CAPTCHA_PATTERNS = [
  "recaptcha", "hcaptcha", "g-recaptcha", "captcha",
  "turnstile", "arkose", "funcaptcha",
];

const FIELD_MAPPING: Record<string, string> = {
  "会社名": "company", "社名": "company", "company": "company", "会社": "company",
  "お名前": "name", "氏名": "name", "name": "name", "担当者": "name",
  "メール": "email", "email": "email", "メールアドレス": "email",
  "電話": "phone", "tel": "phone", "電話番号": "phone",
  "件名": "subject", "subject": "subject", "タイトル": "subject",
  "お問い合わせ内容": "body", "内容": "body", "message": "body", "本文": "body",
  "同意": "agree", "プライバシー": "agree", "agree": "agree",
};

export async function detectContactPage(
  baseUrl: string,
  screenshotDir?: string
): Promise<ContactPageDetection> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "ja,en;q=0.9" });

    const contactUrl = await findContactUrl(page, baseUrl);
    if (!contactUrl) {
      return {
        contactUrl: baseUrl,
        hasForm: false, hasCaptcha: false,
        hasNoSolicitationText: false, isJsHeavy: false,
        requiresManualCheck: false, detectedFields: [],
        estimatedCompanyName: null, screenshotPath: null,
        errorMessage: "問い合わせページが見つかりませんでした",
      };
    }

    await page.goto(contactUrl, { waitUntil: "networkidle", timeout: 15000 });

    const pageText = await page.innerText("body").catch(() => "");
    const pageHtml = await page.content().catch(() => "");

    const hasCaptcha = CAPTCHA_PATTERNS.some(p =>
      pageHtml.toLowerCase().includes(p.toLowerCase())
    );

    const hasNoSolicitationText = NO_SOLICITATION_PATTERNS.some(p =>
      new RegExp(p, "i").test(pageText)
    );

    const forms = await page.$$("form");
    const hasForm = forms.length > 0;

    let detectedFields: DetectedField[] = [];
    if (hasForm) {
      detectedFields = await extractFormFields(page);
    }

    const isJsHeavy = forms.length === 0 && pageHtml.includes("react") || pageHtml.includes("vue");

    const requiresManualCheck = hasCaptcha || hasNoSolicitationText || (hasForm && detectedFields.length === 0) || isJsHeavy;

    const companyName = await extractCompanyName(page).catch(() => null);

    let screenshotPath: string | null = null;
    if (screenshotDir && hasForm) {
      const filename = `${Date.now()}-${new URL(contactUrl).hostname}.png`;
      screenshotPath = path.join(screenshotDir, filename);
      await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    }

    return {
      contactUrl,
      hasForm,
      hasCaptcha,
      hasNoSolicitationText,
      isJsHeavy,
      requiresManualCheck,
      detectedFields,
      estimatedCompanyName: companyName,
      screenshotPath,
      errorMessage: null,
    };
  } catch (err) {
    return {
      contactUrl: baseUrl,
      hasForm: false, hasCaptcha: false,
      hasNoSolicitationText: false, isJsHeavy: false,
      requiresManualCheck: true, detectedFields: [],
      estimatedCompanyName: null, screenshotPath: null,
      errorMessage: String(err),
    };
  } finally {
    if (browser) await browser.close();
  }
}

async function findContactUrl(page: Page, baseUrl: string): Promise<string | null> {
  for (const p of CONTACT_PATHS) {
    const url = `${baseUrl.replace(/\/$/, "")}${p}`;
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      if (res && res.ok()) return url;
    } catch {}
  }

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
    for (const pattern of CONTACT_LINK_PATTERNS) {
      const link = await page.$(`a:has-text("${pattern}")`);
      if (link) {
        const href = await link.getAttribute("href");
        if (href) {
          const resolved = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
          return resolved;
        }
      }
    }
  } catch {}

  return null;
}

async function extractFormFields(page: Page): Promise<DetectedField[]> {
  const fields: DetectedField[] = [];

  const inputs = await page.$$("input:not([type='hidden']):not([type='submit']):not([type='button']), textarea, select");

  for (const input of inputs) {
    const tag = await input.evaluate(el => el.tagName.toLowerCase());
    const type = await input.getAttribute("type") ?? (tag === "textarea" ? "textarea" : "text");
    const name = await input.getAttribute("name") ?? null;
    const placeholder = await input.getAttribute("placeholder") ?? null;
    const required = await input.evaluate(el => (el as HTMLInputElement).required);

    let label: string | null = null;
    const id = await input.getAttribute("id");
    if (id) {
      const labelEl = await page.$(`label[for="${id}"]`);
      if (labelEl) label = await labelEl.innerText().catch(() => null);
    }
    if (!label) {
      label = await input.evaluate(el => {
        const parent = el.closest("div, p, td, li");
        return parent?.querySelector("label")?.textContent?.trim() ?? null;
      });
    }

    const detectedAs = detectFieldRole(label, name, placeholder, type);
    if (type === "submit" || type === "button" || type === "reset") continue;

    fields.push({ fieldType: type, label, name, placeholder, isRequired: required, detectedAs });
  }

  return fields;
}

function detectFieldRole(label: string | null, name: string | null, placeholder: string | null, type: string): string {
  const text = [label, name, placeholder].filter(Boolean).join(" ").toLowerCase();

  for (const [pattern, role] of Object.entries(FIELD_MAPPING)) {
    if (text.includes(pattern.toLowerCase())) return role;
  }

  if (type === "email") return "email";
  if (type === "tel") return "phone";
  if (type === "checkbox") return "agree";
  if (type === "textarea") return "body";

  return "other";
}

async function extractCompanyName(page: Page): Promise<string | null> {
  const title = await page.title();
  const metaTitle = await page.$eval('meta[property="og:site_name"]', el => el.getAttribute("content")).catch(() => null);
  const h1 = await page.$eval("h1", el => el.textContent?.trim()).catch(() => null);

  return metaTitle ?? h1 ?? title ?? null;
}
