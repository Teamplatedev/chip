import type { RiskLevel } from './riskLevels.js';

/**
 * CHIP domain model — the 0-4 child-weighted district risk index.
 *
 * The district is the primary published entity. Environmental measurement,
 * epidemiological case signal and child-density weighting are combined into a
 * single 0-4 risk level with a calibrated uncertainty band.
 */

/** Climate drivers behind a district's risk, aggregated over the reporting window. */
export interface RiskDrivers {
  /** PM2.5 concentration, µg/m³ (district aggregate). */
  pm25: number;
  /** Apparent heat / heat-exposure index, °C. */
  heatIndex: number;
  /** Indoor CO₂ proxy where available, ppm. */
  co2: number;
  /** Relative humidity, %. */
  humidity: number;
}

/**
 * Aggregate epidemiological signal. Counts only — no individually identifiable
 * record ever enters the platform. In the prototype this is synthetic; under
 * the workplan it comes from DHIS2 and partner hospitals by administrative unit.
 */
export interface CaseSignal {
  /** Child respiratory cases per 1,000 children in the reporting period. */
  respiratoryPer1k: number;
  /** Child fever episodes per 1,000 children in the reporting period. */
  feverPer1k: number;
  /** Reporting completeness of the epidemiological source, 0-1. */
  reportingCompleteness: number;
}

export interface DistrictRisk {
  id: string;
  district: string;
  centerLat: number;
  centerLng: number;
  childPopulation: number;
  schoolCount: number;
  /** Published 0-4 child-weighted risk level. */
  riskLevel: RiskLevel;
  /** Underlying continuous exposure score, 0-100 (basis for the level and bars). */
  riskScore: number;
  /** ± uncertainty on the level; widens as source coverage falls. */
  uncertainty: number;
  drivers: RiskDrivers;
  caseSignal: CaseSignal;
  /** Child-density × school-proximity weighting applied to hazard, ~0.6-1.4. */
  childWeight: number;
  /** Accessible monitoring sites contributing to this district. */
  monitorCount: number;
  /** Environmental data completeness for this district, 0-1. */
  dataCompleteness: number;
  updatedAt: string;
}

export type SiteStatus = 'online' | 'buffering' | 'offline';

/**
 * A monitoring site on the national school climate network (surfaced through
 * the AirGradient Public API). This is network infrastructure, not a
 * facility-level child record — the two-tier disclosure boundary (Phase 3)
 * governs what leaves the public layer.
 */
export interface MonitoringSite {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  status: SiteStatus;
  source: string;
  reading: {
    pm25: number;
    temperature: number;
    humidity: number;
    co2: number;
  };
  updatedAt: string;
}

export interface TelemetryPoint {
  t: string;
  co2: number;
  pm25: number;
  temperature: number;
  humidity: number;
}

/** Weighted point for map rendering (weight ≈ risk level). */
export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

/** District-level environmental deviation from the district's own baseline. */
export interface Anomaly {
  id: string;
  district: string;
  signal: string;
  message: string;
  /** Reuses the 0-4 scale to grade how far the deviation pushes district risk. */
  level: RiskLevel;
  metric: 'pm25' | 'heatIndex' | 'co2' | 'humidity';
  /** Standard deviations above the district baseline. */
  sigma: number;
  detectedAt: string;
}

export interface SourceStatus {
  key: string;
  label: string;
  /** implemented | synthetic | planned — prototype honesty about each source. */
  state: 'live' | 'synthetic' | 'planned';
  /** Data completeness / availability, 0-1. */
  completeness: number;
  note: string;
}

export interface Overview {
  generatedAt: string;
  districtsCovered: number;
  childrenCovered: number;
  highestRiskDistrict: string;
  highestRiskLevel: RiskLevel;
  /** Count of districts at each 0-4 level. */
  levelDistribution: Record<RiskLevel, number>;
  monitorsOnline: number;
  monitorsTotal: number;
  /** National average environmental data completeness, 0-1. */
  dataCompleteness: number;
  anomaliesActive: number;
}

export const VIENTIANE_CENTER = { lat: 17.9757, lng: 102.6331 };
