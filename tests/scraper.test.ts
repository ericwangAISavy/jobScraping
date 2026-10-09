import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInputFile } from '../src/lib/parseInputFile';
import { exportMarkdown } from '../src/lib/exportMarkdown';
import { extractJobs } from '../src/lib/scraper/extractJobs';
import { isPublicAddress, validateTarget, fetchHtml } from '../src/lib/scraper/scrapePage';
test('upload parsing normalizes, ignores blanks and deduplicates', () => {
  assert.deepEqual(parseInputFile('\ufeffhttps://example.com/careers\r\n \nhttps://example.com/careers#roles'), { urls: ['https://example.com/careers'], errors: [] });
  assert.equal(parseInputFile('https://ok.com\nnot a URL').errors.length, 1);
  assert.equal(parseInputFile(Array.from({length:101}, (_,i) => `https://c${i}.com`).join('\n')).errors.length, 1);
});
test('extracts cards, ATS links, resolves relative URLs and filters navigation', () => {
  const jobs = extractJobs(`<nav><a href='/careers/'>Careers</a><a href='/about'>About</a></nav><li class='job'><h3>AI Engineer</h3><a href='/jobs/123'>Apply now</a></li><a href='/jobs/123'>Senior AI Engineer</a><a href='https://jobs.lever.co/acme/abc'>Research Scientist</a><a href='mailto:a@b.com'>Engineer</a><article><a href='/detail?id=1'>Operations Analyst</a></article>`, 'https://example.com/careers');
  assert.equal(jobs.length, 3);
  assert.equal(jobs[0].title, 'Senior AI Engineer');
  assert.equal(jobs[0].url, 'https://example.com/jobs/123');
});
test('export is one Markdown link per line and safely escapes titles', () => {
  assert.equal(exportMarkdown([{title:'AI Engineer',url:'https://example.com/jobs/ai',sourceUrl:'https://example.com'}]), '[AI Engineer](https://example.com/jobs/ai)');
  assert.equal(exportMarkdown([{title:'Engineer [AI]',url:'https://example.com/job(a)',sourceUrl:'https://example.com'}]), '[Engineer \\[AI\\]](https://example.com/job%28a%29)');
});
test('SSRF guards block IPv4, IPv6, mapped addresses and alternate encodings', async () => {
  for (const ip of ['127.0.0.1','0.0.0.0','10.1.2.3','172.16.2.3','192.168.1.2','169.254.169.254','100.64.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1']) assert.equal(isPublicAddress(ip),false,ip);
  assert.equal(isPublicAddress('8.8.8.8'),true);
  for (const url of ['http://localhost','http://2130706433','http://0x7f000001','http://[::1]','ftp://example.com','https://user:pass@example.com','http://example.com:8080']) assert.throws(() => validateTarget(url));
  await assert.rejects(fetchHtml('http://127.0.0.1'));
});
