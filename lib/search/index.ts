import { SearchProvider } from "./provider";
import { MockSearchProvider } from "./mock-provider";
import { SerpApiProvider } from "./serp-provider";

export function getSearchProvider(): SearchProvider {
  const provider = process.env.SEARCH_PROVIDER ?? "mock";

  if (provider === "serpapi") {
    const key = process.env.SERPAPI_API_KEY;
    if (!key) throw new Error("SERPAPI_API_KEY が設定されていません");
    return new SerpApiProvider(key);
  }

  return new MockSearchProvider();
}

export type { SearchProvider } from "./provider";
