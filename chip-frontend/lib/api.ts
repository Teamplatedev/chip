import type {
  Anomaly,
  DistrictRisk,
  HeatmapPoint,
  MonitoringSite,
  Overview,
  SourceStatus,
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
  districts: () => get<DistrictRisk[]>("/districts"),
  district: (id: string) =>
    get<DistrictRisk>(`/districts/${encodeURIComponent(id)}`),
  heatmap: () => get<HeatmapPoint[]>("/districts/heatmap"),
  sites: () => get<MonitoringSite[]>("/sites"),
  anomalies: (limit = 30) => get<Anomaly[]>(`/anomalies?limit=${limit}`),
  sources: () => get<SourceStatus[]>("/sources"),
  telemetryAggregate: (range: "24h" | "7d" = "24h") =>
    get<TelemetryPoint[]>(`/telemetry/aggregate?range=${range}`),
};
