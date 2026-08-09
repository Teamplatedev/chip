# chip-backend

CHIP — **Child-Health Intelligence Platform** API.

Publishes a daily **0–4 child-weighted risk level** per district for Vientiane
prefecture, combining environmental measurement from the national school
climate network (AirGradient Public API) with a child-density weighting layer.
Aggregate epidemiological case data and the Ridge regression climate-health
model are integrated under the workplan; this service already exposes the index
in its final API shape.

Stack: **Node.js + Express + TypeScript**. Licence: **MIT** (derived data
products are released separately under CC-BY-SA 4.0 per the AirGradient source).

## Architecture

```
ingestion/     source-neutral ingestion layer
  source.ts      EnvironmentalSource interface + district geography
  airgradient.ts AirGradient Public API adapter (real; graceful fallback)
  synthetic.ts   deterministic synthetic network (fallback / offline dev)
domain/        the 0-4 risk model
  riskLevels.ts  0-4 level definitions, labels, colours, preparedness postures
  risk.ts        child-weighted risk computation (interpretable Ridge stand-in)
  types.ts       domain types
store.ts       builds districts / overview / telemetry / anomalies / sources
routes/        Express /api router
app.ts         app assembly (CORS, routing)
index.ts       bootstrap
```

The ingestion layer is **source-neutral**: the AirGradient connector and the
synthetic generator are both adapters behind one interface, so MQTT / HTTP REST
/ CSV adapters (and, later, PostgreSQL + PostGIS storage) slot in without
changing anything downstream.

## Environmental data source

By default the service pulls **live** data from the AirGradient Public API — the
UNICEF Lao PDR national school climate network is exposed there **with no token
required**. The connector filters public sites to `publicContributorName =
"UNICEF"` (≈96 sensors nationally) and keeps those within Vientiane prefecture
(the modelled geography); out-of-prefecture sensors are logged and excluded.

```bash
npm run dev                      # live UNICEF network by default
AIRGRADIENT_ENABLED=false npm run dev   # force the synthetic fallback
```

If the live source is unreachable or returns nothing usable, the service logs a
warning and falls back to synthetic — it never hard-fails on a missing upstream.
`GET /api/sources` reports whether the environmental source is live or synthetic.

Config env vars: `AIRGRADIENT_ENABLED` (default true), `AIRGRADIENT_CONTRIBUTOR`
(default `UNICEF`), `AIRGRADIENT_BASE_URL`, `AIRGRADIENT_API_TOKEN` (optional,
passed through if set), `AIRGRADIENT_TIMEOUT_MS`.

> Note: with only ~9 sensors inside Vientiane prefecture, per-district data
> completeness is low and many districts fall back to a baseline estimate with a
> wide uncertainty band. This is expected and reported honestly, not an error.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | liveness |
| `GET /api/overview` | national roll-up: level distribution, children covered, completeness |
| `GET /api/districts` | all districts with 0–4 level, score, uncertainty band, drivers |
| `GET /api/districts/:id` | one district |
| `GET /api/districts/heatmap` | weighted points for map rendering |
| `GET /api/sites` | monitoring network sites (network infrastructure) |
| `GET /api/telemetry/aggregate?range=24h\|7d` | aggregate CO₂/PM2.5/temp/humidity series |
| `GET /api/anomalies?limit=&level=` | district-level environmental deviations |
| `GET /api/sources` | per-source status (live / synthetic / planned) + completeness |

## Scripts

```bash
npm run dev        # watch mode (tsx)
npm run build      # tsc -> dist/
npm start          # run built server
npm test           # vitest
npm run test:cov   # vitest + coverage (target >= 80%)
npm run lint
```

## Notes on prototype honesty

- The risk model is a transparent, interpretable **stand-in** for the Ridge
  regression climate-health model (Q2 2027). The index is preliminary until
  fitted against epidemiological case data.
- Epidemiological and satellite/reanalysis sources are reported as `synthetic`
  or `planned` in `/api/sources` — nothing here presents unfitted data as real.
- Baselines are tuned to be **seasonally plausible** (August = wet season, so
  PM2.5 is suppressed and heat/humidity dominate).
