'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { readLocalResults, STORAGE_KEY } from '@/lib/localResults';
import FileUploader from '@/components/FileUploader';
import { IconBriefcase, IconSearch, IconFilter, IconChevronDown, IconFileDescription, IconBuilding, IconClock, IconArrowRight, IconPlus, IconDotsVertical, IconX, IconCheck, IconBell, IconInfoCircle, IconCloudUpload, IconWorld, IconBolt, IconChartBar } from '@tabler/icons-react';
import { companyName, relativeScrapeTime } from '@/lib/dashboard';
import { parseInputFile } from '@/lib/parseInputFile';
import JobsTable from '@/components/JobsTable';
import type { ScrapeResult } from '@/types/job';
export default function Home() {
  const [urls, setUrls] = useState<string[]>([]); const [filename, setFilename] = useState('');
  const [result, setResult] = useState<ScrapeResult | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [progress, setProgress] = useState(''); const [storageNotice, setStorageNotice] = useState('');
  const [query,setQuery] = useState(''); const [companySearch,setCompanySearch] = useState(''); const [advanced,setAdvanced] = useState(false); const [sourceInput,setSourceInput] = useState(''); const [sourceError,setSourceError] = useState('');
  const sourceDialog = useRef<HTMLDialogElement>(null); const seen = useRef(new Map<string,boolean>());
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = readLocalResults(localStorage.getItem(STORAGE_KEY));
        if (saved) {
          saved.jobs = saved.jobs.map(j => j.metadataStatus === 'pending' ? { ...j, metadataStatus: 'failed', metadataError: 'Detail extraction was interrupted. Scrape again to retry.' } : j);
          saved.jobs.forEach(j=>seen.current.set(j.url,!!j.seen));
          setResult(saved); setUrls(saved.sources.map(s => s.url)); setFilename('Saved browser results');
        }
      } catch { setStorageNotice('Browser storage is unavailable. Results will only remain in this tab.'); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('global-job-search')?.focus(); }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  function save(value: ScrapeResult) {
    setResult(value);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, result: value })); setStorageNotice(''); }
    catch { setStorageNotice('Could not save results locally (storage unavailable or full). Keep this tab open.'); }
  }
  function clearSaved() {
    seen.current.clear();
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
      let current: ScrapeResult = { ...data, scrapedAt: new Date().toISOString(), jobs: data.jobs.map((j: ScrapeResult['jobs'][number]) => ({ ...j, seen: seen.current.get(j.url) ?? false, metadataStatus: 'pending' })) };
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
        current = { ...current, jobs: current.jobs.map(j => ({ ...(updates.get(j.url) ?? j), seen: seen.current.get(j.url) ?? false })) };
        save(current);
      }
      setProgress(`Read ${current.jobs.length} job detail pages.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to reach the scraper.'); }
    finally { setBusy(false); }
  }
  function markSeen(url:string,value:boolean) { seen.current.set(url,value); if(result)save({...result,jobs:result.jobs.map(j=>j.url===url?{...j,seen:value}:j)}); }
  function removeSource(url:string) { setUrls(v=>v.filter(u=>u!==url)); if(result)save({...result,sources:result.sources.filter(s=>s.url!==url),jobs:result.jobs.filter(j=>j.sourceUrl!==url)}); }
  function addSources() { const parsed=parseInputFile(sourceInput);const combined=[...new Set([...urls,...parsed.urls])];if(parsed.errors.length||!parsed.urls.length||combined.length>100){setSourceError(parsed.errors[0]||'Enter valid URLs, up to 100 sources total.');return;}setUrls(combined); const previous=result??{jobs:[],sources:[]};save({...previous,sources:[...previous.sources,...combined.filter(url=>!previous.sources.some(s=>s.url===url)).map(url=>({url,status:'pending' as const,jobsFound:0}))]});setSourceInput('');setSourceError('');sourceDialog.current?.close(); }
  const sourceName=(url:string)=>companyName(result?.jobs.find(j=>j.sourceUrl===url)??{sourceUrl:url});
  const companiesWithJobs = new Set(result?.jobs.map(companyName)??[]).size;
  return <div>
    <main className="dashboard-body p-6 pt-[18px]"><div className="dashboard-grid grid grid-cols-[minmax(310px,26.2%)_minmax(0,1fr)] items-start gap-[14px]">
      <aside className="dashboard-sidebar min-w-0 space-y-[14px]">
      <div className="brand flex shrink-0 items-center gap-4"><Image src="/assets/neon-logo.png" width={54} height={54} alt="" className="brand-logo"/><div><h1 className="text-[25px] font-bold tracking-tight">Job Scraper</h1><span className="brand-subtitle text-sm text-[var(--muted)]">Turn company careers pages<br/>into opportunities</span></div></div>
        <section className="panel upload-panel p-[18px]"><div className="mb-4 flex items-start gap-4"><div className="icon-tile upload-header-icon"><IconCloudUpload size={28}/></div><div><h2 className="text-base font-bold">Upload careers pages</h2><p className="mt-1 text-xs text-[var(--muted)]">Add company careers pages to scrape for job listings.</p></div></div>
          <FileUploader disabled={busy} onLoad={(values,name)=>{setUrls(values);setFilename(name);clearSaved();setError('');setQuery('');setProgress('');}}/>
          <button className="primary mt-3 w-full" disabled={busy||!urls.length} onClick={()=>void scrape()}>{busy?'Scraping…':'Scrape Jobs'}<IconArrowRight size={18}/></button>
          <p role="status" className="mt-2 text-center text-[11px] text-[var(--muted)]">{busy?progress:'Up to 100 sources per run'}</p>{filename&&<span className="sr-only">{filename}</span>}
          {error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
        </section>
        <section className="panel companies-panel p-[18px]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-4 text-base font-bold"><IconBuilding size={26} className="text-[#0090ff]"/>Companies</h2><span className="text-xs text-[#334567]">{urls.length} sources loaded</span></div>
          <label className="search-wrap block"><span className="sr-only">Search companies</span><IconSearch size={16}/><input className="control" placeholder="Search companies…" value={companySearch} onChange={e=>setCompanySearch(e.target.value)}/></label>
          <ul className="mt-2 max-h-[284px] overflow-y-auto pr-1">{urls.filter(url=>`${sourceName(url)} ${url}`.toLowerCase().includes(companySearch.toLowerCase())).map(url=>{const source=result?.sources.find(s=>s.url===url);const name=sourceName(url);const count=result?.jobs.filter(j=>j.sourceUrl===url).length??0;return <li key={url} className="flex items-center gap-3 border-b border-[#edf1f7] py-2"><span className="company-avatar" data-tone={name.charCodeAt(0)%4}>{name[0]}</span><button className="min-w-0 flex-1 text-left" onClick={()=>setQuery(name)}><p className="truncate text-xs leading-[15px] font-semibold">{name}</p><p className="mt-0.5 truncate text-[10px] leading-[13px] text-[var(--muted)]" title={url}>{url}</p></button><span title={source?.error||source?.message} className={count?'status-new':'status-seen'}>{count>0&&<IconCheck size={11} className="mr-1 inline"/>}{source?.status==='failed'?'Failed':source?.status==='pending'?'Ready':`${count} ${count===1?'job':'jobs'}`}</span><details className="row-menu"><summary aria-label={`Actions for ${name}`}><IconDotsVertical size={16}/></summary><div className="row-menu-content"><a href={url} target="_blank" rel="noopener noreferrer">Open careers page</a><button disabled={busy} onClick={()=>removeSource(url)}>Remove source</button></div></details></li>;})}</ul>
          {!urls.length&&<p className="py-10 text-center text-xs text-[var(--muted)]">Upload a file or add your first source.</p>}{urls.length>0&&!urls.some(url=>`${sourceName(url)} ${url}`.toLowerCase().includes(companySearch.toLowerCase()))&&<p className="py-8 text-center text-xs text-[var(--muted)]">No companies match.</p>}
          <button className="add-source-button mt-5 flex items-center gap-2 text-xs text-[var(--blue)]" disabled={busy} onClick={()=>sourceDialog.current?.showModal()}><IconPlus size={17}/>Add more sources</button>
        </section>
      </aside>
      <div className="dashboard-main min-w-0 space-y-4">
    <header className="app-header flex h-[62px] items-center gap-5 border-b border-[#e2e9f4] bg-white px-8">

      <label className="app-header-search search-wrap ml-auto min-w-0 flex-1 xl:max-w-[700px]"><span className="sr-only">Global job search</span><IconSearch size={18}/><input id="global-job-search" className="control" placeholder="Search jobs by title, company, or location…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd className="search-shortcut" aria-hidden="true">⌘ K</kbd></label>
      <button className="quiet-button shrink-0 text-xs" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}><IconFilter size={18} className="text-[var(--blue)]"/>Filter<IconChevronDown size={14}/></button>
      <details className="row-menu notification-menu"><summary aria-label="Scrape notifications"><IconBell size={25}/></summary><div className="row-menu-content"><p className="p-2 text-xs">{busy?progress:result?`${result.jobs.length} jobs in your saved results.`:'No scrape activity yet.'}</p><p className="p-2 text-xs text-[var(--muted)]">{result?.jobs.filter(j=>j.metadataStatus==='failed').length??0} detail pages unavailable</p></div></details>
      <details className="row-menu"><summary className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--blue)] text-white" aria-label="Local data settings"><span className="text-xl font-semibold">J</span></summary><div className="row-menu-content"><p className="p-2 text-xs text-[var(--muted)]">Saved in this browser</p><button disabled={busy} onClick={clearSaved}>Clear saved results</button></div></details>
    </header>
<section className="global-hero" aria-label="Discover global opportunities"><div className="hero-copy"><h2>Global talent<br/>starts <span>here.</span></h2><p>Scrape company careers pages, discover new opportunities<br className="hero-break"/> and track jobs from around the world.</p><div className="hero-features"><div><IconWorld/><span>Multiple sources<br/>in one place</span></div><div><IconBolt/><span>Fast &amp; reliable<br/>scraping</span></div><div><IconChartBar/><span>Always up-to-date<br/>job listings</span></div></div></div><p className="hero-aside">More<br/>opportunities.<br/><span>A brighter<br/>tomorrow.</span></p></section>
        <section className="stats-grid grid grid-cols-4 gap-[14px]" aria-label="Scraping summary">{[
          {label:'Total Sources',value:urls.length,description:'careers pages loaded',icon:IconFileDescription,tone:'blue'},
          {label:'Total Jobs Found',value:result?.jobs.length??0,description:'across all companies',icon:IconBriefcase,tone:'green'},
          {label:'Companies with Jobs',value:companiesWithJobs,description:`of ${urls.length} sources`,icon:IconBuilding,tone:'blue'},
          {label:'Last Scraped',value:result?.scrapedAt?relativeScrapeTime(result.scrapedAt):'Not yet',description:result?.scrapedAt?new Date(result.scrapedAt).toLocaleString(): 'Start your first scrape',icon:IconClock,tone:'purple'}
        ].map(stat=><div key={stat.label} className="stat-card panel flex min-h-[109px] items-start gap-5 p-[18px]" data-tone={stat.tone}><div className="icon-tile" ><stat.icon size={29} stroke={1.7}/></div><div className="min-w-0 pt-1"><p className="text-[11px] leading-[14px] text-[#415278]">{stat.label}</p><p className={`mt-1 font-bold leading-tight tracking-tight ${stat.label==='Last Scraped'?'text-base':'text-[23px]'}`}>{stat.value}</p><p className="mt-1 text-[11px] leading-[14px] text-[#8291b0]">{stat.description}</p></div></div>)}</section>
        <JobsTable jobs={result?.jobs??[]} query={query} onQuery={setQuery} advanced={advanced} onSeen={markSeen}/>
        {storageNotice&&<p role="status" className="text-xs text-amber-700">{storageNotice}</p>}
        <p className="dashboard-note flex items-center gap-2 text-[11px] text-[var(--muted)]"><IconInfoCircle size={16} className="shrink-0"/>Stored in this browser. Some websites require JavaScript or block scraping. Posted dates appear only when provided by the job page.</p>
      </div>
    </div></main>
    <dialog ref={sourceDialog}><div className="flex justify-between gap-4"><h2 className="text-lg font-semibold">Add careers pages</h2><button aria-label="Close add sources" onClick={()=>sourceDialog.current?.close()}><IconX size={20}/></button></div><label className="mt-5 block text-sm">One careers-page URL per line<textarea className="control mt-2 h-40" value={sourceInput} onChange={e=>setSourceInput(e.target.value)} placeholder="https://company.com/careers"/></label>{sourceError&&<p role="alert" className="mt-2 text-red-700">{sourceError}</p>}<button className="primary mt-4" onClick={addSources}>Add sources</button></dialog>
  </div>;
}
