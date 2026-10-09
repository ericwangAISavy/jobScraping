'use client';
import { useState } from 'react';
import type { ScrapedJob } from '@/types/job';
import { exportMarkdown } from '@/lib/exportMarkdown';
import { EMPTY_FILTERS, filterJobs, type JobFilters } from '@/lib/filterJobs';
export default function JobsTable({ jobs }: { jobs: ScrapedJob[] }) {
  const [filters, setFilters] = useState<JobFilters>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const visible = filterJobs(jobs, filters).sort((a,b) => (sort === 'asc' ? 1 : -1) * a.title.localeCompare(b.title));
  const update = (key: keyof JobFilters, value: string) => setFilters(f => ({ ...f, [key]: value, ...((key === 'currency' || key === 'period') && !value ? { minSalary: '', maxSalary: '' } : {}) }));
  const options = (get: (job: ScrapedJob) => string[]) => [...new Set(jobs.flatMap(get))].sort((a,b) => a.localeCompare(b));
  const selects: { key: keyof JobFilters; label: string; values: string[]; unknown?: boolean }[] = [
    { key:'location',label:'Location',values:options(j=>j.locations ?? []),unknown:true },
    { key:'country',label:'Country',values:options(j=>j.countries ?? []),unknown:true },
    { key:'workType',label:'Location type',values:options(j=>j.workTypes ?? []),unknown:true },
    { key:'grade',label:'Grade',values:options(j=>j.grade ? [j.grade] : []),unknown:true },
    { key:'employmentType',label:'Employment type',values:options(j=>j.employmentType ? [j.employmentType] : []),unknown:true },
    { key:'currency',label:'Salary currency',values:options(j=>j.salary?.currency ? [j.salary.currency] : []) },
    { key:'period',label:'Pay period',values:options(j=>j.salary?.period ? [j.salary.period] : []) },
  ];
  function download() { const url = URL.createObjectURL(new Blob([exportMarkdown(visible)], { type:'text/markdown;charset=utf-8' })); const a = document.createElement('a'); a.href=url; a.download='scraped-jobs.md'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  const failed = jobs.filter(j=>j.metadataStatus==='failed').length;
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Discovered roles</h2><p className="mt-1 text-sm text-slate-500">{visible.length} of {jobs.length} jobs · Export includes filtered results</p></div><button onClick={download} disabled={!visible.length} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Export Markdown ↓</button></div>
    <label className="mt-6 block"><span className="sr-only">Search jobs</span><input value={filters.query} onChange={e=>update('query',e.target.value)} placeholder="Search titles, companies, or locations…" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /></label>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{selects.map(s=><label key={s.key} className="text-xs font-medium text-slate-600">{s.label}<select value={filters[s.key]} onChange={e=>update(s.key,e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"><option value="">All</option>{s.values.map(v=><option key={v} value={v}>{v}</option>)}{s.unknown && <option value="__unknown">Unknown</option>}</select></label>)}
      {(['minSalary','maxSalary'] as const).map((key,i)=><label key={key} className="text-xs font-medium text-slate-600">{i===0 ? 'Minimum salary' : 'Maximum salary'}<input type="number" min="0" step="any" disabled={!filters.currency || !filters.period} value={filters[key]} onChange={e=>update(key,e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 p-2.5 text-sm disabled:bg-slate-100" placeholder="No limit" /></label>)}
    </div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Select a currency and pay period to filter salary ranges. Ranges must overlap; no currency conversion.</span><button onClick={()=>setFilters({...EMPTY_FILTERS})} className="text-blue-600 hover:underline">Reset filters</button></div>
    {failed>0 && <p className="mt-4 text-xs text-amber-700">Details could not be read for {failed} jobs. Their links remain available; unavailable fields are Unknown.</p>}
    <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-3"><button onClick={()=>setSort(sort==='asc'?'desc':'asc')}>Job Title {sort==='asc'?'↑':'↓'}</button></th>{['Location / Country','Location type','Grade','Salary','Job URL'].map(v=><th key={v} className="px-3 whitespace-nowrap">{v}</th>)}</tr></thead><tbody>{visible.map(job=><tr key={job.url} className="border-b border-slate-100"><td className="min-w-48 py-4"><p className="font-semibold">{job.title}</p><p className="mt-1 text-xs text-slate-500">{job.company ?? new URL(job.sourceUrl).hostname}</p>{job.metadataStatus==='failed' && <p className="mt-1 text-xs text-amber-700" title={job.metadataError}>Details unavailable</p>}{job.metadataStatus==='pending' && <p className="mt-1 text-xs text-blue-600">Reading details…</p>}</td><td className="px-3"><p>{job.locations?.join('; ') || 'Unknown'}</p><p className="text-xs text-slate-500">{job.countries?.join('; ') || 'Unknown'}</p></td><td className="px-3">{job.workTypes?.join(' / ') || 'Unknown'}</td><td className="px-3">{job.grade || 'Unknown'}</td><td className="min-w-36 px-3">{job.salary?.text || 'Unknown'}</td><td className="px-3"><a href={job.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-blue-600 hover:underline">Open ↗</a></td></tr>)}</tbody></table></div>
    {!visible.length && <p className="py-10 text-center text-sm text-slate-500">{jobs.length?'No jobs match your filters.':'No job listings detected. Check the source statuses above.'}</p>}
  </section>;
}
