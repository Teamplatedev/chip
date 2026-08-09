import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { levelStyle, type DistrictRisk } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DistrictRiskPanel({ districts }: { districts: DistrictRisk[] }) {
  const sorted = [...districts].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Child-weighted risk index · 0–4</CardTitle>
        <CardDescription>
          Exposure of children, not hazard alone. Bar shows the underlying score;
          shaded span is the uncertainty band.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {sorted.map((d) => {
            const style = levelStyle(d.riskLevel);
            // Uncertainty band expressed on the 0-100 score axis (±0.5 level ≈ 10 pts/level).
            const bandPts = Math.min(100, d.uncertainty * 20);
            const lo = Math.max(0, d.riskScore - bandPts);
            const width = Math.min(100, bandPts * 2);
            return (
              <li key={d.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        style.badge,
                      )}
                    >
                      L{d.riskLevel}
                    </span>
                    <span className="font-medium">{d.district}</span>
                    <span className={cn("text-[11px]", style.text)}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground tabular-nums">
                    <span>{d.childPopulation.toLocaleString()} children</span>
                    <span>·</span>
                    <span className="text-foreground">
                      {d.riskScore}
                      <span className="text-muted-foreground"> ±{d.uncertainty.toFixed(1)}</span>
                    </span>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  {/* uncertainty band */}
                  <div
                    className="absolute inset-y-0 rounded-full bg-foreground/10"
                    style={{ left: `${lo}%`, width: `${width}%` }}
                  />
                  {/* score fill */}
                  <div
                    className={cn("absolute inset-y-0 left-0 rounded-full", style.bar)}
                    style={{ width: `${d.riskScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{style.posture}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
