import { MAX_FILE_SIZE, MAX_SOURCES, normalizeUrl } from '@/lib/parseInputFile';
import { scrapePage, validateTarget } from '@/lib/scraper/scrapePage';
import type { ScrapedJob, SourceResult } from '@/types/job';
export const runtime = 'nodejs';
export const maxDuration = 600;
export async function POST(request: Request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: 'Request body is required.' }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_FILE_SIZE) { await reader.cancel(); return Response.json({ error: 'Request exceeds 1 MB.' }, { status: 413 }); }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || !('urls' in body) || !Array.isArray(body.urls) || !body.urls.length || body.urls.length > MAX_SOURCES || body.urls.some(u => typeof u !== 'string')) return Response.json({ error: 'Provide between 1 and 100 careers page URLs.' }, { status: 400 });
    const urls = [...new Set((body.urls as string[]).map(u => normalizeUrl(u.trim())))];
    const sources: SourceResult[] = new Array(urls.length);
    const jobs = new Map<string, ScrapedJob>(); let index = 0;
    await Promise.all(Array.from({ length: Math.min(3, urls.length) }, async () => {
      while (index < urls.length) {
        const i = index++;
        try { validateTarget(urls[i]); } catch (error) { sources[i] = { url: urls[i], status: 'failed', jobsFound: 0, error: (error as Error).message }; continue; }
        const result = await scrapePage(urls[i]); sources[i] = result.source;
        for (const job of result.jobs) { const old = jobs.get(job.url); if (!old || job.title.length > old.title.length) jobs.set(job.url, job); }
      }
    }));
    return Response.json({ sources, jobs: [...jobs.values()] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Invalid request. Provide valid HTTP or HTTPS careers page URLs.' }, { status: 400 }); }
}
