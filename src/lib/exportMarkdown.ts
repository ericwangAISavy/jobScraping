import type { ScrapedJob } from '@/types/job';
export function exportMarkdown(jobs: ScrapedJob[]): string {
  return jobs.map(job => `[${job.title.replace(/\\/g, '\\\\').replace(/[\[\]]/g, '\\$&').replace(/[\r\n]+/g, ' ')}](${job.url.replace(/\(/g, '%28').replace(/\)/g, '%29')})`).join('\n');
}
