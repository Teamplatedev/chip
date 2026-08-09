import { describe, it, expect, vi, afterEach } from 'vitest';
import { AirGradientSource } from '../src/ingestion/airgradient.js';

const config = { baseUrl: 'https://api.airgradient.com', token: 'test-token', timeoutMs: 2000 };

function mockFetch(response: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => response,
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AirGradientSource', () => {
  it('maps Lao locations and reports live', async () => {
    mockFetch([
      {
        locationId: 42,
        locationName: 'Vientiane School A',
        latitude: 17.97,
        longitude: 102.61,
        pm02: 31.4,
        atmp: 30.2,
        rhum: 72,
        rco2: 640,
        timestamp: new Date().toISOString(),
      },
    ]);
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.live).toBe(true);
    expect(res.readings).toHaveLength(1);
    expect(res.readings[0].pm25).toBe(31);
    expect(res.readings[0].source).toBe('AirGradient');
    expect(res.readings[0].status).toBe('online');
  });

  it('filters out locations outside the Lao bounding box', async () => {
    mockFetch([
      { locationId: 1, latitude: 48.85, longitude: 2.35, pm02: 10, timestamp: new Date().toISOString() },
    ]);
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.live).toBe(false);
    expect(res.readings).toHaveLength(0);
  });

  it('classifies a stale reading as offline', async () => {
    const old = new Date(Date.now() - 5 * 3600_000).toISOString();
    mockFetch([
      { locationId: 2, latitude: 18.0, longitude: 102.6, pm02: 12, timestamp: old },
    ]);
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.readings[0].status).toBe('offline');
  });

  it('accepts a { data: [...] } envelope', async () => {
    mockFetch({
      data: [{ locationId: 3, latitude: 17.95, longitude: 102.62, pm02: 20, timestamp: new Date().toISOString() }],
    });
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.live).toBe(true);
    expect(res.readings).toHaveLength(1);
  });

  it('falls back (live:false) on a non-200 response', async () => {
    mockFetch({}, false, 503);
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.live).toBe(false);
    expect(res.readings).toHaveLength(0);
  });

  it('keeps only the configured contributor when set', async () => {
    mockFetch([
      { locationId: 10, publicContributorName: 'UNICEF', latitude: 17.97, longitude: 102.61, pm02: 5, timestamp: new Date().toISOString() },
      { locationId: 11, publicContributorName: 'Someone Else', latitude: 17.98, longitude: 102.62, pm02: 40, timestamp: new Date().toISOString() },
    ]);
    const res = await new AirGradientSource({ ...config, contributor: 'UNICEF' }).fetchCurrent();
    expect(res.readings).toHaveLength(1);
    expect(res.readings[0].siteId).toBe('10');
  });

  it('honours the upstream offline flag', async () => {
    mockFetch([
      { locationId: 12, latitude: 17.97, longitude: 102.61, pm02: 5, offline: true, timestamp: new Date().toISOString() },
    ]);
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.readings[0].status).toBe('offline');
  });

  it('falls back (live:false) when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const res = await new AirGradientSource(config).fetchCurrent();
    expect(res.live).toBe(false);
    expect(res.readings).toHaveLength(0);
  });
});
