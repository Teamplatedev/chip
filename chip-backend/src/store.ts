import { computeRisk } from './domain/risk.js';
import type { RiskLevel } from './domain/riskLevels.js';
import type {
  Anomaly,
  CaseSignal,
  DistrictRisk,
  HeatmapPoint,
  MonitoringSite,
  Overview,
  RiskDrivers,
  SourceStatus,
  TelemetryPoint,
} from './domain/types.js';
import {
  DISTRICT_SEEDS,
  IngestionService,
  nearestDistrict,
  nearestDistrictWithin,
  PREFECTURE_RADIUS_DEG,
  Rng,
  type DistrictSeed,
  type IngestionResult,
} from './ingestion/index.js';

/**
 * Australian apparent temperature (heat index) from dry-bulb temp and humidity,
 * wind term omitted. Adds the thermal dimension air quality alone cannot cover.
 */
export function apparentTemperature(tempC: number, humidityPct: number): number {
  const e = (humidityPct / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  return tempC + 0.33 * e - 4.0;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * In-memory data store. Loads readings from the ingestion service, computes the
 * 0-4 child-weighted risk per district, and derives overview / telemetry /
 * anomalies / source status. Replaced by PostgreSQL + PostGIS in a later phase;
 * the read API it exposes stays the same.
 *
 * `refresh()` re-fetches and recomputes everything, timestamping the snapshot
 * with the current time; `startAutoRefresh()` runs it periodically in the
 * background. The new snapshot is assembled into locals and swapped in
 * atomically, so a failed refresh leaves the previous data in place.
 */
export class DataStore {
  private sites: MonitoringSite[] = [];
  private districts: DistrictRisk[] = [];
  private anomalies: Anomaly[] = [];
  private telemetry: TelemetryPoint[] = [];
  private sourceStatus: SourceStatus[] = [];
  private overview!: Overview;
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly ingestion: IngestionService) {}

  /** Initial load. Rejects if the first load fails (the server should not start empty). */
  async init(): Promise<void> {
    await this.refresh();
  }

  /**
   * Re-fetch from the ingestion service and recompute every derived value,
   * timestamped with the current time. The result is swapped in atomically: if
   * the load rejects or a build step throws, the previous snapshot is untouched.
   */
  async refresh(): Promise<void> {
    const result = await this.ingestion.load();
    this.rebuild(result);
  }

  /**
   * Run `refresh()` every `intervalMs`. Refresh errors are caught and logged so
   * the server keeps serving the previous data instead of crashing. The
   * AirGradient→synthetic fallback inside the ingestion layer is unchanged.
   */
  startAutoRefresh(intervalMs: number): void {
    this.stopAutoRefresh();
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;
    this.refreshTimer = setInterval(() => {
      void this.refresh().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[store] periodic refresh failed, keeping previous data: ${msg}`);
      });
    }, intervalMs);
    // A refresh timer should not keep the process alive on its own.
    this.refreshTimer.unref?.();
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  getOverview(): Overview {
    return this.overview;
  }
  getDistricts(): DistrictRisk[] {
    return this.districts;
  }
  getDistrict(id: string): DistrictRisk | undefined {
    return this.districts.find((d) => d.id === id || d.district.toLowerCase() === id.toLowerCase());
  }
  getSites(): MonitoringSite[] {
    return this.sites;
  }
  getAnomalies(): Anomaly[] {
    return this.anomalies;
  }
  getSourceStatus(): SourceStatus[] {
    return this.sourceStatus;
  }
  getHeatmap(): HeatmapPoint[] {
    const points: HeatmapPoint[] = [];
    for (const d of this.districts) {
      points.push({ lat: d.centerLat, lng: d.centerLng, weight: (d.riskLevel + 1) * 2 });
    }
    for (const s of this.sites) {
      if (s.status === 'offline') continue;
      points.push({ lat: s.lat, lng: s.lng, weight: Math.max(1, s.reading.pm25 / 12) });
    }
    return points;
  }

  getTelemetryAggregate(range: '24h' | '7d' = '24h'): TelemetryPoint[] {
    return range === '7d' ? this.telemetry : this.telemetry.slice(-96);
  }

  // -- build pipeline ------------------------------------------------------

  private rebuild(result: IngestionResult): void {
    // Timestamp this snapshot with the current time so telemetry and anomaly
    // timestamps below are anchored to "now" rather than a fixed date.
    const generatedAt = new Date().toISOString();

    // The prototype models Vientiane prefecture. The live UNICEF network is
    // national (17 provinces), so drop sensors outside the prefecture rather
    // than mis-assigning them — and report how many were dropped.
    const readings = result.readings.filter(
      (r) => nearestDistrictWithin(r.lat, r.lng, PREFECTURE_RADIUS_DEG) !== null,
    );
    const dropped = result.readings.length - readings.length;
    if (dropped > 0) {
      console.log(
        `[store] ${readings.length} sensors within Vientiane prefecture; ` +
          `${dropped} out-of-prefecture UNICEF sensors excluded (national expansion is future work).`,
      );
    }

    const sites: MonitoringSite[] = readings.map((r) => ({
      id: r.siteId,
      name: r.siteName,
      district: nearestDistrict(r.lat, r.lng).name,
      lat: r.lat,
      lng: r.lng,
      status: r.status,
      source: r.source,
      reading: {
        pm25: r.pm25,
        temperature: r.temperature,
        humidity: r.humidity,
        co2: r.co2,
      },
      updatedAt: r.observedAt,
    }));

    const rng = new Rng(424242);
    const maxChildren = Math.max(...DISTRICT_SEEDS.map((d) => d.childPopulation));
    const maxSchools = Math.max(...DISTRICT_SEEDS.map((d) => d.schoolCount));

    const districts = DISTRICT_SEEDS.map((seed) =>
      this.buildDistrict(seed, sites, rng, maxChildren, maxSchools, generatedAt),
    );

    const telemetry = this.buildTelemetry(districts, rng, generatedAt);
    const anomalies = this.buildAnomalies(districts, rng, generatedAt);
    const overview = this.buildOverview(districts, sites, anomalies, generatedAt);
    const sourceStatus = this.buildSourceStatus(districts, overview, result);

    // Atomic swap — only reached if every step above succeeded.
    this.sites = sites;
    this.districts = districts;
    this.telemetry = telemetry;
    this.anomalies = anomalies;
    this.overview = overview;
    this.sourceStatus = sourceStatus;
  }

  private buildDistrict(
    seed: DistrictSeed,
    sites: MonitoringSite[],
    rng: Rng,
    maxChildren: number,
    maxSchools: number,
    generatedAt: string,
  ): DistrictRisk {
    const online = sites.filter(
      (s) => s.district === seed.name && s.status !== 'offline',
    );
    const bias = (seed.baseHazard - 50) / 50;

    // Environmental drivers: measured where monitors report, otherwise a
    // baseline estimate for the district so the index still publishes (with a
    // wider uncertainty band).
    const drivers: RiskDrivers = online.length
      ? {
          pm25: Math.round(mean(online.map((s) => s.reading.pm25))),
          co2: Math.round(mean(online.map((s) => s.reading.co2))),
          humidity: Math.round(mean(online.map((s) => s.reading.humidity))),
          heatIndex: Number(
            mean(
              online.map((s) => apparentTemperature(s.reading.temperature, s.reading.humidity)),
            ).toFixed(1),
          ),
        }
      : {
          pm25: Math.round(28 + bias * 22),
          co2: Math.round(680 + bias * 200),
          humidity: Math.round(62 + bias * 6),
          heatIndex: Number((30 + bias * 4).toFixed(1)),
        };

    // Synthetic aggregate epidemiological signal (counts only). Replaced by
    // DHIS2 / partner-hospital aggregates under a data use agreement (Q1 2027).
    const caseSignal: CaseSignal = {
      respiratoryPer1k: Number((22 + bias * 18 + rng.range(-4, 4)).toFixed(1)),
      feverPer1k: Number((14 + bias * 12 + rng.range(-3, 3)).toFixed(1)),
      reportingCompleteness: Number((0.55 + 0.35 * (1 - Math.abs(bias)) + rng.range(0, 0.05)).toFixed(2)),
    };

    const dataCompleteness = Number(
      Math.min(1, online.length / Math.max(1, seed.monitors)).toFixed(2),
    );
    const densityRank = seed.childPopulation / maxChildren;
    const schoolRank = seed.schoolCount / maxSchools;

    const risk = computeRisk({ drivers, caseSignal, densityRank, schoolRank, dataCompleteness });

    return {
      id: seed.name.toLowerCase().replace(/\s+/g, '-'),
      district: seed.name,
      centerLat: seed.center.lat,
      centerLng: seed.center.lng,
      childPopulation: seed.childPopulation,
      schoolCount: seed.schoolCount,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      uncertainty: risk.uncertainty,
      drivers,
      caseSignal,
      childWeight: risk.childWeight,
      monitorCount: online.length,
      dataCompleteness,
      updatedAt: generatedAt,
    };
  }

  private buildTelemetry(
    districts: DistrictRisk[],
    rng: Rng,
    generatedAt: string,
  ): TelemetryPoint[] {
    const basePm = mean(districts.map((d) => d.drivers.pm25));
    const baseCo2 = mean(districts.map((d) => d.drivers.co2));
    const baseTemp = mean(districts.map((d) => d.drivers.heatIndex));
    const baseHum = mean(districts.map((d) => d.drivers.humidity));

    const intervalMin = 15;
    const points = (24 * 60 * 7) / intervalMin;
    const endMs = Date.parse(generatedAt);
    const startMs = endMs - points * intervalMin * 60_000;

    const series: TelemetryPoint[] = [];
    for (let i = 0; i < points; i++) {
      const ms = startMs + i * intervalMin * 60_000;
      const d = new Date(ms);
      const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
      const dow = d.getUTCDay();
      const dayActive = dow >= 1 && dow <= 5 ? 1 : 0.4;
      const occupancy = hour >= 8 && hour <= 17 ? Math.sin(((hour - 8) / 9) * Math.PI) * dayActive : 0;
      const noise = (rng.next() - 0.5) * 0.3 + 1;

      series.push({
        t: d.toISOString(),
        co2: Math.round((baseCo2 + occupancy * 700) * noise),
        pm25: Math.round((basePm + occupancy * 22 + (hour >= 17 && hour <= 19 ? 10 : 0)) * noise),
        temperature: Number((baseTemp + occupancy * 4 + (hour >= 13 && hour <= 16 ? 1.5 : 0)).toFixed(1)),
        humidity: Number((baseHum + occupancy * 6 + (hour >= 4 && hour <= 7 ? 6 : 0)).toFixed(1)),
      });
    }
    return series;
  }

  private buildAnomalies(
    districts: DistrictRisk[],
    rng: Rng,
    generatedAt: string,
  ): Anomaly[] {
    const templates: {
      metric: Anomaly['metric'];
      signal: string;
      message: (d: DistrictRisk, sigma: number) => string;
    }[] = [
      {
        metric: 'pm25',
        signal: 'PM2.5 deviation',
        message: (d, s) => `PM2.5 in ${d.district} is ${s.toFixed(1)}σ above its seasonal baseline (${d.drivers.pm25} µg/m³).`,
      },
      {
        metric: 'heatIndex',
        signal: 'Heat exposure',
        message: (d, s) => `Apparent temperature in ${d.district} ${s.toFixed(1)}σ above baseline (${d.drivers.heatIndex}°C).`,
      },
      {
        metric: 'co2',
        signal: 'Indoor CO₂',
        message: (d, s) => `Occupancy CO₂ proxy elevated in ${d.district} (${d.drivers.co2} ppm, ${s.toFixed(1)}σ).`,
      },
      {
        metric: 'humidity',
        signal: 'Humidity drift',
        message: (d, s) => `Humidity in ${d.district} sustained ${s.toFixed(1)}σ above baseline (${d.drivers.humidity}%).`,
      },
    ];

    const anomalies: Anomaly[] = [];
    let serial = 3000;
    // Elevated districts generate more deviations, weighted by their level.
    const ranked = [...districts].sort((a, b) => b.riskScore - a.riskScore);
    for (const d of ranked) {
      const count = d.riskLevel;
      for (let i = 0; i < count; i++) {
        const tpl = templates[rng.int(0, templates.length - 1)];
        const sigma = Number((1.8 + rng.range(0, 2.5) + d.riskLevel * 0.3).toFixed(1));
        const minsAgo = rng.int(3, 60 * 30);
        const detectedAt = new Date(Date.parse(generatedAt) - minsAgo * 60_000).toISOString();
        anomalies.push({
          id: `A-${serial++}`,
          district: d.district,
          signal: tpl.signal,
          message: tpl.message(d, sigma),
          level: d.riskLevel,
          metric: tpl.metric,
          sigma,
          detectedAt,
        });
      }
    }
    anomalies.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    return anomalies;
  }

  private buildOverview(
    districts: DistrictRisk[],
    sites: MonitoringSite[],
    anomalies: Anomaly[],
    generatedAt: string,
  ): Overview {
    const levelDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 } as Record<RiskLevel, number>;
    for (const d of districts) levelDistribution[d.riskLevel]++;

    const highest = [...districts].sort((a, b) => b.riskScore - a.riskScore)[0];
    const online = sites.filter((s) => s.status === 'online').length;

    return {
      generatedAt,
      districtsCovered: districts.length,
      childrenCovered: districts.reduce((s, d) => s + d.childPopulation, 0),
      highestRiskDistrict: highest?.district ?? '',
      highestRiskLevel: highest?.riskLevel ?? 0,
      levelDistribution,
      monitorsOnline: online,
      monitorsTotal: sites.length,
      dataCompleteness: Number(mean(districts.map((d) => d.dataCompleteness)).toFixed(2)),
      anomaliesActive: anomalies.length,
    };
  }

  private buildSourceStatus(
    districts: DistrictRisk[],
    overview: Overview,
    result: IngestionResult,
  ): SourceStatus[] {
    const envCompleteness = overview.dataCompleteness;
    return [
      {
        key: 'airgradient',
        label: 'National school climate network (AirGradient API)',
        state: result.live ? 'live' : 'synthetic',
        completeness: envCompleteness,
        note: result.live
          ? `Live: ${result.source}`
          : 'Synthetic fallback — set AIRGRADIENT_API_TOKEN to connect the live network.',
      },
      {
        key: 'satellite-lst',
        label: 'Satellite land surface temperature (MODIS/Landsat)',
        state: 'planned',
        completeness: 0,
        note: 'ETL pipeline scheduled Q2 2027.',
      },
      {
        key: 'era5',
        label: 'ERA5 reanalysis (Copernicus CDS)',
        state: 'planned',
        completeness: 0,
        note: 'Reanalysis harmonisation scheduled Q2 2027.',
      },
      {
        key: 'dhis2',
        label: 'Epidemiological case data (DHIS2 / partner hospitals)',
        state: 'synthetic',
        completeness: Number(mean(districts.map((d) => d.caseSignal.reportingCompleteness)).toFixed(2)),
        note: 'Aggregate counts only. Data use agreements scheduled Q1 2027.',
      },
      {
        key: 'lsb',
        label: 'Lao Statistics Bureau population & schools',
        state: 'synthetic',
        completeness: 1,
        note: 'Child-density and school-proximity weighting layers.',
      },
    ];
  }
}
