import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type Dimension, scoreTier } from "@/lib/types";
import { cn } from "@/lib/utils";

export function KpiCards({ dimensions }: { dimensions: Dimension[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {dimensions.map((d) => {
        const tier = scoreTier(d.score);
        const Trend = d.delta > 0.2 ? ArrowUpRight : d.delta < -0.2 ? ArrowDownRight : Minus;
        const trendColor =
          d.delta > 0.2
            ? "text-emerald-600"
            : d.delta < -0.2
              ? "text-red-600"
              : "text-muted-foreground";

        return (
          <Card key={d.key} size="sm" className="gap-2">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {d.label}
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-heading text-3xl font-semibold tabular-nums">
                      {d.score}
                    </span>
                    <span className={cn("text-xs font-medium", tier.color)}>
                      {tier.label}
                    </span>
                  </div>
                </div>
                <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
                  <Trend className="size-3.5" />
                  <span className="tabular-nums">
                    {d.delta > 0 ? "+" : ""}
                    {d.delta.toFixed(1)}
                  </span>
                </div>
              </div>
              <Progress value={d.score} className="h-1.5" />
              <p className="text-[11px] leading-snug text-muted-foreground">
                {d.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
