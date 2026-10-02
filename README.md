# Calculator Frontend

## Overview

This repository contains the browser client for a front-end/back-end separated
calculator course project. The client collects expressions, sends them to the
FastAPI service, displays returned results, and manages calculation history.

The browser never evaluates mathematical expressions. Calculation and history
persistence belong exclusively to the backend.

## Live Services

- Frontend: <https://aurowisp.github.io/calculator-frontend/>
- Backend API: <https://calculator-backend-1m81.onrender.com>
- API documentation: <https://calculator-backend-1m81.onrender.com/docs>
- Frontend repository: <https://github.com/Aurowisp/calculator-frontend>
- Backend repository: <https://github.com/Aurowisp/calculator-backend>

## Current Features

- Number keys `0` through `9`
- Addition, subtraction, multiplication, and division operators
- Decimal points, parentheses, and unary signs
- Clear and calculate actions
- Separate expression and result displays
- Server-backed calculation history, ordered newest first
- Deletion of an individual history record
- Loading, empty, and error states
- Responsive desktop and mobile layouts
- English-only user interface and messages

The current desktop interface uses a two-column card: the calculator is on the
left and the always-visible history panel is on the right. At widths of 700 px
or less, the sections stack vertically. This implemented layout is the source
of truth for the project documentation.

## Technology

- HTML5
- CSS3
- Modern JavaScript with ES modules
- Fetch API
- Node.js only for automated frontend tests

There is no build step and no runtime JavaScript framework.

## Project Structure

```text
calculator-frontend/
|-- index.html                  # GitHub Pages entry and redirect
|-- src/
|   |-- index.html              # Application page
|   |-- css/
|   |   `-- styles.css          # Responsive layout and component styles
|   `-- js/
|       |-- api.js              # HTTP client and API error normalization
|       |-- calculator.js       # Expression input and calculation requests
|       |-- config.js           # Local/production API URL selection
|       |-- history.js          # History loading and deletion
|       |-- main.js             # Application composition and startup
|       `-- ui.js               # DOM rendering and UI state helpers
|-- tests/
|   |-- browser-e2e.cjs         # Browser-level integration checks
|   `-- frontend-modules.test.mjs
|-- README.md
|-- TESTING.md
`-- codestyle.md
```

## Local Setup

### Prerequisites

- A modern browser
- Python 3.x or another static-file server
- The calculator backend running locally on port `8000`

No package installation is required to run the frontend.

### Start the Backend

Follow the backend repository instructions, then verify:

```text
http://localhost:8000/health
```

### Start the Frontend

From this repository:

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500/src/index.html
```

Do not open `src/index.html` directly with a `file://` URL because browser ES
module and CORS rules require an HTTP origin.

## API Configuration

`src/js/config.js` selects the backend automatically:

- `localhost`, `127.0.0.1`, or `[::1]` uses `http://localhost:8000`.
- Any other host uses `https://calculator-backend-1m81.onrender.com`.

Update `PRODUCTION_API_URL` only when the deployed backend address changes.
The backend must also allow the exact frontend origin through `CORS_ORIGINS`.

## API Usage

The frontend uses three endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/calculate` | Calculate and persist one expression |
| `GET` | `/api/history` | Load all history records |
| `DELETE` | `/api/history/{id}` | Delete one history record |

Example request:

```json
{
  "expression": "(1.2+3.4)*2"
}
```

Example response:

```json
{
  "success": true,
  "expression": "(1.2+3.4)*2",
  "result": 9.2
}
```

After a successful calculation, the result is rendered immediately. History is
then refreshed asynchronously, so a slow history request does not delay the
result display. Initial history loading also does not block calculator input.

If the backend is unavailable, the page remains interactive and shows an error.
It does not calculate locally or create fake history records.

## Deployment

The frontend is deployed as a static GitHub Pages site. The root `index.html`
redirects to `src/index.html`, and all application assets use relative paths.

Deployment checklist:

1. Verify the production backend URL in `src/js/config.js`.
2. Configure the backend `CORS_ORIGINS` with the GitHub Pages origin.
3. Run the tests described in `TESTING.md`.
4. Push the reviewed files to the branch served by GitHub Pages.
5. Verify calculation, history refresh, and deletion on the live site.

Hosted backend platforms may have a cold start after inactivity. The frontend
keeps the request pending and exposes a loading state while it waits.

## Testing

Run the dependency-free module tests with Node.js:

```bash
node tests/frontend-modules.test.mjs
```

Current result: **7 tests passed**.

Browser integration testing and the complete manual verification matrix are
documented in [TESTING.md](TESTING.md).

## Engineering Constraints

- Never use `eval()`, `Function()`, or any browser-side expression evaluator.
- Never duplicate backend arithmetic or parsing logic in the frontend.
- Keep persistence in the backend database; do not use browser storage as a
  history source.
- Use `textContent` for server-provided content instead of injecting HTML.
- Keep controllers, API access, configuration, and rendering in separate
  modules.

See [codestyle.md](codestyle.md) for the project conventions.
