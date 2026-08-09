import { Radio, Wifi, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { levelStyle, siteLevel, type MonitoringSite } from "@/lib/types";
import { cn } from "@/lib/utils";

function StatusDot({ status }: { status: MonitoringSite["status"] }) {
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

export function MonitoringNetwork({ sites }: { sites: MonitoringSite[] }) {
  const sorted = [...sites].sort((a, b) => {
    if (a.status === "offline" && b.status !== "offline") return 1;
    if (b.status === "offline" && a.status !== "offline") return -1;
    return b.reading.pm25 - a.reading.pm25;
  });

  const online = sites.filter((s) => s.status !== "offline").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Monitoring network</CardTitle>
            <CardDescription>
              National school climate network via AirGradient · ranked by PM2.5.
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
            <Radio className="size-3" />
            {online}/{sites.length} reporting
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[380px]">
          <ul className="divide-y divide-border/60">
            {sorted.map((s) => {
              const offline = s.status === "offline";
              const style = levelStyle(siteLevel(s.reading.pm25));
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      offline ? "bg-muted" : style.bar,
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{s.name}</span>
                      <StatusDot status={s.status} />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">{s.id}</span>
                      <span>·</span>
                      <span>{s.district}</span>
                      <span>·</span>
                      <span>{s.source}</span>
                    </div>
                  </div>
                  {!offline && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading text-lg font-semibold tabular-nums">
                          {s.reading.pm25}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          µg/m³
                        </span>
                      </div>
                      <div className="flex gap-1 text-[10px] text-muted-foreground tabular-nums">
                        <span>{s.reading.temperature}°C</span>
                        <span>·</span>
                        <span>{s.reading.humidity}% RH</span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
