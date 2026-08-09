import { AlertCircle } from "lucide-react";

import { AnomalyFeed } from "@/components/dashboard/anomaly-feed";
import { DashboardHeader } from "@/components/dashboard/header";
import { DistrictRiskPanel } from "@/components/dashboard/district-risk";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MapPanel } from "@/components/dashboard/map-panel";
import { MonitoringNetwork } from "@/components/dashboard/monitoring-network";
import { SourceStatusPanel } from "@/components/dashboard/source-status";
import { TelemetryChart } from "@/components/dashboard/telemetry-chart";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  let data;
  try {
    const [overview, districts, sites, anomalies, telemetry, sources] =
      await Promise.all([
        api.overview(),
        api.districts(),
        api.sites(),
        api.anomalies(30),
        api.telemetryAggregate("24h"),
        api.sources(),
      ]);
    data = { overview, districts, sites, anomalies, telemetry, sources };
  } catch (err) {
    return <BackendDown error={err instanceof Error ? err.message : String(err)} />;
  }

  const { overview, districts, sites, anomalies, telemetry, sources } = data;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      <DashboardHeader overview={overview} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <KpiCards overview={overview} districts={districts} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            <MapPanel districts={districts} sites={sites} />
            <TelemetryChart points={telemetry} />
          </div>
          <div className="flex flex-col gap-4">
            <DistrictRiskPanel districts={districts} />
            <AnomalyFeed anomalies={anomalies} />
            <SourceStatusPanel sources={sources} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <MonitoringNetwork sites={sites} />
        </div>

        <footer className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            CHIP prototype · {overview.districtsCovered} districts ·{" "}
            {overview.monitorsTotal} monitoring sites · {anomalies.length} active
            deviations
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
            cd chip-backend && npm run dev
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
