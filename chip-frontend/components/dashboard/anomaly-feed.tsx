import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Anomaly, severityColor, timeAgo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AnomalyFeed({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Anomaly feed
            </CardTitle>
            <CardDescription>
              Precursor detections from the ensemble time-series model.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {anomalies.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[380px]">
          <ul className="divide-y divide-border/60">
            {anomalies.map((a) => (
              <li key={a.id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        severityColor(a.severity),
                      )}
                    >
                      {a.severity}
                    </span>
                    <span className="text-xs font-medium">{a.signal}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(a.detectedAt)}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{a.message}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{a.unitName}</span>
                  <span>·</span>
                  <span>{a.district}</span>
                  <span>·</span>
                  <span className="tabular-nums">{a.id}</span>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
