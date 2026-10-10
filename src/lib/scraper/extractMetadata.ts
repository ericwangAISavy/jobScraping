import { load } from 'cheerio';
import type { ScrapedJob, Salary } from '../../types/job';
type RecordValue = Record<string, unknown>;
const object = (v: unknown): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
const text = (v: unknown): string => typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim() : '';
const array = (v: unknown): unknown[] => v == null ? [] : Array.isArray(v) ? v : [v];
const unique = (v: string[]) => [...new Set(v.filter(Boolean))];
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const regionNames = new Map<string, string>();
for (const a of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') for (const b of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const code = a + b, name = countryNames.of(code);
  if (name && name !== code) regionNames.set(name.toLowerCase(), name);
}
export function normalizeCountry(value: string): string {
  const aliases: Record<string, string> = { usa:'US', 'united states of america':'US', 'united states':'US', uk:'GB', 'united kingdom':'GB', 'great britain':'GB' };
  const code = aliases[value.toLowerCase()] ?? value.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? countryNames.of(code) ?? value : regionNames.get(value.toLowerCase()) ?? value;
}
export function workTypes(value: string): string[] {
  const types: string[] = [];
  if (/\bremote\b|telecommute/i.test(value)) types.push('Remote');
  if (/\bhybrid\b/i.test(value)) types.push('Hybrid');
  if (/on[ -]?site|in[ -]office|office[ -]based/i.test(value)) types.push('On-site');
  return types;
}
export function gradeFrom(value: string): string | undefined {
  const match = value.match(/\b(intern(?:ship)?|entry[ -]level|junior|mid[ -]level|senior|staff|principal|lead|director|executive)\b/i);
  if (!match) return;
  const lower = match[1].toLowerCase();
  if (lower.startsWith('intern')) return 'Intern';
  return lower.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function parseSalary(value: string): Salary | undefined {
  if (!value || !/\d/.test(value)) return;
  const numeric = value.match(/(?:\b(?:USD|EUR|GBP|CAD|AUD|CNY|RMB|INR)\s*|[$€£¥]\s*)([\d,.]+\s*[kK]?)(?:\s*(?:-|–|—|to)\s*(?:(?:USD|EUR|GBP|CAD|AUD|CNY|RMB|INR|[$€£¥])\s*)?([\d,.]+\s*[kK]?))?/i)
    ?? value.match(/\b([\d,]+(?:\.\d+)?\s*[kK]?)\s*(?:-|–|—|to)\s*([\d,]+(?:\.\d+)?\s*[kK]?)/);
  const number = (s?: string) => s ? Number(s.replace(/[\s,]/g, '').replace(/[kK]$/, '')) * (/[kK]\s*$/.test(s) ? 1000 : 1) : undefined;
  const currency = value.match(/\b(USD|EUR|GBP|CAD|AUD|CNY|RMB|INR)\b/i)?.[1].toUpperCase() ?? (/€/.test(value) ? 'EUR' : /£/.test(value) ? 'GBP' : undefined);
  // "$" and "¥" alone are ambiguous; retain text without assuming a currency.
  const period = /\b(hour|hourly|hr)\b|\/h\b/i.test(value) ? 'HOUR' : /\b(month|monthly)\b/i.test(value) ? 'MONTH' : /\b(year|yearly|annual|annually|annum)\b|\/yr\b/i.test(value) ? 'YEAR' : /\bweek(?:ly)?\b/i.test(value) ? 'WEEK' : undefined;
  return { text: value, min: number(numeric?.[1]), max: number(numeric?.[2]) ?? number(numeric?.[1]), currency, period };
}
function structuredSalary(value: unknown): Salary | undefined {
  const s = object(array(value)[0]), amount = object(s.value);
  const numeric = (v: unknown): number | undefined => (typeof v === 'number' || typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v)) && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined;
  const min = numeric(amount.minValue) ?? numeric(amount.value) ?? numeric(s.value);
  const max = numeric(amount.maxValue) ?? min;
  const currency = text(s.currency) || undefined, period = text(amount.unitText).toUpperCase() || undefined;
  if (min === undefined && max === undefined) return parseSalary(text(value));
  return { min, max, currency, period, text: `${currency ?? ''} ${min ?? ''}${max !== undefined && max !== min ? ` – ${max}` : ''}${period ? ` / ${period.toLowerCase()}` : ''}`.trim() };
}
export function extractMetadata(html: string, job: ScrapedJob): Partial<ScrapedJob> {
  const $ = load(html);
  const postings: RecordValue[] = [];
  function visit(v: unknown) {
    if (Array.isArray(v)) { v.forEach(visit); return; }
    const o = object(v);
    if (array(o['@type']).includes('JobPosting')) postings.push(o);
    if (o['@graph']) visit(o['@graph']);
    if (o.mainEntity) visit(o.mainEntity);
  }
  $('script[type="application/ld+json"]').each((_, e) => { try { visit(JSON.parse($(e).text())); } catch { /* Malformed structured data: use visible labels. */ } });
  // Ignore unrelated postings when a page contains multiple JobPosting objects.
  const posting = postings.find(p => text(p.url) === job.url || text(p.title).toLowerCase() === job.title.toLowerCase()) ?? (postings.length === 1 ? postings[0] : {});
  $('script,style,noscript,nav,header,footer').remove();
  const fields = new Map<string, string>();
  const labelPattern = /^(location|locations|job location|country|countries|location type|work(?:place)? (?:type|arrangement)|remote policy|job grade|grade|seniority|experience level|salary|salary range|compensation|base salary|pay range|employment type|job type)\s*:?$/i;
  $('dt,th,label,p,span,div,h2,h3,h4,strong,b').each((_, e) => {
    const element = $(e), label = element.text().replace(/\s+/g, ' ').trim();
    const inline = label.match(/^([^:]{2,30}):\s*(.{1,250})$/);
    if (inline && labelPattern.test(inline[1]) && element.children().length === 0) fields.set(inline[1].toLowerCase(), inline[2]);
    if (!labelPattern.test(label)) return;
    let value = element.next().text().replace(/\s+/g, ' ').trim();
    if (!value) value = element.parent().next().text().replace(/\s+/g, ' ').trim();
    if (value && value.length <= 250 && !labelPattern.test(value)) fields.set(label.toLowerCase().replace(/:$/, '').trim(), value);
  });
  const lines = $('body').text().split(/\n/).map(v => v.trim()).filter(Boolean);
  for (const line of lines) {
    const pair = line.match(/^([^:]{2,30}):\s*(.{1,250})$/);
    if (pair && labelPattern.test(pair[1]) && !fields.has(pair[1].toLowerCase())) fields.set(pair[1].toLowerCase(), pair[2]);
  }
  const field = (...keys: string[]) => keys.map(k => fields.get(k)).find(Boolean) ?? '';
  const locations: string[] = [], countries: string[] = [];
  for (const place of array(posting.jobLocation)) {
    const address = object(object(place).address ?? place);
    const location = unique([text(address.addressLocality), text(address.addressRegion)]).join(', ');
    if (location) locations.push(location);
    const country = text(object(address.addressCountry).name) || text(address.addressCountry);
    if (country) countries.push(normalizeCountry(country));
  }
  if (!countries.length) for (const requirement of array(posting.applicantLocationRequirements)) {
    const area = object(requirement);
    const country = array(area['@type']).includes('Country') ? text(area.name) : text(object(area.address).addressCountry);
    if (country) countries.push(normalizeCountry(country));
  }
  const labeledLocations = field('location','locations','job location');
  if (!locations.length && labeledLocations) locations.push(...labeledLocations.split(/\s*[;|]\s*/));
  const country = field('country','countries');
  if (!countries.length && country) countries.push(...country.split(/\s*[;|]\s*/).map(normalizeCountry));
  // Country names explicitly included in a location label are usable; do not guess
  // countries from ambiguous city names or remote eligibility regions.
  if (!countries.length) for (const location of locations) {
    for (const part of location.split(',')) {
      const candidate = part.trim();
      if (/^(US|USA|UK|GB)$/i.test(candidate) || regionNames.has(candidate.toLowerCase())) countries.push(normalizeCountry(candidate));
    }
  }
  const arrangement = field('location type','workplace type','work type','work arrangement','remote policy');
  const work = workTypes(arrangement || text(posting.jobLocationType) || labeledLocations);
  const grade = field('job grade','grade','seniority','experience level');
  const salary = structuredSalary(posting.baseSalary) ?? parseSalary(field('salary','salary range','compensation','base salary','pay range'));
  return {
    company: text(object(posting.hiringOrganization).name) || job.company,
    locations: unique(locations), countries: unique(countries), workTypes: unique(work),
    grade: grade ? gradeFrom(grade) ?? grade : gradeFrom(text(posting.title) || job.title),
    employmentType: field('employment type','job type') || array(posting.employmentType).map(text).join(', ') || undefined,
    salary,
    postedAt: text(posting.datePosted) && Number.isFinite(Date.parse(text(posting.datePosted))) ? text(posting.datePosted) : undefined,
    department: text(posting.occupationalCategory) || undefined,
  };
}
