import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SourceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_STYLE: Record<SourceStatus["state"], { label: string; dot: string; text: string }> = {
  live: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-600" },
  synthetic: { label: "Synthetic", dot: "bg-amber-500", text: "text-amber-600" },
  planned: { label: "Planned", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

export function SourceStatusPanel({ sources }: { sources: SourceStatus[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Data sources</CardTitle>
        <CardDescription>
          What feeds the index today, and what is still to come.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {sources.map((s) => {
            const st = STATE_STYLE[s.state];
            return (
              <li key={s.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <span className={cn("size-2 rounded-full", st.dot)} />
                    {s.label}
                  </span>
                  <span className={cn("text-[11px] font-medium tabular-nums", st.text)}>
                    {st.label}
                    {s.state !== "planned" && ` · ${Math.round(s.completeness * 100)}%`}
                  </span>
                </div>
                <p className="pl-4 text-[11px] leading-snug text-muted-foreground">
                  {s.note}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
