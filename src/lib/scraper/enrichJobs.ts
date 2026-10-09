import type { ScrapedJob } from '../../types/job';
import { extractMetadata } from './extractMetadata';
import { fetchHtml } from './scrapePage';
export async function enrichJobs(jobs: ScrapedJob[], fetchPage = fetchHtml): Promise<ScrapedJob[]> {
  const result: ScrapedJob[] = new Array(jobs.length); let index = 0;
  await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
    while (index < jobs.length) {
      const i = index++, job = jobs[i];
      try {
        const { html } = await fetchPage(job.url);
        if (!html.trim()) throw new Error('Empty job detail page.');
        if (/enable javascript|javascript (?:is )?required|you need to enable javascript/i.test(html) && !/application\/ld\+json/i.test(html)) throw new Error('Job detail page requires JavaScript rendering.');
        result[i] = { ...job, ...extractMetadata(html, job), metadataStatus: 'success' };
      } catch (e) { result[i] = { ...job, metadataStatus: 'failed', metadataError: e instanceof Error ? e.message : 'Could not read job details.' }; }
    }
  }));
  return result;
}
