# Dashboard design QA

Source visual truth: the user's dashboard image attached to the UI change request (1672 × 941 pixels). The attachment is visible in the conversation but is not exposed as a local file or downloadable image ID.

Implementation: `/tmp/job-dashboard-desktop.png` and `/tmp/job-dashboard-mobile.png`, captured from Chromium with Playwright against the built Next.js application. Desktop CSS viewport: 1672 × 941, deviceScaleFactor 1. Mobile CSS viewport: 390 × 844, deviceScaleFactor 1; screenshots include the complete scrollable document and may be resized by the chat renderer.

State: controlled test data with 48 sources, 247 jobs and 32 companies; production contains no seeded records. Labels, category distribution, dates, source URLs, and company initials differ from the reference because these are computed from test data. Verified company logos were not provided as assets, so the application uses initial badges instead of fabricated brand logos. The header's local-data menu replaces the reference's account avatar because this app has no accounts.

## Comparison history

1. Initial implementation capture: dashboard cards and rows were too tall; the desktop full document measured 1058 pixels high and pagination sat below the reference viewport. Reduced summary line heights, upload padding, company-row spacing and table-row padding.
2. Revised desktop capture: header, sidebar, four cards and ten-row table fit the intended proportions; pagination is near the bottom of the reference-sized viewport. A mobile regression exposed pagination overflow after adding five numbered page buttons. Enabled pagination wrapping and recaptured the mobile layout; the document width check passes.

## Required fidelity surfaces

- Typography: bundled Inter, 400–700 weights; compact body/table text and stronger section headings. Small differences in optical weight from the image remain subjective polish.
- Layout: 62-pixel header, 24-pixel outer padding, approximately 26% sidebar, 14-pixel grid gaps, four summary cards and 10-row pagination. Narrow screens stack panels and scroll the table internally; pagination wraps.
- Colors: pale blue-gray canvas, white panels, blue actions, subdued blue-gray labels, and green New badges follow the reference's hierarchy.
- Assets: Tabler library icons; honest, colored company initial badges where no verified logo is available. No custom SVG brand approximations or fabricated logos.
- Copy: headings and control labels follow the target. Actual counts and Unknown values replace illustrative values. Posted dates and New/Seen have implemented data semantics.

## Functional verification

Passed Chromium checks: empty state, upload, automatic detail enrichment with controlled API responses, category counts/tabs, search, combined filters, last-page boundaries, page reset on filtering, Markdown and CSV downloads, job-detail dialog, New/Seen persistence, adding and searching sources, browser-cache restoration, mobile overflow check, and no browser errors. Unit tests: 14 passed. Lint, TypeScript and production build passed.

## Remaining verification limitation

The reference attachment cannot be placed together with the rendered screenshot in a single normalized comparison artifact using the available tools. The plugin-specific cloud browser/Sites tooling and shared critical-overrides resources are not available; verification used the actual local Chromium browser instead. Full-view and focused-region comparisons in the strict Product Design QA format therefore remain unconfirmed. No claim of pixel-perfect fidelity or a strict QA pass is made. This limitation does not block the verified application behaviors.

final result: blocked
