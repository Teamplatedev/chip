import type { SiteStatus } from '../domain/types.js';

/**
 * Source-neutral ingestion interface.
 *
 * Any conforming device or dataset connects through the same interface, so a
 * replacement source (a new API, a CSV batch, an MQTT feed) can be added
 * without changing anything downstream. The AirGradient Public API and the
 * synthetic generator are both just adapters behind this contract.
 */

/** A raw measurement from a monitoring site, before harmonisation. */
export interface RawReading {
  siteId: string;
  siteName: string;
  lat: number;
  lng: number;
  status: SiteStatus;
  /** Attribution — which source supplied this record (required for licensing). */
  source: string;
  pm25: number;
  temperature: number;
  humidity: number;
  co2: number;
  observedAt: string;
}

export interface IngestionResult {
  /** Human-readable source label used in status reporting. */
  source: string;
  /** True when real upstream data was retrieved; false when synthetic fallback ran. */
  live: boolean;
  readings: RawReading[];
}

export interface EnvironmentalSource {
  readonly key: string;
  readonly label: string;
  /** Fetch current readings. Must resolve; adapters handle their own errors. */
  fetchCurrent(): Promise<IngestionResult>;
}

/** Deterministic PRNG so synthetic data and derived risk stay reproducible. */
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  bool(p = 0.5): boolean {
    return this.next() < p;
  }
}

/** Vientiane prefecture districts — the target geography for the prototype. */
export interface DistrictSeed {
  name: string;
  center: { lat: number; lng: number };
  spread: number;
  /** Baseline hazard bias 0-100 (pollution/heat character of the district). */
  baseHazard: number;
  childPopulation: number;
  schoolCount: number;
  monitors: number;
}

export const DISTRICT_SEEDS: DistrictSeed[] = [
  { name: 'Chanthabouly', center: { lat: 17.9676, lng: 102.6072 }, spread: 0.018, baseHazard: 58, childPopulation: 24800, schoolCount: 42, monitors: 9 },
  { name: 'Sikhottabong', center: { lat: 17.9701, lng: 102.5825 }, spread: 0.02, baseHazard: 67, childPopulation: 31200, schoolCount: 51, monitors: 8 },
  { name: 'Xaysetha', center: { lat: 17.9912, lng: 102.6494 }, spread: 0.024, baseHazard: 44, childPopulation: 28400, schoolCount: 46, monitors: 9 },
  { name: 'Sisattanak', center: { lat: 17.9501, lng: 102.6225 }, spread: 0.018, baseHazard: 51, childPopulation: 22100, schoolCount: 38, monitors: 7 },
  { name: 'Hadxaifong', center: { lat: 17.9214, lng: 102.6911 }, spread: 0.026, baseHazard: 72, childPopulation: 18900, schoolCount: 33, monitors: 8 },
  { name: 'Naxaithong', center: { lat: 18.0421, lng: 102.5128 }, spread: 0.03, baseHazard: 55, childPopulation: 14600, schoolCount: 27, monitors: 5 },
  { name: 'Sangthong', center: { lat: 18.0958, lng: 102.2541 }, spread: 0.035, baseHazard: 61, childPopulation: 9800, schoolCount: 19, monitors: 4 },
  { name: 'Pak Ngum', center: { lat: 17.7841, lng: 102.8915 }, spread: 0.04, baseHazard: 69, childPopulation: 11200, schoolCount: 21, monitors: 4 },
];

/** Bounding box for Lao PDR, used to filter public API locations. */
export const LAO_BBOX = { minLat: 13.9, maxLat: 22.6, minLng: 100.0, maxLng: 107.7 };

export function nearestDistrict(lat: number, lng: number): DistrictSeed {
  return nearestDistrictWithin(lat, lng, Infinity) ?? DISTRICT_SEEDS[0];
}

/**
 * Nearest district seed, but only if within `maxDeg` degrees of its centre.
 * Returns null for sites outside the modelled prefecture (e.g. UNICEF sensors
 * in other Lao provinces), so they are dropped rather than mis-assigned.
 */
export function nearestDistrictWithin(
  lat: number,
  lng: number,
  maxDeg: number,
): DistrictSeed | null {
  let best: DistrictSeed | null = null;
  let bestD = Infinity;
  for (const d of DISTRICT_SEEDS) {
    const dl = lat - d.center.lat;
    const dg = lng - d.center.lng;
    const dist = Math.sqrt(dl * dl + dg * dg);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return bestD <= maxDeg ? best : null;
}

/** ~0.5° ≈ 55 km: the radius within which a sensor counts toward Vientiane prefecture. */
export const PREFECTURE_RADIUS_DEG = 0.5;
