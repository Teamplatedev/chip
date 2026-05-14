export type DimensionKey = "air" | "safety" | "hygiene" | "efficiency";

export type Dimension = {
  key: DimensionKey;
  label: string;
  score: number;
  delta: number;
  description: string;
};

export type Severity = "low" | "medium" | "high" | "critical";

export type SensorReading = {
  temperature: number;
  humidity: number;
  co2: number;
  pm25: number;
  smoke: number;
  current: number;
  intrusion: boolean;
};

export type UnitStatus = "online" | "buffering" | "offline";
export type Facility = "school" | "childcare" | "clinic" | "shelter";

export type SensorUnit = {
  id: string;
  name: string;
  facility: Facility;
  district: string;
  lat: number;
  lng: number;
  status: UnitStatus;
  childCount: number;
  composite: number;
  reading: SensorReading;
  dimensions: Record<DimensionKey, number>;
};

export type Anomaly = {
  id: string;
  unitId: string;
  unitName: string;
  district: string;
  signal: string;
  message: string;
  severity: Severity;
  detectedAt: string;
};

export type DistrictRisk = {
  district: string;
  centerLat: number;
  centerLng: number;
  childPopulation: number;
  riskIndex: number;
  unitCount: number;
};

export type TelemetryPoint = {
  t: string;
  co2: number;
  pm25: number;
  temperature: number;
  humidity?: number;
};

export type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
};

export type Overview = {
  generatedAt: string;
  onlineCount: number;
  totalCount: number;
  childrenCovered: number;
  dimensions: Dimension[];
  anomaliesActive: number;
  highestRiskDistrict: string;
};

export const VIENTIANE_CENTER = { lat: 17.9757, lng: 102.6331 };

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "bg-red-600 text-white";
    case "high":
      return "bg-red-500/15 text-red-600 ring-1 ring-red-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30";
    case "low":
      return "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30";
  }
}

export function scoreTier(score: number): {
  label: string;
  color: string;
  bar: string;
} {
  if (score === 0)
    return {
      label: "Offline",
      color: "text-muted-foreground",
      bar: "bg-muted",
    };
  if (score >= 85)
    return { label: "Healthy", color: "text-emerald-600", bar: "bg-emerald-500" };
  if (score >= 70)
    return { label: "Watch", color: "text-amber-600", bar: "bg-amber-500" };
  if (score >= 55)
    return { label: "Elevated", color: "text-orange-600", bar: "bg-orange-500" };
  return { label: "At risk", color: "text-red-600", bar: "bg-red-500" };
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
