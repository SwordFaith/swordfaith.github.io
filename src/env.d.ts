/// <reference path="../.astro/types.d.ts" />

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: {
    title?: string;
  };
}

interface PagefindSearchResult {
  results: Array<{
    data: () => Promise<PagefindResultData>;
  }>;
}

interface PagefindModule {
  init?: () => void | Promise<void>;
  search: (query: string) => Promise<PagefindSearchResult>;
}
