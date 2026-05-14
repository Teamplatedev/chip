import { Building2, GraduationCap, HeartPulse, Home, Wifi, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type SensorUnit, scoreTier } from "@/lib/types";
import { cn } from "@/lib/utils";

const facilityIcon = {
  school: GraduationCap,
  childcare: Home,
  clinic: HeartPulse,
  shelter: Building2,
};

function StatusDot({ status }: { status: SensorUnit["status"] }) {
  if (status === "offline") {
    return <WifiOff className="size-3.5 text-muted-foreground" />;
  }
  return (
    <Wifi
      className={cn(
        "size-3.5",
        status === "online" ? "text-emerald-500" : "text-amber-500",
      )}
    />
  );
}

export function UnitList({ units }: { units: SensorUnit[] }) {
  const sorted = [...units].sort((a, b) => {
    if (a.status === "offline" && b.status !== "offline") return 1;
    if (b.status === "offline" && a.status !== "offline") return -1;
    return a.composite - b.composite;
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Sensor units</CardTitle>
            <CardDescription>
              Ranked by composite risk · lower score = higher priority.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {units.length} units
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[380px]">
          <ul className="divide-y divide-border/60">
            {sorted.map((u) => {
              const Icon = facilityIcon[u.facility];
              const tier = scoreTier(u.composite);
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{u.name}</span>
                      <StatusDot status={u.status} />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">{u.id}</span>
                      <span>·</span>
                      <span>{u.district}</span>
                      <span>·</span>
                      <span>{u.childCount} children</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-lg font-semibold tabular-nums">
                        {u.status === "offline" ? "—" : u.composite}
                      </span>
                      <span className={cn("text-[11px] font-medium", tier.color)}>
                        {tier.label}
                      </span>
                    </div>
                    {u.status !== "offline" && (
                      <div className="flex gap-1 text-[10px] text-muted-foreground tabular-nums">
                        <span>CO₂ {u.reading.co2}</span>
                        <span>·</span>
                        <span>PM {u.reading.pm25}</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
