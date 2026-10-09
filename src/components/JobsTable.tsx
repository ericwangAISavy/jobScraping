'use client';
import { useState } from 'react';
import type { ScrapedJob } from '@/types/job';
import { exportMarkdown } from '@/lib/exportMarkdown';
export default function JobsTable({ jobs }: { jobs: ScrapedJob[] }) {
  const [query, setQuery] = useState(''); const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const visible = jobs.filter(j => `${j.title} ${j.company ?? ''} ${j.sourceUrl} ${j.url}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => (sort === 'asc' ? 1 : -1) * a.title.localeCompare(b.title));
  function download() { const url = URL.createObjectURL(new Blob([exportMarkdown(jobs)], { type: 'text/markdown;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'scraped-jobs.md'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Discovered roles</h2><p className="mt-1 text-sm text-slate-500">{visible.length} of {jobs.length} jobs · Export includes all results</p></div><button onClick={download} disabled={!jobs.length} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Export Markdown ↓</button></div>
    <label className="mt-6 block"><span className="sr-only">Search jobs</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search jobs, companies, or sources…" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /></label>
    <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-3"><button onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>Job Title {sort === 'asc' ? '↑' : '↓'}</button></th><th className="px-4">Source</th><th>Job URL</th></tr></thead><tbody>{visible.map(job => <tr key={job.url} className="border-b border-slate-100"><td className="py-4 font-semibold">{job.title}</td><td className="px-4 text-slate-500">{job.company ?? new URL(job.sourceUrl).hostname}</td><td><a href={job.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-blue-600 hover:underline">Open ↗</a></td></tr>)}</tbody></table></div>
    {!visible.length && <p className="py-10 text-center text-sm text-slate-500">{jobs.length ? 'No jobs match your search.' : 'No job listings detected. Check the source statuses above.'}</p>}
  </section>;
}
