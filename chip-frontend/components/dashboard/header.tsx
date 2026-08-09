import { Radio, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { levelStyle, type Overview } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardHeader({ overview }: { overview: Overview }) {
  const top = levelStyle(overview.highestRiskLevel);

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldAlert className="size-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-semibold tracking-tight">
              CHIP · Child-Health Intelligence
            </span>
            <Badge variant="outline" className="text-[10px]">
              beta
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Daily 0–4 child-weighted risk index · Vientiane, Lao PDR
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              top.badge,
            )}
          >
            L{overview.highestRiskLevel} {top.label}
          </span>
          <span>peak · {overview.highestRiskDistrict}</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-1.5">
          <Radio className="size-3.5 text-emerald-500" />
          <span>
            {overview.monitorsOnline}/{overview.monitorsTotal} monitors
          </span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div>{overview.childrenCovered.toLocaleString()} children covered</div>
        <Separator orientation="vertical" className="h-4" />
        <div>{Math.round(overview.dataCompleteness * 100)}% data complete</div>
        <Button size="sm" variant="outline" className="ml-2">
          Export brief
        </Button>
      </div>
    </header>
  );
}
