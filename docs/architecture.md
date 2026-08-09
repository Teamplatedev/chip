# CHIP — Architecture

This document backs **Template 2, Annex 1 (tech stack)** and **Annex 2 (data
flow)**. Diagrams render on GitHub. Status legend:

- 🟢 **implemented** — running in this repository today
- 🟡 **synthetic** — running on synthetic/fallback data; real source integrated under the workplan
- ⚪ **planned** — scheduled milestone (Q1–Q4 2027)

All software components are **MIT**; data products derived from AirGradient
measurements are **CC-BY-SA 4.0** (see `NOTICE`).

## Annex 1 — Tech stack

```mermaid
flowchart TB
  subgraph SRC[Data sources]
    AG[AirGradient Public API<br/>national school network · 🟡→🟢]
    LST[Satellite LST<br/>MODIS / Landsat · ⚪]
    ERA5[ERA5 reanalysis<br/>Copernicus CDS · ⚪]
    DHIS[DHIS2 + partner hospitals<br/>aggregate case data · 🟡]
    LSB[Lao Statistics Bureau<br/>child population + schools · 🟡]
  end

  subgraph ING[Collection and processing]
    CONN[Source-neutral ingestion layer<br/>Node.js · Express · TS · 🟢<br/>MQTT / HTTP REST / CSV adapters ⚪]
    SCHEMA[Open environmental data schema<br/>+ CC-BY-SA attribution · 🟡]
    ETL[Python ETL<br/>pandas · xarray · GDAL · ⚪]
    DB[(PostgreSQL + PostGIS<br/>⚪ · in-memory store today 🟢)]
  end

  subgraph ANA[Analysis]
    HEAT[Heat exposure layer<br/>AIT-adapted · ⚪]
    RIDGE[Ridge regression climate-health model<br/>scikit-learn · statsmodels · ⚪<br/>interpretable stand-in today 🟢]
    IDX[0-4 child-weighted risk index<br/>+ uncertainty band · 🟢]
    ANOM[Time-series anomaly detection<br/>per-district baseline · 🟢]
    REC[SOP + recommendation engine<br/>⚪]
  end

  subgraph PRES[Presentation]
    API[Public real-time data API<br/>Express · 🟢]
    MAP[Geospatial rendering<br/>MapLibre GL ⚪ · Google Maps today 🟢]
    UI[Dashboard + role-based views<br/>Next.js · TS · Tailwind · 🟢]
    ALERT[Alert / SOP delivery · ⚪]
  end

  subgraph INFRA[Infrastructure]
    HOST[AWS + Docker · ⚪]
    CI[GitHub + GitHub Actions CI<br/>vitest coverage · 🟢]
  end

  AG --> CONN
  LST --> ETL
  ERA5 --> ETL
  DHIS --> ETL
  LSB --> ETL
  CONN --> SCHEMA --> DB
  ETL --> DB
  DB --> HEAT --> RIDGE --> IDX
  DB --> ANOM
  IDX --> REC
  IDX --> API
  ANOM --> API
  REC --> ALERT
  API --> UI
  API --> MAP
  MAP --> UI
  CI -.tests.-> CONN
  CI -.tests.-> IDX
  HOST -.hosts.-> API
```

## Annex 2 — Data flow and the two-tier disclosure boundary

Public outputs aggregate to **district** level with every facility-identifying
field excluded; facility detail returns only under role-based access. Automated
tests assert that no facility-identifying field can reach the public layer.

```mermaid
flowchart LR
  AG[AirGradient API<br/>current measures] --> HARM
  SAT[Satellite LST · ERA5 ⚪] --> HARM
  EPI[DHIS2 / hospitals<br/>aggregate counts 🟡] --> HARM
  POP[Lao Stats Bureau<br/>child density + schools 🟡] --> WEIGHT

  HARM[Harmonise onto common<br/>spatio-temporal grid] --> MODEL
  MODEL[Ridge model<br/>climate → case signal] --> WEIGHT
  WEIGHT[Child-density + school<br/>proximity weighting] --> LEVEL

  LEVEL[0-4 risk level<br/>+ uncertainty band]

  LEVEL --> BOUND{Disclosure<br/>boundary}
  BOUND -->|district aggregate<br/>no facility fields| PUBLIC[Public API + dashboard]
  BOUND -->|facility detail| ROLE[Role-based access<br/>owning facility only]
```

## What runs in this repository today (Phase 1)

- `chip-backend`: Express + TS API serving the **0-4 child-weighted risk index**
  over a **source-neutral ingestion layer** (real AirGradient connector with a
  synthetic fallback). Vitest coverage ≥ 80%.
- `chip-frontend`: Next.js dashboard presenting the index, risk map, exposure
  trend, district deviations, monitoring network and per-source status.
- The risk model is an interpretable stand-in for the Ridge regression model
  (Q2 2027). See `docs/model-card.md`.
