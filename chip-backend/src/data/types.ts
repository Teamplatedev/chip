export type DimensionKey = 'air' | 'safety' | 'hygiene' | 'efficiency';

export interface Dimension {
  key: DimensionKey;
  label: string;
  score: number;
  delta: number;
  description: string;
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type UnitStatus = 'online' | 'buffering' | 'offline';
export type Facility = 'school' | 'childcare' | 'clinic' | 'shelter';

export interface SensorReading {
  temperature: number;
  humidity: number;
  co2: number;
  pm25: number;
  smoke: number;
  current: number;
  intrusion: boolean;
}

export interface SensorUnit {
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
}

export interface Anomaly {
  id: string;
  unitId: string;
  unitName: string;
  district: string;
  signal: string;
  message: string;
  severity: Severity;
  detectedAt: string;
}

export interface DistrictRisk {
  district: string;
  centerLat: number;
  centerLng: number;
  childPopulation: number;
  riskIndex: number;
  unitCount: number;
}

export interface TelemetryPoint {
  t: string;
  co2: number;
  pm25: number;
  temperature: number;
  humidity: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface Overview {
  generatedAt: string;
  onlineCount: number;
  totalCount: number;
  childrenCovered: number;
  dimensions: Dimension[];
  anomaliesActive: number;
  highestRiskDistrict: string;
}
