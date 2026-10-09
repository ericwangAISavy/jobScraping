export type ScrapedJob = { title: string; url: string; sourceUrl: string; company?: string };
export type SourceResult = { url: string; status: 'success' | 'failed'; jobsFound: number; error?: string; message?: string };
export type ScrapeResult = { sources: SourceResult[]; jobs: ScrapedJob[] };
