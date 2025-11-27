# Product Catalog — Frontend Demo

Professional, self-contained frontend demo that showcases a small product catalog and admin-style dashboard using static mock data. This repo is designed as a take-home or portfolio project: clear UI, accessible interactions, and explainable client-side logic.

## Goal

Demonstrate front-end engineering skills: responsive layout, state management, data visualization, accessibility, progressive enhancement (service worker), and small tooling for local testing. The app is intentionally static — data is loaded from `data/mock-data.json` — but includes an in-browser admin flow for status changes that persists in the user's browser.

## Quick Start (recommended)

1. Open a PowerShell terminal and change to the project folder:

```powershell
cd e:\pt1
```

2. Start a simple static server (recommended) and open the site:

```powershell
# If you have Python installed (common):
python -m http.server 8081
# Or use the included PowerShell helper:
.
\serve.ps1 -Port 8081
# Then open http://localhost:8081 in your browser
```

3. Sign in with the demo credentials: `demo` / `password123`.

Notes: some browsers block `fetch()` on `file://` URLs, so running a local server avoids those issues.

## What This Project Shows

- Responsive product grid with product cards, image placeholders and status badges.
- Admin-style dashboard: summary cards, Chart.js visualizations (line + doughnut + bar), and a searchable/sortable table.
- Accessible modal detail view with deep-linking (`#item-<id>`), copy link and open-in-new-tab actions.
- Client-side mock auth + settings persisted in `localStorage`.
- In-app status editor: change an item's `status` (pending → active) from the detail modal; changes persist in your browser via `localStorage` and immediately update UI counts and charts.
- Service worker `sw.js` provides basic caching for offline viewing (best-effort).

## Developer Notes

- Data is stored in `data/mock-data.json`. For production, replace this with a real backend API.
- The in-app status editor stores overrides in `localStorage` under `item_status_overrides` (per-browser). Use the editor to demo admin flows without editing the JSON file.
- Build/test scripts (optional): `package.json` contains scaffolding for `esbuild` and Playwright tests. Install Node and run `npm install` if you want to run them locally.

## Demo credentials

- Username: `demo`
- Password: `password123`

## How to evaluate (interview checklist)

1. Launch site and sign in with demo credentials.
2. Inspect dashboard: summary cards, how metrics update when you change item status.
3. Open a product detail: use the status dropdown -> Save status. Observe badge and chart updates.
4. Use the search bar (`/` focuses), sorting, pagination, and CSV export.
5. Toggle dark mode and verify persistence across reloads.
6. Test offline behaviour: load the site once, then turn off network and reload (service worker will serve cached assets where available).

## Suggested next steps (if you want to extend)

- Add a small backend endpoint to persist status changes across users.
- Add Playwright end-to-end tests (a sample test is included under `tests/`).
- Add CI pipeline to run tests and build a production bundle.

---

If you want, I can (a) add an export script that writes `item_status_overrides` back into `data/mock-data.json`, (b) add Playwright tests and run them locally, or (c) produce a production `dist/` build with `esbuild`.

### Persisting browser edits to the source JSON

To make in-app status edits permanent across browsers, create an overrides JSON file mapping item ids to statuses, for example `tools/overrides.json`:

```json
{
	"2": "active",
	"5": "archived"
}
```

Then run the helper (requires Node installed):

```powershell
cd e:\pt1
npm run apply-overrides -- overrides.json
```

This script will back up `data/mock-data.json` to `data/mock-data.json.bak` and write the merged file. Use this to make demo-approved changes permanent.

## Demo recording

A short recording demonstrating the app is included in this repository. You can play it directly here:

<video controls width="720">
	<source src="assets/videos/20251127-1322-22.mp4" type="video/mp4">
	Your browser does not support the video tag. You can also download the video from `assets/videos/20251127-1322-22.mp4`.
</video>

If you'd prefer an animated GIF instead of an MP4 (for smaller file size), I can generate one and add it to the README.

### Hosted demo (Google Drive)

If you prefer to host the full-quality recording externally instead of storing it in the repo, you can link to a Google Drive file. Here's the demo video hosted on Drive:

- https://drive.google.com/file/d/1jaygUmwXYWoqVP03ndFCFtmbW2xp0lpe/view?usp=drivesdk

If you want this link embedded as a preview or an iframe, I can update the README to embed a clickable thumbnail or an iframe (note: Drive iframe embeds require the file to be shared publicly), or I can remove the in-repo MP4 and rely solely on this external link.
