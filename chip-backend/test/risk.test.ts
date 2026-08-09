import { describe, it, expect } from 'vitest';
import {
  childWeight,
  computeRisk,
  hazardScore,
  uncertaintyBand,
} from '../src/domain/risk.js';
import { scoreToLevel } from '../src/domain/riskLevels.js';
import type { CaseSignal, RiskDrivers } from '../src/domain/types.js';

const cleanAir: RiskDrivers = { pm25: 5, heatIndex: 26, co2: 500, humidity: 50 };
const badAir: RiskDrivers = { pm25: 90, heatIndex: 44, co2: 1700, humidity: 85 };
const lowCase: CaseSignal = { respiratoryPer1k: 5, feverPer1k: 3, reportingCompleteness: 0.9 };

describe('scoreToLevel', () => {
  it('buckets 0-100 into 0-4', () => {
    expect(scoreToLevel(0)).toBe(0);
    expect(scoreToLevel(19)).toBe(0);
    expect(scoreToLevel(20)).toBe(1);
    expect(scoreToLevel(55)).toBe(2);
    expect(scoreToLevel(79)).toBe(3);
    expect(scoreToLevel(80)).toBe(4);
    expect(scoreToLevel(100)).toBe(4);
  });
});

describe('hazardScore', () => {
  it('is near 0 for clean air and near 1 for hazardous air', () => {
    expect(hazardScore(cleanAir)).toBeLessThan(0.15);
    expect(hazardScore(badAir)).toBeGreaterThan(0.85);
  });
});

describe('childWeight', () => {
  it('lifts the score for dense, school-heavy districts', () => {
    expect(childWeight(0, 0)).toBeCloseTo(0.6, 5);
    expect(childWeight(1, 1)).toBeCloseTo(1.4, 5);
    expect(childWeight(1, 1)).toBeGreaterThan(childWeight(0, 0));
  });
});

describe('uncertaintyBand', () => {
  it('widens as completeness falls', () => {
    const full = uncertaintyBand(1, 1);
    const none = uncertaintyBand(0, 0);
    expect(none).toBeGreaterThan(full);
  });
});

describe('computeRisk', () => {
  it('produces a low level for a clean, sparse district', () => {
    const r = computeRisk({
      drivers: cleanAir,
      caseSignal: lowCase,
      densityRank: 0.1,
      schoolRank: 0.1,
      dataCompleteness: 1,
    });
    expect(r.riskLevel).toBeLessThanOrEqual(1);
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('produces a high level for a hazardous, child-dense district', () => {
    const r = computeRisk({
      drivers: badAir,
      caseSignal: { respiratoryPer1k: 40, feverPer1k: 30, reportingCompleteness: 0.9 },
      densityRank: 1,
      schoolRank: 1,
      dataCompleteness: 1,
    });
    expect(r.riskLevel).toBeGreaterThanOrEqual(3);
  });

  it('child weighting raises the level versus a sparse district with the same hazard', () => {
    const base = {
      drivers: badAir,
      caseSignal: lowCase,
      dataCompleteness: 1,
    };
    const dense = computeRisk({ ...base, densityRank: 1, schoolRank: 1 });
    const sparse = computeRisk({ ...base, densityRank: 0, schoolRank: 0 });
    expect(dense.riskScore).toBeGreaterThan(sparse.riskScore);
  });
});
