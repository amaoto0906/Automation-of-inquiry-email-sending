import type { OutreachStatus } from "./types";

export const recentLogs: Array<{
  company: string;
  domain: string;
  user: string;
  date: string;
  status: OutreachStatus;
}> = [
  { company: "株式会社ネクサス", domain: "nexus-example.jp", user: "佐藤 美咲", date: "13:42", status: "sent" },
  { company: "東都デザイン合同会社", domain: "toto-design.example", user: "山田 太郎", date: "13:18", status: "manual_check" },
  { company: "青葉テクノロジー株式会社", domain: "aoba-tech.example", user: "佐藤 美咲", date: "12:55", status: "sent" },
  { company: "株式会社アーバンリンク", domain: "urban-link.example", user: "鈴木 健", date: "11:34", status: "failed" },
];

export const keywords = [
  { id: "kw-001", name: "東京 Web制作会社", urls: 128, forms: 84, sent: 42, active: true, updated: "2026/06/29 13:20" },
  { id: "kw-002", name: "大阪 SaaS 導入支援", urls: 96, forms: 61, sent: 28, active: true, updated: "2026/06/28 17:45" },
  { id: "kw-003", name: "採用コンサルティング 企業", urls: 75, forms: 49, sent: 12, active: true, updated: "2026/06/27 09:10" },
  { id: "kw-004", name: "ECサイト 制作会社", urls: 52, forms: 31, sent: 0, active: false, updated: "2026/06/24 15:32" },
];

export const searchResults: Array<{
  company: string;
  url: string;
  keyword: string;
  found: string;
  status: OutreachStatus;
}> = [
  { company: "株式会社ネクサス", url: "https://nexus-example.jp", keyword: "東京 Web制作会社", found: "3分前", status: "form_found" },
  { company: "東都デザイン合同会社", url: "https://toto-design.example", keyword: "東京 Web制作会社", found: "8分前", status: "captcha_detected" },
  { company: "青葉テクノロジー株式会社", url: "https://aoba-tech.example", keyword: "大阪 SaaS 導入支援", found: "18分前", status: "contact_page_found" },
  { company: "株式会社サンプルワークス", url: "https://sampleworks.example", keyword: "採用コンサルティング 企業", found: "24分前", status: "excluded" },
  { company: "京浜パートナーズ", url: "https://keihin-partners.example", keyword: "東京 Web制作会社", found: "31分前", status: "no_form" },
];

export const contactPages: Array<{
  company: string;
  page: string;
  fields: number;
  checked: string;
  status: OutreachStatus;
}> = [
  { company: "株式会社ネクサス", page: "/contact", fields: 7, checked: "13:37", status: "approved" },
  { company: "東都デザイン合同会社", page: "/inquiry", fields: 8, checked: "13:12", status: "manual_check" },
  { company: "青葉テクノロジー株式会社", page: "/contact-us", fields: 6, checked: "12:49", status: "form_found" },
  { company: "株式会社アーバンリンク", page: "/support/form", fields: 9, checked: "11:28", status: "failed" },
];

export const manualChecks = [
  { company: "東都デザイン合同会社", reason: "CAPTCHAが検出されました", owner: "山田 太郎", date: "13:18", priority: "高" },
  { company: "北斗ソリューションズ", reason: "入力項目を特定できません", owner: "未割当", date: "10:42", priority: "中" },
  { company: "株式会社ライトパス", reason: "過去の送信履歴があります", owner: "佐藤 美咲", date: "昨日 16:08", priority: "高" },
];

export const users = [
  { name: "佐藤 美咲", email: "misaki.sato@example.jp", role: "管理者", status: "利用中", lastSeen: "2分前", initials: "佐" },
  { name: "山田 太郎", email: "taro.yamada@example.jp", role: "メンバー", status: "利用中", lastSeen: "18分前", initials: "山" },
  { name: "鈴木 健", email: "ken.suzuki@example.jp", role: "メンバー", status: "利用中", lastSeen: "昨日 17:24", initials: "鈴" },
];
