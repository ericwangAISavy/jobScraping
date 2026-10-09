import { load } from 'cheerio';
import { normalizeUrl } from '../parseInputFile';
import type { ScrapedJob } from '../../types/job';
const navigation = /^(home|about(?: us)?|careers?|jobs|open (?:roles|positions)|contact(?: us)?|privacy.*|terms.*|linkedin|twitter|login|sign in|learn more|read more|view all.*|search jobs|join (?:us|our team)|apply(?: now)?|see details|view job)$/i;
const roles = /\b(engineer|developer|scientist|researcher|designer|product|manager|operations|sales|marketing|finance|recruiter|intern|director|lead|staff|principal|analyst|specialist|technician|associate|coordinator|consultant|nurse|accountant)\b/i;
const pathSignal = /\/(jobs?|careers?|positions?|openings?|vacanc(?:y|ies)|roles?|apply)\/.+/i;
const ats = /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com|myworkdayjobs\.com)$/i;
export function extractJobs(html: string, sourceUrl: string, pageUrl = sourceUrl): ScrapedJob[] {
  const $ = load(html);
  $('script,style,noscript').remove();
  const found = new Map<string, ScrapedJob>();
  $('a[href]').each((_, element) => {
    const a = $(element), href = a.attr('href')?.trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    let url: string;
    try { url = normalizeUrl(href, pageUrl); } catch { return; }
    if (url === normalizeUrl(pageUrl)) return;
    const target = new URL(url);
    const card = a.closest('.job,.job-card,.job-listing,.position,.opening,.role,article,li');
    let title = a.text().replace(/\s+/g, ' ').trim();
    if (!title || navigation.test(title)) title = card.find('h2,h3,h4,[class*="title"]').first().text().replace(/\s+/g, ' ').trim();
    if (title.length < 3 || title.length > 180 || navigation.test(title)) return;
    const strong = pathSignal.test(target.pathname) || (ats.test(target.hostname) && target.pathname.split('/').filter(Boolean).length >= 2);
    if (!(strong || (roles.test(title) && card.length > 0))) return;
    const old = found.get(url);
    if (!old || title.length > old.title.length) found.set(url, { title, url, sourceUrl });
  });
  return [...found.values()];
}
