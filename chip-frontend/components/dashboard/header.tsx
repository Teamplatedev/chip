import { Activity, MapPin, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function DashboardHeader({
  onlineCount,
  totalCount,
  childrenCovered,
}: {
  onlineCount: number;
  totalCount: number;
  childrenCovered: number;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="size-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base font-semibold tracking-tight">
              CHIP · Risk Operations
            </span>
            <Badge variant="outline" className="text-[10px]">
              beta
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Child-weighted environmental risk index · Vientiane, Lao PDR
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          <span>17.9757° N, 102.6331° E</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-1.5">
          <Radio className="size-3.5 text-emerald-500" />
          <span>
            {onlineCount}/{totalCount} units online
          </span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div>{childrenCovered.toLocaleString()} children covered</div>
        <Button size="sm" variant="outline" className="ml-2">
          Export brief
        </Button>
      </div>
    </header>
  );
}
