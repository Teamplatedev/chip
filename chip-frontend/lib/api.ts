import type {
  Anomaly,
  DistrictRisk,
  HeatmapPoint,
  Overview,
  SensorUnit,
  TelemetryPoint,
} from "./types";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001/api";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  overview: () => get<Overview>("/overview"),
  units: () => get<SensorUnit[]>("/units"),
  unit: (id: string) => get<SensorUnit>(`/units/${encodeURIComponent(id)}`),
  anomalies: (limit = 30) => get<Anomaly[]>(`/anomalies?limit=${limit}`),
  districts: () => get<DistrictRisk[]>("/districts"),
  heatmap: () => get<HeatmapPoint[]>("/districts/heatmap"),
  telemetry: (unitId: string, range: "24h" | "7d" = "24h") =>
    get<TelemetryPoint[]>(
      `/telemetry/${encodeURIComponent(unitId)}?range=${range}`,
    ),
  telemetryAggregate: (range: "24h" | "7d" = "24h") =>
    get<TelemetryPoint[]>(`/telemetry/aggregate?range=${range}`),
};
