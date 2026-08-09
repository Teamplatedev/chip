# CHIP — Child-Health Intelligence Platform

Open-source platform that integrates aggregate epidemiological data with the
national school climate monitoring network to produce a daily **0–4
child-weighted risk level** per district, each linked to defined school
preparedness actions. Built for Lao PDR (Vientiane prefecture).

CHIP reports **exposure of children**, not hazard alone: a district with
moderate pollution but a high density of children and schools can score higher
than a more polluted district with few children.

> **Stage:** early / working prototype. The index is preliminary — the Ridge
> regression climate-health model, live epidemiological integration and the
> MapLibre migration are workplan milestones (Q1–Q4 2027). See
> [`docs/model-card.md`](docs/model-card.md).

## Repository layout

| Path | What |
| --- | --- |
| [`chip-backend`](chip-backend) | Node.js + Express + TS API. Source-neutral ingestion (real AirGradient connector + synthetic fallback) and the 0–4 risk model. |
| [`chip-frontend`](chip-frontend) | Next.js dashboard: risk index, map, exposure trend, district deviations, monitoring network, source status. |
| [`docs/architecture.md`](docs/architecture.md) | Tech-stack + data-flow diagrams (Template 2 Annex 1 / Annex 2). |
| [`docs/model-card.md`](docs/model-card.md) | Model card for the prototype risk index. |

## Quickstart

```bash
# 1) API (defaults to synthetic data; set AIRGRADIENT_API_TOKEN for live data)
cd chip-backend && npm install && npm run dev      # http://localhost:3001/api

# 2) Dashboard (in a second terminal)
cd chip-frontend && npm install && npm run dev     # http://localhost:3000
```

## Tech stack

Next.js + TypeScript · Node.js + Express · Python analytics (workplan) ·
PostgreSQL + PostGIS (workplan) · MapLibre GL (workplan) · AWS + Docker ·
GitHub Actions CI.

## Quality

- Backend: `npm run test:cov` (Vitest, target ≥ 80% coverage).
- CI runs lint + build + tests on every push/PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
- Public endpoints are covered by a test asserting no facility-identifying field
  reaches the aggregation layer (two-tier disclosure).

## Licence

Software: **MIT** ([`LICENSE`](LICENSE)). Data products derived from AirGradient
measurements: **CC-BY-SA 4.0** ([`NOTICE`](NOTICE)).
