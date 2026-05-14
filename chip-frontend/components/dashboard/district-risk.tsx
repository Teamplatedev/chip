import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistrictRisk as DistrictRiskType } from "@/lib/types";

function riskColor(risk: number) {
  if (risk >= 70) return "bg-red-500";
  if (risk >= 50) return "bg-orange-500";
  if (risk >= 35) return "bg-amber-500";
  return "bg-emerald-500";
}

export function DistrictRiskPanel({ districts }: { districts: DistrictRiskType[] }) {
  const sorted = [...districts].sort((a, b) => b.riskIndex - a.riskIndex);
  const max = Math.max(...sorted.map((d) => d.riskIndex), 100);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Child-weighted risk index</CardTitle>
        <CardDescription>
          District risk × child density. Demographic weighting layer planned Q1 2027.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {sorted.map((d) => (
            <li key={d.district} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{d.district}</span>
                <div className="flex items-center gap-2 text-muted-foreground tabular-nums">
                  <span>{d.childPopulation.toLocaleString()} children</span>
                  <span>·</span>
                  <span className="font-semibold text-foreground">
                    {d.riskIndex}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${riskColor(d.riskIndex)}`}
                  style={{ width: `${(d.riskIndex / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
