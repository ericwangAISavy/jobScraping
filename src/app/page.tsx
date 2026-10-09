'use client';
import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import SourceList from '@/components/SourceList';
import JobsTable from '@/components/JobsTable';
import type { ScrapeResult } from '@/types/job';
export default function Home() {
  const [urls, setUrls] = useState<string[]>([]); const [filename, setFilename] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function scrape() {
    setBusy(true); setError(''); setResult(null);
    try { const response = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Scraping failed.'); setResult(data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to reach the scraper.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
    <header className="mb-10"><div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-widest text-blue-600"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">J</span> CAREER DISCOVERY</div><h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Job Scraper</h1><p className="mt-4 text-slate-500">Upload a list of company careers pages to discover open roles.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 flex items-center gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">01</span><h2 className="text-lg font-semibold">Add your careers pages</h2></div>
      <FileUploader disabled={busy} onLoad={(values, name) => { setUrls(values); setFilename(name); setResult(null); setError(''); }} />
      {!urls.length && <div className="mt-5 text-xs leading-6 text-slate-500">Example file contents:<pre className="mt-1 overflow-auto">https://company-a.com/careers{'\n'}https://company-b.com/jobs</pre></div>}
      {!!urls.length && <><div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{urls.length} careers {urls.length === 1 ? 'page' : 'pages'} loaded</h3><span className="break-all text-xs text-slate-400">{filename}</span></div><SourceList urls={urls} sources={result?.sources} /><div className="mt-5 border-t border-slate-100 pt-5"><button disabled={busy} onClick={() => void scrape()} className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">{busy ? 'Scraping websites…' : 'Scrape Jobs →'}</button><span role="status" aria-live="polite" className="ml-4 text-sm text-slate-500">{busy ? `Processing ${urls.length} websites, up to 3 at a time. This may take a few minutes.` : 'Up to 100 sources per run'}</span></div></>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </section>
    {result && <div className="mt-8 space-y-6"><div className="grid grid-cols-3 gap-4">{[['Sources', result.sources.length],['Successful', result.sources.filter(s => s.status === 'success').length],['Jobs found', result.jobs.length]].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{count}</p></div>)}</div><JobsTable jobs={result.jobs} /></div>}
    <footer className="mt-8 text-center text-xs leading-6 text-slate-400">No accounts. No database. Results stay in this tab and disappear on refresh.<br />Some websites block automated requests or require JavaScript rendering.</footer>
  </main>;
}
