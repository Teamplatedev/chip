import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TelemetryPoint } from "@/lib/types";

const W = 720;
const H = 220;
const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

function buildPath(values: number[], min: number, max: number) {
  const n = values.length;
  const w = W - PAD_L - PAD_R;
  const h = H - PAD_T - PAD_B;
  return values
    .map((v, i) => {
      const x = PAD_L + (i / (n - 1)) * w;
      const y = PAD_T + (1 - (v - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildArea(values: number[], min: number, max: number) {
  const path = buildPath(values, min, max);
  const w = W - PAD_L - PAD_R;
  const lastX = PAD_L + w;
  const bottomY = H - PAD_B;
  return `${path} L${lastX},${bottomY} L${PAD_L},${bottomY} Z`;
}

export function TelemetryChart({ points }: { points: TelemetryPoint[] }) {
  const co2 = points.map((p) => p.co2);
  const pm25 = points.map((p) => p.pm25);

  const co2Min = 400;
  const co2Max = Math.max(1600, ...co2);
  const pm25Min = 0;
  const pm25Max = Math.max(80, ...pm25);

  const co2Path = buildPath(co2, co2Min, co2Max);
  const co2Area = buildArea(co2, co2Min, co2Max);
  const pm25Path = buildPath(pm25, pm25Min, pm25Max);

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => PAD_T + f * (H - PAD_T - PAD_B));
  const co2Ticks = [400, 800, 1200, 1600];
  const n = points.length;
  const xTickCount = Math.min(6, n);
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i / (xTickCount - 1)) * (n - 1)),
  );

  const formatTick = (iso?: string) => {
    if (!iso) return "";
    if (!iso.includes("T")) return iso;
    const d = new Date(iso);
    if (n > 100) {
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}h`;
    }
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Anomaly precursor signals · 24h</CardTitle>
            <CardDescription>
              Ensemble model fuses CO₂ and PM2.5 to surface breaches before threshold.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-sky-500" />
              CO₂ ppm
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              PM2.5 µg/m³
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[220px] w-full min-w-[640px]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(14 165 233)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(14 165 233)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {gridYs.map((y, i) => (
              <line
                key={i}
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="3 3"
              />
            ))}

            {co2Ticks.map((tick) => {
              const y =
                PAD_T + (1 - (tick - co2Min) / (co2Max - co2Min)) * (H - PAD_T - PAD_B);
              return (
                <text
                  key={tick}
                  x={PAD_L - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {tick}
                </text>
              );
            })}

            {xTicks.map((i) => {
              const x =
                PAD_L + (i / Math.max(1, n - 1)) * (W - PAD_L - PAD_R);
              return (
                <text
                  key={i}
                  x={x}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatTick(points[i]?.t)}
                </text>
              );
            })}

            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={
                PAD_T + (1 - (1000 - co2Min) / (co2Max - co2Min)) * (H - PAD_T - PAD_B)
              }
              y2={
                PAD_T + (1 - (1000 - co2Min) / (co2Max - co2Min)) * (H - PAD_T - PAD_B)
              }
              stroke="rgb(239 68 68)"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
            />
            <text
              x={W - PAD_R - 4}
              y={
                PAD_T +
                (1 - (1000 - co2Min) / (co2Max - co2Min)) * (H - PAD_T - PAD_B) -
                4
              }
              textAnchor="end"
              className="fill-red-500 text-[10px]"
            >
              CO₂ threshold 1000 ppm
            </text>

            <path d={co2Area} fill="url(#co2grad)" />
            <path
              d={co2Path}
              fill="none"
              stroke="rgb(14 165 233)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pm25Path}
              fill="none"
              stroke="rgb(245 158 11)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
