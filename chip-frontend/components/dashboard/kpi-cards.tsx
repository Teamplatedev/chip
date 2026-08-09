import { Baby, Flame, ShieldAlert, Wind } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  LEVEL_STYLES,
  levelStyle,
  type DistrictRisk,
  type Overview,
  type RiskLevel,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function KpiCards({
  overview,
  districts,
}: {
  overview: Overview;
  districts: DistrictRisk[];
}) {
  const top = levelStyle(overview.highestRiskLevel);
  const childrenElevated = districts
    .filter((d) => d.riskLevel >= 2)
    .reduce((s, d) => s + d.childPopulation, 0);
  const avgPm25 = Math.round(avg(districts.map((d) => d.drivers.pm25)));
  const avgHeat = avg(districts.map((d) => d.drivers.heatIndex)).toFixed(1);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Peak risk level + distribution across 0-4 */}
      <Card size="sm" className="gap-2">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <ShieldAlert className="size-3.5" /> Peak district risk
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-heading text-3xl font-semibold tabular-nums">
                  L{overview.highestRiskLevel}
                </span>
                <span className={cn("text-xs font-medium", top.text)}>
                  {top.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full">
            {([0, 1, 2, 3, 4] as RiskLevel[]).map((lvl) => {
              const n = overview.levelDistribution[lvl] ?? 0;
              return (
                <div
                  key={lvl}
                  className={cn(LEVEL_STYLES[lvl].bar, n === 0 && "opacity-20")}
                  style={{
                    width: `${(n / Math.max(1, overview.districtsCovered)) * 100}%`,
                  }}
                />
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            {overview.highestRiskDistrict} highest of {overview.districtsCovered}{" "}
            districts.
          </p>
        </CardContent>
      </Card>

      <MetricCard
        icon={<Baby className="size-3.5" />}
        label="Children in elevated zones"
        value={childrenElevated.toLocaleString()}
        note="In districts at level 2 or above."
      />
      <MetricCard
        icon={<Wind className="size-3.5" />}
        label="Avg PM2.5"
        value={`${avgPm25}`}
        unit="µg/m³"
        note="Prefecture mean across monitored districts."
      />
      <MetricCard
        icon={<Flame className="size-3.5" />}
        label="Avg heat index"
        value={`${avgHeat}`}
        unit="°C"
        note="Apparent temperature (heat + humidity)."
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <Card size="sm" className="gap-2">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            {icon} {label}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-heading text-3xl font-semibold tabular-nums">
              {value}
            </span>
            {unit && (
              <span className="text-xs text-muted-foreground">{unit}</span>
            )}
          </div>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
