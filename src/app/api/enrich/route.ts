import { normalizeUrl } from '@/lib/parseInputFile';
import { enrichJobs } from '@/lib/scraper/enrichJobs';
import type { ScrapedJob } from '@/types/job';
export const runtime = 'nodejs';
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 64000) { await reader.cancel(); return Response.json({ error: 'Request exceeds 64 KB.' }, { status: 413 }); } chunks.push(value); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!Array.isArray(body.jobs) || !body.jobs.length || body.jobs.length > 12) throw new Error('Invalid jobs');
    const jobs: ScrapedJob[] = body.jobs.map((job: unknown) => {
      if (!job || typeof job !== 'object' || !('title' in job) || !('url' in job) || !('sourceUrl' in job) || typeof job.title !== 'string' || !job.title.trim() || job.title.length > 180 || typeof job.url !== 'string' || typeof job.sourceUrl !== 'string') throw new Error('Invalid job');
      return { title: job.title.trim(), url: normalizeUrl(job.url), sourceUrl: normalizeUrl(job.sourceUrl) };
    });
    return Response.json({ jobs: await enrichJobs(jobs) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Provide 1–12 valid job records.' }, { status: 400 }); }
}
