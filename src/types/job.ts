export type Salary = { text: string; min?: number; max?: number; currency?: string; period?: string };
export type ScrapedJob = {
  title: string; url: string; sourceUrl: string; company?: string;
  locations?: string[]; countries?: string[]; workTypes?: string[]; grade?: string;
  employmentType?: string; salary?: Salary;
  metadataStatus?: 'pending' | 'success' | 'failed'; metadataError?: string;
};
export type SourceResult = { url: string; status: 'success' | 'failed'; jobsFound: number; error?: string; message?: string };
export type ScrapeResult = { sources: SourceResult[]; jobs: ScrapedJob[] };
