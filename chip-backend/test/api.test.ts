import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { IngestionService } from '../src/ingestion/index.js';
import { DataStore } from '../src/store.js';
import { apparentTemperature } from '../src/store.js';

let app: Express;

beforeAll(async () => {
  // Force the synthetic source (no token) for deterministic tests.
  const config = loadConfig({ AIRGRADIENT_ENABLED: 'false' } as NodeJS.ProcessEnv);
  const store = new DataStore(new IngestionService(config));
  await store.init();
  app = buildApp(store, config);
});

describe('apparentTemperature', () => {
  it('raises the felt temperature under high humidity', () => {
    expect(apparentTemperature(32, 90)).toBeGreaterThan(32);
  });
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/overview', () => {
  it('returns a 0-4 level distribution and covered children', async () => {
    const res = await request(app).get('/api/overview');
    expect(res.status).toBe(200);
    expect(res.body.districtsCovered).toBeGreaterThan(0);
    expect(res.body.childrenCovered).toBeGreaterThan(0);
    expect(res.body.highestRiskLevel).toBeGreaterThanOrEqual(0);
    expect(res.body.highestRiskLevel).toBeLessThanOrEqual(4);
    expect(Object.keys(res.body.levelDistribution)).toHaveLength(5);
  });
});

describe('GET /api/districts', () => {
  it('returns districts each with a 0-4 risk level and uncertainty band', async () => {
    const res = await request(app).get('/api/districts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const d of res.body) {
      expect(d.riskLevel).toBeGreaterThanOrEqual(0);
      expect(d.riskLevel).toBeLessThanOrEqual(4);
      expect(d.uncertainty).toBeGreaterThan(0);
      expect(d.drivers).toHaveProperty('pm25');
    }
  });

  it('resolves a single district by id and 404s otherwise', async () => {
    const list = await request(app).get('/api/districts');
    const id = list.body[0].id;
    const ok = await request(app).get(`/api/districts/${id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.id).toBe(id);

    const missing = await request(app).get('/api/districts/nowhere-xyz');
    expect(missing.status).toBe(404);
  });
});

describe('public disclosure boundary', () => {
  it('never exposes facility-identifying child fields on the public district layer', async () => {
    const res = await request(app).get('/api/districts');
    const banned = ['childName', 'patient', 'studentId', 'facilityId', 'address'];
    for (const d of res.body) {
      for (const key of banned) expect(d).not.toHaveProperty(key);
    }
  });
});

describe('GET /api/telemetry/aggregate', () => {
  it('returns 96 points for 24h and more for 7d', async () => {
    const day = await request(app).get('/api/telemetry/aggregate?range=24h');
    const week = await request(app).get('/api/telemetry/aggregate?range=7d');
    expect(day.body).toHaveLength(96);
    expect(week.body.length).toBeGreaterThan(day.body.length);
    expect(day.body[0]).toHaveProperty('pm25');
  });
});

describe('GET /api/anomalies', () => {
  it('supports limit and level filters', async () => {
    const all = await request(app).get('/api/anomalies');
    expect(all.status).toBe(200);
    const limited = await request(app).get('/api/anomalies?limit=2');
    expect(limited.body.length).toBeLessThanOrEqual(2);
    const filtered = await request(app).get('/api/anomalies?level=4');
    for (const a of filtered.body) expect(a.level).toBe(4);
  });
});

describe('GET /api/sources', () => {
  it('reports source status including the synthetic AirGradient fallback', async () => {
    const res = await request(app).get('/api/sources');
    expect(res.status).toBe(200);
    const ag = res.body.find((s: { key: string }) => s.key === 'airgradient');
    expect(ag.state).toBe('synthetic');
  });
});

describe('GET /api/sites', () => {
  it('returns monitoring sites', async () => {
    const res = await request(app).get('/api/sites');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('reading');
  });
});
