# chip-frontend

CHIP — **Child-Health Intelligence Platform** dashboard.

Presents the daily **0–4 child-weighted risk level** per Vientiane district:
district risk index with uncertainty bands, a risk map, prefecture exposure
trend, district-level deviation feed, monitoring-network status, and data-source
transparency. Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/radix.

## Getting started

The dashboard reads from **chip-backend**. Start the API first:

```bash
cd ../chip-backend && npm install && npm run dev   # http://localhost:3001/api
```

Then the frontend:

```bash
npm install
npm run dev        # http://localhost:3000
```

## Configuration

Copy `.env.local.example` to `.env.local`:

- `NEXT_PUBLIC_API_BASE_URL` — backend base URL (default `http://localhost:3001/api`).
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — optional. Without it, the map shows a
  schematic preview. **Phase 2 migrates the map to MapLibre GL** (open source)
  and removes this key.

## Structure

```
app/page.tsx              server component; fetches the API in parallel, renders the dashboard
lib/types.ts              CHIP domain model + 0-4 LEVEL_STYLES (mirrors the backend)
lib/api.ts                typed API client
components/dashboard/
  header.tsx              peak level, monitors, children covered, completeness
  kpi-cards.tsx           peak risk + level distribution, children in elevated zones, PM2.5, heat
  district-risk.tsx       the 0-4 index with uncertainty bands and preparedness postures
  map-panel.tsx           district risk circles + monitoring sites (Google Maps; MapLibre in Phase 2)
  telemetry-chart.tsx     prefecture CO2/PM2.5 exposure trend
  anomaly-feed.tsx        district-level time-series deviations
  monitoring-network.tsx  AirGradient network sites
  source-status.tsx       per-source state (live / synthetic / planned)
```
