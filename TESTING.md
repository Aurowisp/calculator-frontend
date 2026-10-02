# Frontend Verification and Test Guide

This document covers automated, browser, manual, architecture, and production
checks for the calculator frontend.

## Last Verified Baseline

Verified on **2026-10-03** with:

- Windows
- Python 3.11.4
- Node.js 24.11
- Microsoft Edge in headless mode
- Frontend: `http://localhost:5500/src/index.html`
- Backend: `http://127.0.0.1:8000`
- An isolated SQLite database for browser testing

Results:

- Frontend module tests: **7 passed**
- Backend tests used by the integration baseline: **93 passed**
- Browser integration scenario: **passed**
- Browser console errors: **0**

The backend suite currently emits one upstream Starlette deprecation warning;
it does not represent a test failure.

## 1. Frontend Module Tests

Run from `calculator-frontend`:

```bash
node tests/frontend-modules.test.mjs
```

The tests cover:

- local and production API URL selection
- API error normalization
- calculation request behavior
- immediate result rendering before history refresh completes
- history initialization deduplication
- history request race handling
- history deletion and refresh

Expected result: **7 tests passed**.

## 2. Backend Prerequisite

Browser tests require the separate backend repository.

From `calculator-backend`:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --host 127.0.0.1 --port 8000
```

Verify:

```text
http://127.0.0.1:8000/health
```

Use an isolated test database when running scenarios that create or delete
history. The backend creates missing tables automatically at startup.

## 3. Browser Integration Test

Start the frontend from `calculator-frontend`:

```powershell
python -m http.server 5500
```

Start Edge with remote debugging in a separate terminal. Use a temporary user
data directory that is not shared with a normal browser session:

```powershell
msedge.exe --headless=new --disable-gpu --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\calculator-edge-e2e" `
  http://localhost:5500/src/index.html
```

Then run:

```bash
node tests/browser-e2e.cjs
```

The verified scenario confirms:

| Check | Expected |
| --- | --- |
| Initial history requests | 1 |
| Calculation POST requests | 1 |
| History requests after calculation | 1 |
| Delete requests | 1 |
| History requests after deletion | 1 |
| Initial history blocks keypad input | No |
| Offline local fallback result appears | No |
| UI remains interactive while offline | Yes |
| Browser console errors | 0 |

This request-count validation protects against duplicate `GET /api/history`
regressions and accidental form submission or page refresh behavior.

## 4. Manual Functional Matrix

Run each expression through the visible keypad. Confirm that the displayed
result is returned by `POST /api/calculate`, not calculated in the browser.

| Scenario | Example | Expected result |
| --- | --- | --- |
| Addition | `1+2` | `3` |
| Subtraction | `7-5` | `2` |
| Multiplication | `6*4` | `24` |
| Division | `8/2` | `4` |
| Precedence | `2+3*4` | `14` |
| Parentheses | `(2+3)*4` | `20` |
| Decimal precision | `0.1+0.2` | `0.3` |
| Unary negative | `-5+2` | `-3` |
| Invalid expression | `1++` | An English error message |
| Division by zero | `1/0` | An English error message |

Also verify:

1. Pressing `AC` clears the expression and resets the result display.
2. Repeated clicks on `=` while a request is pending create one POST request.
3. The result appears without waiting for the history refresh to finish.
4. A successful calculation appears once in the history panel.
5. Reloading the page preserves server-backed history.
6. Deleting a record removes only the selected record.
7. Backend downtime shows an error and never triggers local calculation.

## 5. Responsive and Accessibility Checks

Test at minimum:

- Desktop: 1440 x 900
- Mobile: 390 x 844
- Small mobile: 320 x 568

Confirm that:

- the desktop calculator and history sections form two columns
- the sections stack vertically at 700 px or less
- no controls overlap or leave the viewport horizontally
- buttons remain keyboard accessible
- focus indicators remain visible
- expression, result, and history status changes are announced appropriately
- all visible interface text is English

## 6. Architecture and Static Checks

Search the frontend source before release:

```powershell
rg -n "eval\(|Function\(|localStorage|sessionStorage" src tests
```

Expected result: no browser-side evaluator and no browser-backed history.

Review the Network panel and confirm that each user action produces only the
intended request sequence. Review the Console panel and confirm that no runtime
errors appear.

## 7. Production Verification

Production baseline verified on **2026-10-03**:

- GitHub Pages frontend returned successfully.
- Backend root, health, and Swagger documentation returned successfully.
- A production calculation/history/delete round trip succeeded.
- The temporary production history record was deleted after testing.
- Invalid expressions, division by zero, missing history records, validation
  errors, and the configured CORS origin returned the expected status codes.

Release smoke test:

1. Open <https://aurowisp.github.io/calculator-frontend/>.
2. Confirm that the root redirects to the application page.
3. Calculate a unique expression and inspect the result.
4. Confirm that one matching history item appears.
5. Delete that item and confirm that it stays deleted after reload.
6. Check the browser Console and Network panels for errors or duplicate calls.

Allow extra time for a hosted backend cold start after inactivity.
