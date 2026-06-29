import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("シードデータを投入中...");

  // 管理者ユーザー
  const adminHash = await bcrypt.hash("Admin2026!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@outreach-hub.jp" },
    update: {},
    create: {
      email: "admin@outreach-hub.jp",
      name: "システム管理者",
      passwordHash: adminHash,
      role: "admin",
    },
  });

  // 一般ユーザー
  const memberHash = await bcrypt.hash("Member2026!", 12);
  const member = await prisma.user.upsert({
    where: { email: "member@outreach-hub.jp" },
    update: {},
    create: {
      email: "member@outreach-hub.jp",
      name: "田中 太郎",
      passwordHash: memberHash,
      role: "member",
    },
  });

  // デフォルト問い合わせ文面テンプレート
  const existingTemplate = await prisma.messageTemplate.findFirst({ where: { isDefault: true } });
  if (!existingTemplate) {
    await prisma.messageTemplate.create({
      data: {
        name: "標準営業テンプレート",
        senderCompany: "株式会社サンプル",
        senderName: "山田 花子",
        senderEmail: "contact@sample-company.jp",
        senderPhone: "03-0000-0000",
        subject: "業務効率化のご提案について",
        body: `{{companyName}}
ご担当者様

突然のご連絡失礼いたします。
株式会社サンプルの{{senderName}}と申します。

貴社のウェブサイトを拝見し、弊社のサービスがお役に立てるのではないかとご連絡いたしました。

弊社では、業務効率化・自動化支援のサービスを提供しており、多くのお客様に導入いただいております。

詳細についてご説明の機会をいただけますと幸いです。
お忙しいところ恐縮ですが、ご検討いただけますようお願い申し上げます。

何かご不明な点がございましたら、お気軽にご連絡ください。`,
        signature: `---
{{senderName}}
{{senderCompany}}
{{senderEmail}}
{{senderPhone}}`,
        isActive: true,
        isDefault: true,
      },
    });
  }

  // サンプル除外ルール
  const ruleCount = await prisma.excludeRule.count();
  if (ruleCount === 0) {
    await prisma.excludeRule.createMany({
      data: [
        { ruleType: "no_solicitation", value: "営業目的のご連絡はお断り", memo: "フォーム内の禁止文言" },
        { ruleType: "no_solicitation", value: "営業メールお断り", memo: "フォーム内の禁止文言" },
        { ruleType: "industry", value: "医療・病院", memo: "営業対象外業種" },
        { ruleType: "industry", value: "行政・官公庁", memo: "営業対象外業種" },
      ],
    });
  }

  // サンプル検索キーワード
  const kwCount = await prisma.keyword.count();
  if (kwCount === 0) {
    await prisma.keyword.createMany({
      data: [
        { name: "東京 Web制作会社", query: "東京 Web制作会社", region: "jp", isActive: true, createdById: admin.id },
        { name: "大阪 SaaS 導入支援", query: "大阪 SaaS 導入支援", region: "jp", isActive: true, createdById: admin.id },
      ],
    });
  }

  // アプリ設定
  await prisma.appSetting.upsert({
    where: { key: "send_delay_seconds" },
    update: {},
    create: { key: "send_delay_seconds", value: "5" },
  });
  await prisma.appSetting.upsert({
    where: { key: "max_sends_per_day" },
    update: {},
    create: { key: "max_sends_per_day", value: "50" },
  });

  console.log("✅ シードデータ投入完了");
  console.log("===================================");
  console.log("管理者ログイン情報:");
  console.log("  Email   : admin@outreach-hub.jp");
  console.log("  Password: Admin2026!");
  console.log("-----------------------------------");
  console.log("メンバーログイン情報:");
  console.log("  Email   : member@outreach-hub.jp");
  console.log("  Password: Member2026!");
  console.log("===================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
