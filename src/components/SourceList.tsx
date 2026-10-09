import type { SourceResult } from '@/types/job';
export default function SourceList({ urls, sources }: { urls: string[]; sources?: SourceResult[] }) {
  return <ul className="mt-4 max-h-64 overflow-auto divide-y divide-slate-100 text-sm">{urls.map(url => {
    const result = sources?.find(s => s.url === url);
    return <li key={url} className="flex flex-wrap items-center justify-between gap-2 py-3"><a className="min-w-0 break-all text-slate-600 hover:text-blue-700" href={url} target="_blank" rel="noopener noreferrer">{url}</a>{result && <span className={result.status === 'failed' ? 'text-red-700' : 'text-emerald-700'}>{result.status === 'failed' ? `✕ ${result.error}` : `✓ ${result.jobsFound} jobs${result.message ? ` — ${result.message}` : ''}`}</span>}</li>;
  })}</ul>;
}
