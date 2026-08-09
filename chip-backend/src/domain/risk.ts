import type { CaseSignal, RiskDrivers } from './types.js';
import { scoreToLevel, type RiskLevel } from './riskLevels.js';

/**
 * Child-weighted risk computation.
 *
 * PROTOTYPE MODEL — this is a transparent, interpretable stand-in for the Ridge
 * regression climate-health model scheduled for Q2 2027. It combines climate
 * hazard with a child-density weighting so the dashboard already reports the
 * 0-4 exposure scale in its final shape. It is deliberately linear and its
 * coefficients are named constants so they read like the Ridge coefficients
 * that will replace them. The index is preliminary until fitted against
 * epidemiological case data.
 */

/** Normalisation anchors (rough WHO / heat-stress reference points). */
export const PM25_REFERENCE = 75; // µg/m³ mapped to full hazard contribution
export const HEAT_REFERENCE_LOW = 28; // °C apparent — below this, no heat hazard
export const HEAT_REFERENCE_HIGH = 44; // °C apparent — full heat hazard
export const CO2_REFERENCE_LOW = 600; // ppm — below this, no indoor hazard
export const CO2_REFERENCE_HIGH = 1600; // ppm — full indoor hazard

/** Hazard coefficients (sum to 1). Interpretable weights on each driver. */
export const HAZARD_WEIGHTS = {
  pm25: 0.5,
  heat: 0.35,
  co2: 0.15,
} as const;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalise(value: number, low: number, high: number): number {
  return clamp01((value - low) / (high - low));
}

/** Climate hazard on a 0-1 scale, before child weighting. */
export function hazardScore(drivers: RiskDrivers): number {
  const pm = clamp01(drivers.pm25 / PM25_REFERENCE);
  const heat = normalise(drivers.heatIndex, HEAT_REFERENCE_LOW, HEAT_REFERENCE_HIGH);
  const co2 = normalise(drivers.co2, CO2_REFERENCE_LOW, CO2_REFERENCE_HIGH);
  return HAZARD_WEIGHTS.pm25 * pm + HAZARD_WEIGHTS.heat * heat + HAZARD_WEIGHTS.co2 * co2;
}

/**
 * Child-density × school-proximity weighting, normalised to ~0.6-1.4.
 * `densityRank` and `schoolRank` are 0-1 (share of the busiest district).
 * Exposure of children is what CHIP reports, so density lifts the score.
 */
export function childWeight(densityRank: number, schoolRank: number): number {
  const combined = 0.65 * clamp01(densityRank) + 0.35 * clamp01(schoolRank);
  return Number((0.6 + 0.8 * combined).toFixed(3));
}

/**
 * Uncertainty band on the level. Widens as environmental completeness and
 * epidemiological reporting fall — CHIP reports a widening band rather than a
 * confident value where coverage is thin.
 */
export function uncertaintyBand(dataCompleteness: number, reportingCompleteness: number): number {
  const gap = 1 - 0.5 * clamp01(dataCompleteness) - 0.5 * clamp01(reportingCompleteness);
  return Number((0.15 + 1.1 * gap).toFixed(2));
}

export interface RiskInputs {
  drivers: RiskDrivers;
  caseSignal: CaseSignal;
  densityRank: number;
  schoolRank: number;
  dataCompleteness: number;
}

export interface RiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  childWeight: number;
  uncertainty: number;
}

export function computeRisk(inputs: RiskInputs): RiskResult {
  const hazard = hazardScore(inputs.drivers);
  const weight = childWeight(inputs.densityRank, inputs.schoolRank);

  // A small epidemiological nudge: observed child illness raises the score,
  // scaled by how complete the reporting is (incomplete reporting nudges less).
  const caseLoad = clamp01(
    (inputs.caseSignal.respiratoryPer1k + inputs.caseSignal.feverPer1k) / 120,
  );
  const epiNudge = 0.15 * caseLoad * inputs.caseSignal.reportingCompleteness;

  const exposure = clamp01(hazard * weight + epiNudge);
  const riskScore = Math.round(exposure * 100);

  return {
    riskScore,
    riskLevel: scoreToLevel(riskScore),
    childWeight: weight,
    uncertainty: uncertaintyBand(inputs.dataCompleteness, inputs.caseSignal.reportingCompleteness),
  };
}
