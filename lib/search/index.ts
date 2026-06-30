import { SearchProvider } from "./provider";
import { MockSearchProvider } from "./mock-provider";
import { SerpApiProvider } from "./serp-provider";
import { getSetting } from "@/lib/settings";

export async function getSearchProvider(): Promise<SearchProvider> {
  const provider = (await getSetting("SEARCH_PROVIDER")) ?? "mock";

  if (provider === "serpapi") {
    const key = await getSetting("SERPAPI_API_KEY");
    if (!key) throw new Error("SERPAPI_API_KEY が設定されていません");
    return new SerpApiProvider(key);
  }

  return new MockSearchProvider();
}

export type { SearchProvider } from "./provider";
