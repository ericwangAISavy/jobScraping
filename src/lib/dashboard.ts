import type { ScrapedJob } from '../types/job';
export const CATEGORIES = ['Engineering','Product','Design','Marketing','Sales','Operations','Other'] as const;
export function companyName(job: Pick<ScrapedJob, 'sourceUrl' | 'company'>): string {
  if (job.company) return job.company;
  const host = new URL(job.sourceUrl).hostname.replace(/^www\./,'');
  const name = host.split('.')[0].replace(/[-_]/g,' ');
  return name.replace(/\b\w/g,c=>c.toUpperCase());
}
export function jobCategory(job: ScrapedJob): string {
  const title = `${job.department ?? ''} ${job.title}`;
  if (/design|ux|ui\b/i.test(title)) return 'Design';
  if (/product|program manager/i.test(title)) return 'Product';
  if (/marketing|content|seo|brand/i.test(title)) return 'Marketing';
  if (/sales|account executive|business development/i.test(title)) return 'Sales';
  if (/engineer|developer|scientist|research|technical|devops|architect/i.test(title)) return 'Engineering';
  if (/operations|finance|recruit|hr\b|people|legal|accountant|administration/i.test(title)) return 'Operations';
  return 'Other';
}
export function paginate<T>(items: T[], requestedPage: number, pageSize = 10) {
  const pages = Math.max(1,Math.ceil(items.length/pageSize));
  const page = Math.min(Math.max(1,requestedPage),pages);
  return { items:items.slice((page-1)*pageSize,page*pageSize),page,pages,start:items.length ? (page-1)*pageSize+1 : 0,end:Math.min(page*pageSize,items.length) };
}
export function relativeDate(value?: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unknown';
  const days = Math.floor((Date.now()-Date.parse(value))/86400000);
  return days < 0 ? new Date(value).toLocaleDateString() : days===0 ? 'Today' : days===1 ? '1 day ago' : days<7 ? `${days} days ago` : days<30 ? `${Math.floor(days/7)} ${Math.floor(days/7)===1?'week':'weeks'} ago` : new Date(value).toLocaleDateString();
}

export function relativeScrapeTime(value: string): string {
  const minutes = Math.max(0, Math.floor((Date.now()-Date.parse(value))/60000));
  if (!Number.isFinite(minutes)) return 'Unknown';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} ${minutes===1?'minute':'minutes'} ago`;
  if (minutes < 1440) return `${Math.floor(minutes/60)} ${Math.floor(minutes/60)===1?'hour':'hours'} ago`;
  return relativeDate(value);
}
