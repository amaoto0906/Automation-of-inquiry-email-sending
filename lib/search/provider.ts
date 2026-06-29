export interface SearchResult {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  position: number;
}

export interface SearchProvider {
  search(query: string, region?: string): Promise<SearchResult[]>;
}
