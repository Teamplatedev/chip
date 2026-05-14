import { AlertCircle } from "lucide-react";

import { AnomalyFeed } from "@/components/dashboard/anomaly-feed";
import { DashboardHeader } from "@/components/dashboard/header";
import { DistrictRiskPanel } from "@/components/dashboard/district-risk";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MapPanel } from "@/components/dashboard/map-panel";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { UnitList } from "@/components/dashboard/unit-list";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  let data;
  try {
    const [overview, units, anomalies, districts, heatmap, telemetry] =
      await Promise.all([
        api.overview(),
        api.units(),
        api.anomalies(30),
        api.districts(),
        api.heatmap(),
        api.telemetryAggregate("24h"),
      ]);
    data = { overview, units, anomalies, districts, heatmap, telemetry };
  } catch (err) {
    return <BackendDown error={err instanceof Error ? err.message : String(err)} />;
  }

  const { overview, units, anomalies, districts, heatmap, telemetry } = data;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <DashboardHeader
        onlineCount={overview.onlineCount}
        totalCount={overview.totalCount}
        childrenCovered={overview.childrenCovered}
      />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <KpiCards dimensions={overview.dimensions} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            <MapPanel units={units} heatmap={heatmap} />
            <TelemetryChart points={telemetry} />
          </div>
          <div className="flex flex-col gap-4">
            <AnomalyFeed anomalies={anomalies} />
            <DistrictRiskPanel districts={districts} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <UnitList units={units} />
        </div>

        <footer className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            CHIP prototype · {overview.totalCount} sensor units ·{" "}
            {anomalies.length} active anomalies
          </span>
          <span>
            Last sync{" "}
            {new Date(overview.generatedAt).toLocaleString("en-GB", {
              timeZone: "Asia/Vientiane",
              hour12: false,
            })}{" "}
            ICT
          </span>
        </footer>
      </main>
    </div>
  );
}

function BackendDown({ error }: { error: string }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-sm shadow-sm">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <AlertCircle className="size-4 text-red-500" />
          Backend unreachable
        </div>
        <p className="text-muted-foreground">
          Start the API with{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            cd chip-backend && npm run start:dev
          </code>{" "}
          then refresh.
        </p>
        <pre className="mt-3 overflow-auto rounded bg-muted px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
          {error}
        </pre>
      </div>
    </div>
  );
}
