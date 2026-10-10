import type { ScrapeResult } from '../types/job';
import { normalizeUrl } from './parseInputFile';
export const STORAGE_KEY = 'job-scraper-results-v2';
export function readLocalResults(value: string | null): ScrapeResult | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed.version !== 2 || !Array.isArray(parsed.result?.jobs) || !Array.isArray(parsed.result?.sources)) return null;
    if (parsed.result.scrapedAt !== undefined && (typeof parsed.result.scrapedAt !== 'string' || !Number.isFinite(Date.parse(parsed.result.scrapedAt)))) return null;
    // Only restore records produced by this version; validate outbound link schemes.
    for (const job of parsed.result.jobs) {
      if (typeof job.title !== 'string' || typeof job.url !== 'string' || typeof job.sourceUrl !== 'string') return null;
      if (job.seen !== undefined && typeof job.seen !== 'boolean') return null;
      normalizeUrl(job.url); normalizeUrl(job.sourceUrl);
      for (const key of ['company','grade','employmentType','metadataError','postedAt','department']) if (job[key] !== undefined && typeof job[key] !== 'string') return null;
      if (job.salary !== undefined) {
        if (!job.salary || typeof job.salary.text !== 'string') return null;
        for (const key of ['currency','period']) if (job.salary[key] !== undefined && typeof job.salary[key] !== 'string') return null;
        for (const key of ['min','max']) if (job.salary[key] !== undefined && (typeof job.salary[key] !== 'number' || !Number.isFinite(job.salary[key]) || job.salary[key] < 0)) return null;
      }
      for (const key of ['locations','countries','workTypes']) if (job[key] !== undefined && (!Array.isArray(job[key]) || job[key].some((v: unknown) => typeof v !== 'string'))) return null;
    }
    for (const source of parsed.result.sources) { if (typeof source.url !== 'string' || !['success','failed','pending'].includes(source.status)) return null; normalizeUrl(source.url); }
    return parsed.result;
  } catch { return null; }
}
