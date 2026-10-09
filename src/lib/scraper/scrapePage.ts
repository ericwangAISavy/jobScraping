import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns';
import { isIP, BlockList } from 'node:net';
import { normalizeUrl } from '../parseInputFile';
import { extractJobs } from './extractJobs';
import type { ScrapedJob, SourceResult } from '../../types/job';
const blocked = new BlockList();
const blockedV6 = new BlockList();
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const) blocked.addSubnet(ip, prefix, 'ipv4');
for (const [ip, prefix] of [['::',96],['::ffff:0:0',96],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32],['2002::',16],['64:ff9b::',96]] as const) blockedV6.addSubnet(ip, prefix, 'ipv6');
export function isPublicAddress(ip: string): boolean {
  const address = ip.replace(/^\[|\]$/g, '');
  const family = isIP(address);
  return !!family && !(family === 4 ? blocked.check(address, 'ipv4') : blockedV6.check(address, 'ipv6'));
}
export function validateTarget(value: string): URL {
  const url = new URL(normalizeUrl(value));
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || (isIP(host) && !isPublicAddress(host))) throw new Error('Private or internal addresses are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard web ports are allowed.');
  return url;
}
const MAX_BODY = 2 * 1024 * 1024;
export async function fetchHtml(value: string, deadline = Date.now() + 15000, redirects = 0): Promise<{ html: string; url: string }> {
  const url = validateTarget(value);
  if (redirects > 5) throw new Error('Too many redirects.');
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Request timed out.');
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.get(url, {
      agent: false,
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
      // Validate DNS at connection time. The approved address is passed directly to
      // the socket, avoiding a second DNS lookup and DNS rebinding.
      lookup(host, options, callback) {
        lookup(host, { all: true, verbatim: true }, (error, addresses) => {
          if (error) return callback(error, '', 4);
          if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) return callback(new Error('Private or internal addresses are not allowed.'), '', 4);
          if (options.all) callback(null, addresses);
          else callback(null, addresses[0].address, addresses[0].family);
        });
      },
    }, res => {
      const status = res.statusCode ?? 500;
      if ([301,302,303,307,308].includes(status)) {
        res.resume();
        if (!res.headers.location) return reject(new Error('Invalid redirect.'));
        try { resolve(fetchHtml(new URL(res.headers.location, url).href, deadline, redirects + 1)); } catch (error) { reject(error); }
        return;
      }
      if (status !== 200) { res.resume(); reject(new Error([403,429].includes(status) ? `Website blocked automated requests (HTTP ${status}).` : `Website returned HTTP ${status}.`)); return; }
      if (!/text\/html|application\/xhtml\+xml/i.test(res.headers['content-type'] ?? '')) { res.resume(); reject(new Error('Website did not return HTML.')); return; }
      const chunks: Buffer[] = []; let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_BODY) { req.destroy(new Error('Page exceeds the 2 MB response limit.')); return; }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), url: url.href }));
    });
    const timer = setTimeout(() => req.destroy(new Error('Request timed out.')), remaining);
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
  });
}
export async function scrapePage(sourceUrl: string): Promise<{ source: SourceResult; jobs: ScrapedJob[] }> {
  try {
    const { html, url } = await fetchHtml(sourceUrl);
    if (!html.trim()) throw new Error('Empty careers page.');
    const jobs = extractJobs(html, sourceUrl, url);
    if (!jobs.length && /enable javascript|javascript (?:is )?required|you need to enable javascript/i.test(html)) throw new Error('Page requires JavaScript rendering.');
    return { jobs, source: { url: sourceUrl, status: 'success', jobsFound: jobs.length, ...(!jobs.length ? { message: 'No job listings detected. The page may require JavaScript rendering.' } : {}) } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to scrape page.';
    return { jobs: [], source: { url: sourceUrl, status: 'failed', jobsFound: 0, error: /ENOTFOUND|EAI_AGAIN/.test(message) ? 'Website DNS lookup failed.' : message } };
  }
}
