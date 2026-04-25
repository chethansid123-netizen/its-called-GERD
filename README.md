# GERD

GERD is a zero-install, full-stack case-study website for the GastroTrack GERD management platform project.

The app includes:

- A polished, responsive front end for the complete case study.
- Local API endpoints for case-study data, dashboard metrics, health checks, and contact submissions.
- A lightweight PowerShell backend with no Node, Python, package manager, or database setup required.
- Local JSON persistence for contact and demo symptom submissions.
- A static data fallback so the front end can also load on GitHub Pages.

## Run Locally

From this folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\server.ps1
```

Then open:

```text
http://localhost:4173
```

Use a different port if needed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\server\server.ps1 -Port 4280
```

## Easy Windows Start

Double-click:

```text
START_GERD_WEBSITE.cmd
```

Keep the black window open while using the website.

## GitHub Pages

The root `index.html` redirects to `public/index.html`, and the front end can read `data/site.json` without the local backend.

## API

- `GET /api/health`
- `GET /api/case-study`
- `GET /api/dashboard`
- `POST /api/contact`
- `POST /api/symptoms`

Submitted contact messages are stored in `data/messages.json`.
Submitted symptom demo records are stored in `data/symptom-submissions.json`.
