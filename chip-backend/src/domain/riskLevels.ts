/**
 * CHIP publishes a 0-4 child-weighted risk level per district.
 *
 * The scale expresses *exposure of children* rather than hazard alone: a
 * district with moderate pollution but a high density of children and schools
 * can score higher than a more polluted district with few children.
 *
 * Each level maps to a preparedness posture. The full Standard Operating
 * Procedures (agreed with schools and the health department) are a later
 * milestone; the short posture below is the placeholder the SOP engine expands.
 */

export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export interface RiskLevelDef {
  level: RiskLevel;
  label: string;
  /** Tailwind-friendly semantic colour token used across the dashboard. */
  color: string;
  /** One-line preparedness posture — the hook the SOP engine (Phase 4) expands. */
  posture: string;
}

export const RISK_LEVELS: Record<RiskLevel, RiskLevelDef> = {
  0: {
    level: 0,
    label: 'Minimal',
    color: 'emerald',
    posture: 'Normal activity. No restriction.',
  },
  1: {
    level: 1,
    label: 'Low',
    color: 'green',
    posture: 'Monitor vulnerable children; keep windows to ventilation schedule.',
  },
  2: {
    level: 2,
    label: 'Moderate',
    color: 'amber',
    posture: 'Reduce prolonged or strenuous outdoor activity during peak hours.',
  },
  3: {
    level: 3,
    label: 'High',
    color: 'orange',
    posture: 'Move activity indoors, increase ventilation, watch symptomatic children.',
  },
  4: {
    level: 4,
    label: 'Severe',
    color: 'red',
    posture: 'Suspend outdoor activity, shelter indoors, pre-position supplies.',
  },
};

/** Continuous 0-100 exposure score bucketed to a 0-4 level. */
export function scoreToLevel(score: number): RiskLevel {
  if (score < 20) return 0;
  if (score < 40) return 1;
  if (score < 60) return 2;
  if (score < 80) return 3;
  return 4;
}

export function levelDef(level: RiskLevel): RiskLevelDef {
  return RISK_LEVELS[level];
}
