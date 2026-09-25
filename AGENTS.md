# Project verification

- This is a static HTML/JavaScript site with Supabase. There is no npm build or test script in package.json.
- Shared public mobile navigation is in assets/js/mobile-nav.js. Initialize with initMobileNav(); do not attach additional toggle listeners in individual pages.
- Certificate registrations for events, formations and seminaires use the rasinayiti_register RPC. Do not restore client-side direct inserts or trust client-calculated discounts/payment statuses.
- sql2.0/09_codes_leaders.sql requires migrations 07 and 08. It adds restrictive access policies; coordinate its deployment with the matching frontend and verify a real Supabase Auth admin session. Do not run production SQL automatically.
- tests/leader-features.html tests browser behavior, actual mobile CSS and an isolated in-memory PostgreSQL database using pinned PGlite 0.3.7 from jsDelivr. It uses synthetic records, not the project's Supabase client. Internet is required for this test-only dependency.
- Deploy sql2.0/10_consolidation.sql then 11_certificats_pdf.sql after 07–09, together with the admin/student frontend. Never rerun 09 alone after 10: it replaces the event registration triggers. Verify deployment with real admin and student Supabase Auth sessions; the homepage PIN is not authentication.
- Activity removal uses rasinayiti_archive_activity, not DELETE. Consolidation copies/link registrations transactionally and retains originals plus snapshots. Imported payment changes must be made on the original registration; SQL synchronizes its copy. Do not recalculate historical prices on transfer.
- PDFs use the private rasinayiti_certificats bucket and rasinayiti_publish_certificate. Only verified, non-cancelled registrations for completed activities qualify. Templates are local PNG/JPEG images; generated/finished PDFs are stored privately and downloaded using 60-second signed URLs. Issued files are immutable.
- tests/admin-workflows.html uses synthetic data, mocked browser Supabase calls, real jsPDF 2.5.1 (already used by the site), and isolated PGlite PostgreSQL with a simulated storage schema. Run it with the same Edge command below, substituting tests/admin-workflows.html and a separate --user-data-dir. It does not test a real Supabase Storage service or real concurrent connections.
- Run git diff --check before finishing changes.
- Cache: vercel.json sends Cache-Control: no-cache on everything. All local .css/.js references in HTML carry ?v=YYYYMMDD (current: 20260924); bump the date on every deploy that changes assets, so browsers fetch the new files once and then revalidate cheaply. Never add unversioned local script/link tags.
- Responsiveness: admin/* pages rely on admin/responsiveadmin.css; .main-content needs min-width:0 (flex item) so wide tables scroll inside their containers instead of expanding the page. tests/responsive-audit.html measures horizontal overflow of all pages at 375px in srcdoc iframes with a <base> tag — run it with the same Edge command and a separate --user-data-dir; it must print SUCCESS.

## Browser tests on Windows (PowerShell, from repository root)

```powershell
$testUrl = 'file:///' + ((Join-Path (Get-Location) 'tests/leader-features.html') -replace '\\', '/')
$html = & 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --no-first-run --allow-file-access-from-files --user-data-dir="$env:TEMP\rasinayiti-leader-tests" --virtual-time-budget=90000 --dump-dom $testUrl 2>$null | Out-String
$result = [regex]::Match($html, '(?s)<pre id="results">(.*?)</pre>').Groups[1].Value
$result
if ($result -notmatch '^SUCCESS:') { throw 'Leader feature tests failed or did not finish.' }
```
