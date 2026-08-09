import type { EnvironmentalSource, IngestionResult, RawReading } from './source.js';
import { LAO_BBOX, nearestDistrict } from './source.js';
import type { SiteStatus } from '../domain/types.js';

/**
 * AirGradient Public API connector.
 *
 * CHIP deploys no hardware: environmental measurement comes from the national
 * school climate network established by UNICEF Lao PDR with MoES and MoNRE,
 * accessed through the AirGradient Public API. Data is CC-BY-SA 4.0 — every
 * record carries source attribution.
 *
 * This adapter is source-neutral by contract: it fetches current measures for
 * public locations, filters to the Lao bounding box, and harmonises the fields.
 * On any failure (no token, network error, non-200, empty result) it returns an
 * empty live:false result so the ingestion service falls back to synthetic —
 * the platform never hard-fails on a missing upstream.
 */

interface AgLocation {
  locationId?: number | string;
  locationName?: string;
  publicContributorName?: string;
  latitude?: number;
  longitude?: number;
  offline?: boolean;
  pm02?: number | null; // PM2.5 µg/m³
  atmp?: number | null; // ambient temperature °C
  rhum?: number | null; // relative humidity %
  rco2?: number | null; // CO₂ ppm
  timestamp?: string;
}

export interface AirGradientConfig {
  baseUrl: string;
  token?: string;
  timeoutMs: number;
  /** Only ingest sites from this public contributor (e.g. the UNICEF Lao network). */
  contributor?: string;
}

function num(v: number | null | undefined, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function classifyStatus(timestamp?: string, nowMs = Date.now()): SiteStatus {
  if (!timestamp) return 'buffering';
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return 'buffering';
  const ageMin = (nowMs - t) / 60000;
  if (ageMin <= 30) return 'online';
  if (ageMin <= 180) return 'buffering';
  return 'offline';
}

function inLao(lat: number, lng: number): boolean {
  return (
    lat >= LAO_BBOX.minLat &&
    lat <= LAO_BBOX.maxLat &&
    lng >= LAO_BBOX.minLng &&
    lng <= LAO_BBOX.maxLng
  );
}

export class AirGradientSource implements EnvironmentalSource {
  readonly key = 'airgradient';
  readonly label = 'AirGradient Public API (national school network)';

  constructor(private readonly config: AirGradientConfig) {}

  async fetchCurrent(): Promise<IngestionResult> {
    const empty: IngestionResult = { source: this.label, live: false, readings: [] };
    try {
      const url = new URL('/public/api/v1/world/locations/measures/current', this.config.baseUrl);
      if (this.config.token) url.searchParams.set('token', this.config.token);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      let res: Response;
      try {
        res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        console.warn(`[airgradient] upstream ${res.status} ${res.statusText}; falling back`);
        return empty;
      }

      const body = (await res.json()) as AgLocation[] | { data?: AgLocation[] };
      const locations = Array.isArray(body) ? body : (body.data ?? []);
      const readings = this.mapLocations(locations);

      if (readings.length === 0) {
        console.warn('[airgradient] no Lao locations in response; falling back');
        return empty;
      }
      return { source: this.label, live: true, readings };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[airgradient] fetch failed (${msg}); falling back to synthetic`);
      return empty;
    }
  }

  private mapLocations(locations: AgLocation[]): RawReading[] {
    const wantContributor = this.config.contributor?.trim().toLowerCase();
    const readings: RawReading[] = [];
    for (const loc of locations) {
      const lat = num(loc.latitude, NaN);
      const lng = num(loc.longitude, NaN);
      if (Number.isNaN(lat) || Number.isNaN(lng) || !inLao(lat, lng)) continue;

      // Restrict to the target network (the UNICEF Lao PDR school/hospital
      // sensors), so we don't pick up unrelated public sites near the border.
      if (wantContributor) {
        const contributor = (loc.publicContributorName ?? '').trim().toLowerCase();
        if (contributor !== wantContributor) continue;
      }

      const district = nearestDistrict(lat, lng);
      readings.push({
        siteId: String(loc.locationId ?? `${lat.toFixed(4)},${lng.toFixed(4)}`),
        siteName: loc.locationName?.trim() || `${district.name} station`,
        lat,
        lng,
        // Trust the upstream offline flag first, then fall back to staleness.
        status: loc.offline ? 'offline' : classifyStatus(loc.timestamp),
        source: 'AirGradient',
        pm25: Math.round(num(loc.pm02)),
        temperature: Number(num(loc.atmp).toFixed(1)),
        humidity: Math.round(num(loc.rhum)),
        co2: Math.round(num(loc.rco2)),
        observedAt: loc.timestamp ?? new Date().toISOString(),
      });
    }
    return readings;
  }
}
