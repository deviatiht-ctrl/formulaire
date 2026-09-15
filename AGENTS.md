# Project verification

- This is a static HTML/JavaScript site with Supabase. There is no npm build or test script in package.json.
- Shared public mobile navigation is in assets/js/mobile-nav.js. Initialize with initMobileNav(); do not attach additional toggle listeners in individual pages.
- Certificate registrations for events, formations and seminaires use the rasinayiti_register RPC. Do not restore client-side direct inserts or trust client-calculated discounts/payment statuses.
- sql2.0/09_codes_leaders.sql requires migrations 07 and 08. It adds restrictive access policies; coordinate its deployment with the matching frontend and verify a real Supabase Auth admin session. Do not run production SQL automatically.
- tests/leader-features.html tests browser behavior, actual mobile CSS and an isolated in-memory PostgreSQL database using pinned PGlite 0.3.7 from jsDelivr. It uses synthetic records, not the project's Supabase client. Internet is required for this test-only dependency.
- Run git diff --check before finishing changes.

## Browser tests on Windows (PowerShell, from repository root)

```powershell
$testUrl = 'file:///' + ((Join-Path (Get-Location) 'tests/leader-features.html') -replace '\\', '/')
$html = & 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --headless --disable-gpu --no-first-run --allow-file-access-from-files --user-data-dir="$env:TEMP\rasinayiti-leader-tests" --virtual-time-budget=90000 --dump-dom $testUrl 2>$null | Out-String
$result = [regex]::Match($html, '(?s)<pre id="results">(.*?)</pre>').Groups[1].Value
$result
if ($result -notmatch '^SUCCESS:') { throw 'Leader feature tests failed or did not finish.' }
```
