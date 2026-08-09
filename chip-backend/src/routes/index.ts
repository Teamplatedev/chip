import { Router, type Request, type Response } from 'express';
import type { DataStore } from '../store.js';
import type { RiskLevel } from '../domain/riskLevels.js';

function parseRange(v: unknown): '24h' | '7d' {
  return v === '7d' ? '7d' : '24h';
}

/** Builds the `/api` router over the data store. */
export function createRouter(store: DataStore): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'chip-backend', ts: new Date().toISOString() });
  });

  router.get('/overview', (_req, res) => {
    res.json(store.getOverview());
  });

  // Static sub-paths must precede the ':id' param route.
  router.get('/districts/heatmap', (_req, res) => {
    res.json(store.getHeatmap());
  });

  router.get('/districts', (_req, res) => {
    res.json(store.getDistricts());
  });

  router.get('/districts/:id', (req, res) => {
    const district = store.getDistrict(req.params.id);
    if (!district) {
      res.status(404).json({ error: `District '${req.params.id}' not found` });
      return;
    }
    res.json(district);
  });

  router.get('/sites', (_req, res) => {
    res.json(store.getSites());
  });

  router.get('/telemetry/aggregate', (req, res) => {
    res.json(store.getTelemetryAggregate(parseRange(req.query.range)));
  });

  router.get('/anomalies', (req, res) => {
    let items = store.getAnomalies();
    const level = req.query.level;
    if (typeof level === 'string') {
      const wanted = new Set(level.split(',').map((n) => Number(n) as RiskLevel));
      items = items.filter((a) => wanted.has(a.level));
    }
    const limitRaw = req.query.limit;
    if (typeof limitRaw === 'string') {
      const n = Math.max(1, Math.min(500, parseInt(limitRaw, 10) || items.length));
      items = items.slice(0, n);
    }
    res.json(items);
  });

  router.get('/sources', (_req, res) => {
    res.json(store.getSourceStatus());
  });

  return router;
}
