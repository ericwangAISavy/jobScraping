import { companyName } from './dashboard';
import type { ScrapedJob } from '../types/job';
export type JobFilters = { query: string; location: string; country: string; workType: string; grade: string; employmentType: string; currency: string; period: string; minSalary: string; maxSalary: string };
export const EMPTY_FILTERS: JobFilters = { query:'',location:'',country:'',workType:'',grade:'',employmentType:'',currency:'',period:'',minSalary:'',maxSalary:'' };
export function filterJobs(jobs: ScrapedJob[], f: JobFilters): ScrapedJob[] {
  const match = (values: string[] | undefined, value: string) => !value || (value === '__unknown' ? !values?.length : values?.includes(value));
  return jobs.filter(j => {
    if (!`${j.title} ${companyName(j)} ${j.sourceUrl} ${j.locations?.join(' ') ?? ''} ${j.countries?.join(' ') ?? ''}`.toLowerCase().includes(f.query.toLowerCase())) return false;
    if (!match(j.locations,f.location) || !match(j.countries,f.country) || !match(j.workTypes,f.workType) || !match(j.grade ? [j.grade] : [],f.grade) || !match(j.employmentType ? [j.employmentType] : [],f.employmentType)) return false;
    if (f.currency && j.salary?.currency !== f.currency || f.period && j.salary?.period !== f.period) return false;
    if (f.minSalary || f.maxSalary) {
      // Never compare unlike currencies/pay periods or silently assume units.
      if (!f.currency || !f.period || !j.salary || (j.salary.min === undefined && j.salary.max === undefined)) return false;
      if (f.minSalary && (j.salary.max ?? j.salary.min ?? 0) < Number(f.minSalary)) return false;
      if (f.maxSalary && (j.salary.min ?? j.salary.max ?? Infinity) > Number(f.maxSalary)) return false;
    }
    return true;
  });
}
