import { SearchProvider, SearchResult } from "./provider";
import { extractDomain } from "@/lib/utils";

export class SerpApiProvider implements SearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, region?: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      hl: "ja",
      gl: region ?? "jp",
      num: "20",
    });

    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!response.ok) {
      throw new Error(`SerpAPI エラー: ${response.status}`);
    }

    const data = await response.json();
    const organicResults = (data.organic_results ?? []) as Array<{
      link: string; title: string; snippet: string; position: number;
    }>;

    return organicResults.map((r) => ({
      url: r.link,
      domain: extractDomain(r.link),
      title: r.title,
      snippet: r.snippet ?? "",
      position: r.position,
    }));
  }
}
