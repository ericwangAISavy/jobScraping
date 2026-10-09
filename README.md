# Job Scraper

A standalone Next.js App Router application that fetches careers pages on the server, extracts likely job links with Cheerio, and exports Markdown. No database, authentication, or persistent storage.

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

Blank lines and duplicate URLs are ignored. Invalid lines must be corrected before loading. Limits: 100 unique sources and a 1 MB input file. Click **Scrape Jobs**, search results, toggle title sorting, and **Export Markdown** to download `scraped-jobs.md`. Export includes all discovered jobs, regardless of the search filter. Results disappear on refresh.

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

Lint, strict TypeScript checking, the production build, and four regression tests passed. Chromium checks covered invalid-file messages, real file upload and duplicate removal, the actual API's source error responses, responsive layout, and browser errors. A controlled API response separately verified title sorting, filtering, partial source failure, and exact downloaded Markdown contents.

Live requests to Anthropic, Cloudflare, and Spotify's Lever careers board were attempted but could not be scraped in this machine: direct public DNS returns `EAI_AGAIN`, and the environment's mandatory egress proxy denies the careers destinations. The native HTTP scraper intentionally does not delegate DNS/IP enforcement to an unverified proxy. Run it on a host with public DNS and direct outbound HTTP(S) to scrape externally. Successful live-site extraction remains unverified here; do not interpret simulated browser results as live-site success.
