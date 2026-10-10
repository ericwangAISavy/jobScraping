# Job Scraper

A standalone Next.js App Router application that fetches careers pages on the server, extracts likely job links with Cheerio, and exports Markdown. No database or authentication; results are cached locally in the browser.

## Run locally

Requires Node.js 20.9 or newer (tested with Node.js 24).

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

Upload a `.md` or `.txt` file containing one careers-page URL per line:

```text
https://company-a.com/careers
https://company-b.com/jobs
```

Blank lines and duplicate URLs are ignored. Invalid lines must be corrected before loading. Limits: 100 unique sources and a 1 MB input file. Click **Scrape Jobs**, search results, toggle title sorting, and **Export Markdown** to download `scraped-jobs.md`. Export includes only the currently filtered jobs. Results and metadata are saved in browser localStorage and restored on refresh. Use **Clear saved results** to delete the local cache. Uploading a new file replaces the old results. Nothing is stored in a server database.

## Development checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Scraping behavior

`POST /api/scrape` accepts `{ "urls": ["https://example.com/careers"] }` and returns `sources` and `jobs`. Three concurrent workers fetch pages with a 15-second total deadline per source, a 2 MB HTML limit, and at most five redirects. Results are deduplicated by normalized job URL. Source failures do not interrupt other sources. The Node HTTP transport validates all DNS answers at socket connection time, blocks private and reserved address ranges, restricts ports, and revalidates redirects to prevent SSRF and DNS rebinding. TLS verification remains enabled.

Extraction combines job URL patterns, ATS hosts, role words, and job-card structure. Relative links are resolved against the final page URL. No remote JavaScript is executed. This is heuristic extraction, so it may miss jobs or include false positives. Some websites block automated scraping, require JavaScript rendering, or expose their listings only through separate APIs. Those limitations appear in source statuses; browser rendering is intentionally not included. A future browser fallback can be added behind `scrapePage` without changing the UI contract.

On serverless platforms, maximum execution duration depends on the host. A 100-source worst-case run can take about nine minutes; use a long-running Node deployment for the full limit. The request duration export is a hint, not a guarantee. For public deployment, add platform-level rate limiting and access controls appropriate to your traffic; this version is intended as a small session-based tool.

The npm cache is configured under `/tmp/job-scraper-npm` for the cloud environment. It contains no application data.

## Validation in this cloud environment

Lint, strict TypeScript checking, the production build, and fourteen regression tests passed. Chromium checks covered invalid-file messages, real file upload and duplicate removal, the actual API's source error responses, responsive layout, and browser errors. A controlled API response separately verified title sorting, filtering, partial source failure, and exact downloaded Markdown contents.

Live requests to Anthropic, Cloudflare, and Spotify's Lever careers board were attempted but could not be scraped in this machine: direct public DNS returns `EAI_AGAIN`, and the environment's mandatory egress proxy denies the careers destinations. The native HTTP scraper intentionally does not delegate DNS/IP enforcement to an unverified proxy. Run it on a host with public DNS and direct outbound HTTP(S) to scrape externally. Successful live-site extraction remains unverified here; do not interpret simulated browser results as live-site success.


## Detail metadata and filters

After discovering links, the browser automatically calls `POST /api/enrich` in sequential batches of up to 12 job records. The server fetches each detail page with the same SSRF protections, 15-second timeout, HTML limit, and three-request concurrency limit. These short requests keep detail extraction separate from a potentially long careers-page discovery request. The UI shows detail-reading progress and saves completed batches locally. Interrupted batches are identified on refresh; scrape again to retry.

Metadata comes from schema.org `JobPosting` JSON-LD (including graphs and multiple locations) and visible fields such as Location, Location Type, Job grade, Country, Employment type, and Salary. Grade can also come from the job title. Location type can contain more than one option: “On-Site or Hybrid” matches both filters. Country codes are normalized to names; countries not explicitly provided are Unknown rather than inferred from potentially ambiguous city names. No remote JavaScript is executed.

Combine location, country, location type, grade, employment type, text search, and salary filters. Salary bounds use range overlap and require an explicitly known currency and pay period. There is no currency conversion or automatic annualization; ambiguous symbols such as `$` without a currency code retain the displayed pay text but do not receive an assumed currency. Missing values remain Unknown and can be filtered explicitly. Detail-page errors preserve the job link and are reported in the table.

Markdown export contains **only matching jobs**, one link per line. Local caching stores extracted metadata, not raw HTML, and is confined to the current browser/profile and site origin. If browser storage is disabled or full, the app displays a warning and continues with in-memory results.

Metadata-specific verification includes a sidebar fixture matching the supplied Sapient screenshot, JSON-LD, multi-location records, remote eligibility, salary range comparisons, failure isolation, concurrency, and local cache validation. Chromium fixtures verify automatic enrichment, combined filters, filtered Markdown export, cache restoration without network requests, cache clearing, and mobile overflow. A live request to the supplied Sapient detail URL returned a DNS error in this cloud environment; live metadata extraction on that site remains unverified here.


## Dashboard layout and controls

The dashboard has a header search, upload and companies sidebar, summary cards, and a paginated Job Links table. Company initials are shown when no verified logo is available. Summary values always come from the current dataset; the app has no seeded demo jobs.

- Category tabs classify roles by department/title heuristics and show counts before filtering.
- Global search and table search share the same query. Combine location, company, and location-type selectors with country, grade, employment, and salary controls under **Filter**.
- Pagination shows 10 jobs per page, resets on filter changes, and clamps to the final page. Export includes every matching job across pages, not just the visible page. Markdown and CSV downloads are available in the **Export** menu.
- Job links mark a role **Seen**. Row menus open full metadata, copy the link, or toggle New/Seen. These states survive refresh and are retained on re-scraping matching links.
- The companies panel searches sources, filters jobs by clicking a company, opens careers pages, removes sources, and accepts additional URLs via **Add more sources**. Newly added sources are **Ready** until scraped.
- Posted dates are extracted from JobPosting `datePosted`; absent values are **Unknown**. Last Scraped is the locally recorded discovery timestamp, not a fabricated posting date.
- The circular header menu manages local data; no account or authentication was added.

Browser checks used controlled 247-job data to exercise pagination, final-page boundaries, search/category/company/metadata filters, filtered Markdown export, details, New/Seen persistence, source addition, company search, mobile wrapping, and console errors. A separate empty-state/upload test verified the discovery-to-enrichment pipeline with controlled responses and CSV download. The cloud network limitation on live scraping remains unchanged.
