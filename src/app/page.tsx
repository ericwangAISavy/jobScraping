'use client';
import { useEffect, useState } from 'react';
import { readLocalResults, STORAGE_KEY } from '@/lib/localResults';
import FileUploader from '@/components/FileUploader';
import SourceList from '@/components/SourceList';
import JobsTable from '@/components/JobsTable';
import type { ScrapeResult } from '@/types/job';
export default function Home() {
  const [urls, setUrls] = useState<string[]>([]); const [filename, setFilename] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [progress, setProgress] = useState(''); const [storageNotice, setStorageNotice] = useState('');
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = readLocalResults(localStorage.getItem(STORAGE_KEY));
        if (saved) {
          saved.jobs = saved.jobs.map(j => j.metadataStatus === 'pending' ? { ...j, metadataStatus: 'failed', metadataError: 'Detail extraction was interrupted. Scrape again to retry.' } : j);
          setResult(saved); setUrls(saved.sources.map(s => s.url)); setFilename('Saved browser results');
        }
      } catch { setStorageNotice('Browser storage is unavailable. Results will only remain in this tab.'); }
    });
    return () => { active = false; };
  }, []);
  function save(value: ScrapeResult) {
    setResult(value);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, result: value })); setStorageNotice(''); }
    catch { setStorageNotice('Could not save results locally (storage unavailable or full). Keep this tab open.'); }
  }
  function clearSaved() {
    setResult(null);
    try { localStorage.removeItem(STORAGE_KEY); setStorageNotice(''); }
    catch { setStorageNotice('Could not clear browser storage. Clear site data in your browser settings.'); }
  }
  async function scrape() {
    setBusy(true); setError(''); setProgress('Discovering job links…');
    try {
      const response = await fetch('/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Scraping failed.');
      let current: ScrapeResult = { ...data, jobs: data.jobs.map((j: ScrapeResult['jobs'][number]) => ({ ...j, metadataStatus: 'pending' })) };
      save(current);
      // Small batches avoid one long-running enrichment request. Three detail
      // pages are fetched concurrently on the server; batches run sequentially.
      for (let i = 0; i < current.jobs.length; i += 12) {
        setProgress(`Reading job details: ${i} / ${current.jobs.length} complete…`);
        const batch = current.jobs.slice(i, i + 12);
        let enriched: ScrapeResult['jobs'];
        try {
          const res = await fetch('/api/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobs: batch.map(({ title, url, sourceUrl }) => ({ title, url, sourceUrl })) }) });
          const details = await res.json();
          if (!res.ok) throw new Error(details.error ?? 'Could not read job details.');
          enriched = details.jobs;
        } catch (e) { enriched = batch.map(j => ({ ...j, metadataStatus: 'failed', metadataError: e instanceof Error ? e.message : 'Could not read job details.' })); }
        const updates = new Map(enriched.map(j => [j.url, j]));
        current = { ...current, jobs: current.jobs.map(j => updates.get(j.url) ?? j) };
        save(current);
      }
      setProgress(`Read ${current.jobs.length} job detail pages.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to reach the scraper.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl px-5 py-10 sm:py-16">
    <header className="mb-10"><div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-widest text-blue-600"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">J</span> CAREER DISCOVERY</div><h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Job Scraper</h1><p className="mt-4 text-slate-500">Upload a list of company careers pages to discover open roles.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 flex items-center gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">01</span><h2 className="text-lg font-semibold">Add your careers pages</h2></div>
      <FileUploader disabled={busy} onLoad={(values, name) => { setUrls(values); setFilename(name); clearSaved(); setError(''); setProgress(''); }} />
      {!urls.length && <div className="mt-5 text-xs leading-6 text-slate-500">Example file contents:<pre className="mt-1 overflow-auto">https://company-a.com/careers{'\n'}https://company-b.com/jobs</pre></div>}
      {!!urls.length && <><div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{urls.length} careers {urls.length === 1 ? 'page' : 'pages'} loaded</h3><span className="break-all text-xs text-slate-400">{filename}</span></div><SourceList urls={urls} sources={result?.sources} /><div className="mt-5 border-t border-slate-100 pt-5"><button disabled={busy} onClick={() => void scrape()} className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">{busy ? 'Scraping websites…' : 'Scrape Jobs →'}</button><span role="status" aria-live="polite" className="ml-4 text-sm text-slate-500">{busy ? progress : 'Up to 100 sources per run'}</span></div></>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </section>
    {storageNotice && <p role="status" className="mt-4 text-sm text-amber-700">{storageNotice}</p>}
    {result && <div className="mt-8 space-y-6"><div className="grid grid-cols-3 gap-4">{[['Sources', result.sources.length],['Successful', result.sources.filter(s => s.status === 'success').length],['Jobs found', result.jobs.length]].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{count}</p></div>)}</div><JobsTable jobs={result.jobs} /><button disabled={busy} onClick={clearSaved} className="text-sm text-slate-500 underline">Clear saved results</button></div>}
    <footer className="mt-8 text-center text-xs leading-6 text-slate-400">No accounts. No database. Results and job metadata are saved in this browser until you clear them.<br />Some websites block automated requests or require JavaScript rendering.</footer>
  </main>;
}
