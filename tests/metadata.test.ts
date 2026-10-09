import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractMetadata, parseSalary } from '../src/lib/scraper/extractMetadata';
import { enrichJobs } from '../src/lib/scraper/enrichJobs';
import { EMPTY_FILTERS, filterJobs } from '../src/lib/filterJobs';
import { readLocalResults } from '../src/lib/localResults';
import type { ScrapedJob } from '../src/types/job';
const job = { title:'Senior Multi-Agent Systems Engineer',url:'https://sapient.inc/en/careers/senior-multi-agent-systems-engineer',sourceUrl:'https://sapient.inc/en/careers' };
test('reads visible sidebar labels like the supplied Sapient page', () => {
  const result = extractMetadata('<div><p>Location</p><p>Beijing</p></div><div><p>Location Type</p><p>On-Site or Hybrid</p></div><div><p>Job grade</p><p>Senior</p></div>', job);
  assert.deepEqual(result.locations,['Beijing']); assert.deepEqual(result.workTypes,['Hybrid','On-site']); assert.equal(result.grade,'Senior');
  assert.deepEqual(result.countries,[]); assert.equal(result.salary,undefined);
});
test('JSON-LD supports graph, multiple locations, company, salary, and remote', () => {
  const html = `<script type="application/ld+json">${JSON.stringify({'@graph':[{'@type':'JobPosting',title:job.title,hiringOrganization:{name:'Sapient'},jobLocation:[{address:{addressLocality:'Beijing',addressCountry:'CN'}},{address:{addressLocality:'London',addressCountry:'GB'}}],jobLocationType:'TELECOMMUTE',baseSalary:{currency:'USD',value:{minValue:100000,maxValue:150000,unitText:'YEAR'}},employmentType:'FULL_TIME'}]})}</script>`;
  const r=extractMetadata(html,job);
  assert.deepEqual(r.countries,['China','United Kingdom']); assert.deepEqual(r.locations,['Beijing','London']); assert.deepEqual(r.workTypes,['Remote']); assert.equal(r.company,'Sapient'); assert.equal(r.salary?.min,100000); assert.equal(r.salary?.currency,'USD');
});
test('salary parsing retains units and avoids assuming dollar currency', () => {
  assert.deepEqual(parseSalary('USD 120k – 160k per year'),{text:'USD 120k – 160k per year',min:120000,max:160000,currency:'USD',period:'YEAR'});
  assert.equal(parseSalary('$50 per hour')?.currency,undefined);
  assert.equal(parseSalary('Competitive'),undefined);
});
test('combined filters use range overlap with matching currency and period', () => {
  const jobs: ScrapedJob[] = [{...job,locations:['Beijing'],countries:['China'],workTypes:['On-site','Hybrid'],grade:'Senior',salary:{text:'USD 100–150k/year',min:100000,max:150000,currency:'USD',period:'YEAR'}},{...job,url:'https://example.com/a',salary:{text:'CAD 140k',min:140000,max:140000,currency:'CAD',period:'YEAR'}},{...job,url:'https://example.com/b'}];
  assert.equal(filterJobs(jobs,{...EMPTY_FILTERS,country:'China',workType:'Hybrid',grade:'Senior',currency:'USD',period:'YEAR',minSalary:'140000'}).length,1);
  assert.equal(filterJobs(jobs,{...EMPTY_FILTERS,currency:'USD',period:'YEAR',minSalary:'160000'}).length,0);
  assert.equal(filterJobs(jobs,{...EMPTY_FILTERS,location:'__unknown'}).length,2);
  assert.equal(filterJobs(jobs,{...EMPTY_FILTERS,minSalary:'100'}).length,0);
});
test('detail failures preserve links and concurrency never exceeds three', async () => {
  let active=0, max=0;
  const jobs = Array.from({length:8},(_,i)=>({...job,url:`https://example.com/jobs/${i}`}));
  const result=await enrichJobs(jobs,async url=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;if(url.endsWith('/2'))throw new Error('HTTP 403');return {html:'<dt>Location</dt><dd>London, UK</dd>',url};});
  assert.equal(max,3);assert.equal(result.length,8);assert.equal(result[2].metadataStatus,'failed');assert.equal(result[2].url,jobs[2].url);assert.deepEqual(result[0].countries,['United Kingdom']);
});
test('local results restore metadata, reject unsafe URLs and invalid versions', () => {
  const result={sources:[{url:job.sourceUrl,status:'success',jobsFound:1}],jobs:[{...job,locations:['Beijing'],grade:'Senior'}]};
  assert.deepEqual(readLocalResults(JSON.stringify({version:2,result})),result);
  assert.equal(readLocalResults(JSON.stringify({version:1,result})),null);
  assert.equal(readLocalResults(JSON.stringify({version:2,result:{...result,jobs:[{...job,url:'javascript:alert(1)'}]}})),null);
});
test('inline metadata and explicit remote country eligibility', () => {
  const r=extractMetadata('<p>Location: Berlin, Germany</p><p>Salary: EUR 50,000 to 75,000 annually</p>',job);
  assert.deepEqual(r.countries,['Germany']); assert.equal(r.salary?.max,75000);
  const remote=extractMetadata(`<script type="application/ld+json">${JSON.stringify({'@type':'JobPosting',title:job.title,jobLocationType:'TELECOMMUTE',applicantLocationRequirements:{'@type':'Country',name:'US'}})}</script>`,job);
  assert.deepEqual(remote.countries,['United States']);
  assert.deepEqual(extractMetadata('<dt>Location</dt><dd>San Francisco, CA</dd>', job).countries, []);
  assert.deepEqual(extractMetadata('<dt>Location</dt><dd>Warsaw, Poland</dd>', job).countries, ['Poland']);
});
