// CHIP domain model — mirrors chip-backend/src/domain.
// The 0-4 child-weighted district risk index is the primary published entity.

export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export type RiskDrivers = {
  pm25: number;
  heatIndex: number;
  co2: number;
  humidity: number;
};

export type CaseSignal = {
  respiratoryPer1k: number;
  feverPer1k: number;
  reportingCompleteness: number;
};

export type DistrictRisk = {
  id: string;
  district: string;
  centerLat: number;
  centerLng: number;
  childPopulation: number;
  schoolCount: number;
  riskLevel: RiskLevel;
  riskScore: number;
  uncertainty: number;
  drivers: RiskDrivers;
  caseSignal: CaseSignal;
  childWeight: number;
  monitorCount: number;
  dataCompleteness: number;
  updatedAt: string;
};

export type SiteStatus = "online" | "buffering" | "offline";

export type MonitoringSite = {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  status: SiteStatus;
  source: string;
  reading: { pm25: number; temperature: number; humidity: number; co2: number };
  updatedAt: string;
};

export type TelemetryPoint = {
  t: string;
  co2: number;
  pm25: number;
  temperature: number;
  humidity: number;
};

export type HeatmapPoint = { lat: number; lng: number; weight: number };

export type Anomaly = {
  id: string;
  district: string;
  signal: string;
  message: string;
  level: RiskLevel;
  metric: "pm25" | "heatIndex" | "co2" | "humidity";
  sigma: number;
  detectedAt: string;
};

export type SourceStatus = {
  key: string;
  label: string;
  state: "live" | "synthetic" | "planned";
  completeness: number;
  note: string;
};

export type Overview = {
  generatedAt: string;
  districtsCovered: number;
  childrenCovered: number;
  highestRiskDistrict: string;
  highestRiskLevel: RiskLevel;
  levelDistribution: Record<RiskLevel, number>;
  monitorsOnline: number;
  monitorsTotal: number;
  dataCompleteness: number;
  anomaliesActive: number;
};

export const VIENTIANE_CENTER = { lat: 17.9757, lng: 102.6331 };

// --- 0-4 level presentation -------------------------------------------------

export type LevelStyle = {
  label: string;
  /** short preparedness posture */
  posture: string;
  /** badge classes */
  badge: string;
  /** solid bar / marker colour */
  bar: string;
  /** hex for map markers */
  hex: string;
  /** text colour */
  text: string;
};

export const LEVEL_STYLES: Record<RiskLevel, LevelStyle> = {
  0: {
    label: "Minimal",
    posture: "Normal activity. No restriction.",
    badge: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30",
    bar: "bg-emerald-500",
    hex: "#10b981",
    text: "text-emerald-600",
  },
  1: {
    label: "Low",
    posture: "Monitor vulnerable children; keep to ventilation schedule.",
    badge: "bg-lime-500/15 text-lime-700 ring-1 ring-lime-500/30",
    bar: "bg-lime-500",
    hex: "#84cc16",
    text: "text-lime-600",
  },
  2: {
    label: "Moderate",
    posture: "Reduce prolonged or strenuous outdoor activity at peak hours.",
    badge: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30",
    bar: "bg-amber-500",
    hex: "#f59e0b",
    text: "text-amber-600",
  },
  3: {
    label: "High",
    posture: "Move activity indoors, increase ventilation, watch symptoms.",
    badge: "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/30",
    bar: "bg-orange-500",
    hex: "#f97316",
    text: "text-orange-600",
  },
  4: {
    label: "Severe",
    posture: "Suspend outdoor activity, shelter indoors, pre-position supplies.",
    badge: "bg-red-600 text-white ring-1 ring-red-700/40",
    bar: "bg-red-600",
    hex: "#dc2626",
    text: "text-red-600",
  },
};

export function levelStyle(level: RiskLevel): LevelStyle {
  return LEVEL_STYLES[level];
}

export function siteLevel(pm25: number): RiskLevel {
  // Coarse per-site level for map markers, from PM2.5 alone.
  if (pm25 <= 0) return 0;
  if (pm25 < 12) return 1;
  if (pm25 < 25) return 2;
  if (pm25 < 45) return 3;
  return 4;
}

export function timeAgo(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${h}h ${m}m ago`;
  const days = Math.floor(h / 24);
  return `${days}d ${h % 24}h ago`;
}
