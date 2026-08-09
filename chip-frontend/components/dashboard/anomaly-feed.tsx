import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { levelStyle, timeAgo, type Anomaly } from "@/lib/types";
import { cn } from "@/lib/utils";

const METRIC_LABEL: Record<Anomaly["metric"], string> = {
  pm25: "PM2.5",
  heatIndex: "Heat",
  co2: "CO₂",
  humidity: "Humidity",
};

export function AnomalyFeed({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              District deviations
            </CardTitle>
            <CardDescription>
              Time-series deviation from each district&apos;s own baseline — not a
              fixed threshold.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {anomalies.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[380px]">
          {anomalies.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground">
              No active deviations — all districts within their seasonal baseline.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {anomalies.map((a) => {
                const style = levelStyle(a.level);
                return (
                  <li key={a.id} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            style.badge,
                          )}
                        >
                          L{a.level}
                        </span>
                        <span className="text-xs font-medium">{a.signal}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(a.detectedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80">{a.message}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{a.district}</span>
                      <span>·</span>
                      <span>{METRIC_LABEL[a.metric]}</span>
                      <span>·</span>
                      <span className="tabular-nums">{a.sigma.toFixed(1)}σ</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
