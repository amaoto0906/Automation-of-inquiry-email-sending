import { SearchProvider, SearchResult } from "./provider";
import { extractDomain } from "@/lib/utils";

const MOCK_DOMAINS = [
  "example-web.co.jp", "techsupport.jp", "sampleworks.example",
  "digital-agency.jp", "it-solutions.co.jp", "web-create.jp",
  "nexus-example.jp", "aoba-tech.example", "urban-link.example",
  "light-path.example", "tokyo-design.jp", "osaka-solutions.jp",
];

const COMPANIES = [
  "株式会社ネクサス", "東都デザイン合同会社", "青葉テクノロジー株式会社",
  "株式会社アーバンリンク", "ライトパス株式会社", "東京デザイン株式会社",
  "大阪ソリューションズ株式会社", "ITサポート合同会社", "デジタルエージェンシー株式会社",
  "ウェブクリエイト株式会社", "サンプルワークス株式会社", "テックサポート合同会社",
];

export class MockSearchProvider implements SearchProvider {
  async search(query: string, region?: string): Promise<SearchResult[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const count = 8 + Math.floor(Math.random() * 5);
    const results: SearchResult[] = [];

    for (let i = 0; i < count; i++) {
      const domain = MOCK_DOMAINS[i % MOCK_DOMAINS.length];
      const company = COMPANIES[i % COMPANIES.length];
      results.push({
        url: `https://${domain}`,
        domain,
        title: `${company} - ${query}`,
        snippet: `${company}は${query}に関するサービスを提供しています。詳しくはお問い合わせください。`,
        position: i + 1,
      });
    }

    return results;
  }
}
