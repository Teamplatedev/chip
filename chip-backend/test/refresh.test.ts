import { describe, it, expect, vi, afterEach } from 'vitest';
import { DataStore } from '../src/store.js';
import type {
  IngestionResult,
  IngestionService,
  RawReading,
} from '../src/ingestion/index.js';

function reading(overrides: Partial<RawReading> = {}): RawReading {
  return {
    siteId: 'T1',
    siteName: 'Test site',
    lat: 17.97,
    lng: 102.61,
    status: 'online',
    source: 'test',
    pm25: 20,
    temperature: 30,
    humidity: 60,
    co2: 600,
    observedAt: new Date().toISOString(),
    ...overrides,
  };
}

function okResult(): IngestionResult {
  return { source: 'test-source', live: true, readings: [reading()] };
}

/** Minimal stand-in for IngestionService whose load() behaviour is scripted per call. */
class FakeIngestion {
  calls = 0;
  constructor(private readonly behavior: (call: number) => Promise<IngestionResult>) {}
  load(): Promise<IngestionResult> {
    this.calls += 1;
    return this.behavior(this.calls);
  }
}

function makeStore(behavior: (call: number) => Promise<IngestionResult>): DataStore {
  return new DataStore(new FakeIngestion(behavior) as unknown as IngestionService);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('generatedAt uses the current time', () => {
  it('sets overview.generatedAt to ~now, not the old hardcoded date', async () => {
    const store = makeStore(() => Promise.resolve(okResult()));
    await store.init();

    const gen = Date.parse(store.getOverview().generatedAt);
    expect(Math.abs(Date.now() - gen)).toBeLessThan(10_000);
    expect(store.getOverview().generatedAt).not.toContain('2026-08-09');
  });

  it('anchors telemetry and anomaly timestamps to the current time', async () => {
    const store = makeStore(() => Promise.resolve(okResult()));
    await store.init();
    const now = Date.now();

    const tele = store.getTelemetryAggregate('24h');
    const lastT = Date.parse(tele[tele.length - 1].t);
    // The most recent telemetry point is one interval before "now".
    expect(lastT).toBeLessThanOrEqual(now + 1000);
    expect(now - lastT).toBeLessThan(30 * 60 * 1000);

    for (const a of store.getAnomalies()) {
      expect(Date.parse(a.detectedAt)).toBeLessThanOrEqual(now + 1000);
    }
  });
});

describe('refresh()', () => {
  it('advances generatedAt on each refresh', async () => {
    const store = makeStore(() => Promise.resolve(okResult()));
    await store.init();
    const first = store.getOverview().generatedAt;

    await new Promise((r) => setTimeout(r, 5));
    await store.refresh();
    const second = store.getOverview().generatedAt;

    expect(Date.parse(second)).toBeGreaterThanOrEqual(Date.parse(first));
    expect(second).not.toBe(first);
  });

  it('keeps the previous data when a refresh fails', async () => {
    const store = makeStore((call) =>
      call === 1 ? Promise.resolve(okResult()) : Promise.reject(new Error('boom')),
    );
    await store.init();
    const before = store.getOverview();

    await expect(store.refresh()).rejects.toThrow('boom');

    const after = store.getOverview();
    expect(after).toEqual(before);
    expect(after.generatedAt).toBe(before.generatedAt);
  });

  it('recovers on a later successful refresh after a failure', async () => {
    const store = makeStore((call) =>
      call === 2 ? Promise.reject(new Error('transient')) : Promise.resolve(okResult()),
    );
    await store.init();
    await expect(store.refresh()).rejects.toThrow('transient');
    await expect(store.refresh()).resolves.toBeUndefined();
    expect(store.getOverview().districtsCovered).toBeGreaterThan(0);
  });
});

describe('startAutoRefresh / stopAutoRefresh', () => {
  it('refreshes on the interval and stops cleanly', async () => {
    const store = makeStore(() => Promise.resolve(okResult()));
    await store.init();
    const spy = vi.spyOn(store, 'refresh');

    vi.useFakeTimers();
    store.startAutoRefresh(1000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(spy).toHaveBeenCalledTimes(3);

    store.stopAutoRefresh();
    await vi.advanceTimersByTimeAsync(5000);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('does not schedule when the interval is non-positive', async () => {
    const store = makeStore(() => Promise.resolve(okResult()));
    await store.init();
    const spy = vi.spyOn(store, 'refresh');

    vi.useFakeTimers();
    store.startAutoRefresh(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(spy).not.toHaveBeenCalled();
    store.stopAutoRefresh();
  });

  it('survives a failing periodic refresh without throwing', async () => {
    const store = makeStore((call) =>
      call === 1 ? Promise.resolve(okResult()) : Promise.reject(new Error('periodic boom')),
    );
    await store.init();
    const before = store.getOverview();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.useFakeTimers();
    store.startAutoRefresh(1000);
    await vi.advanceTimersByTimeAsync(2000);
    store.stopAutoRefresh();

    // Previous data is retained and the process did not crash.
    expect(store.getOverview()).toEqual(before);
    expect(warn).toHaveBeenCalled();
  });
});
