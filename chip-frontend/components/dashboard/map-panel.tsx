"use client";

import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VIENTIANE_CENTER, type HeatmapPoint, type SensorUnit } from "@/lib/types";

const GRADIENT = [
  "rgba(16, 185, 129, 0)",
  "rgba(16, 185, 129, 0.6)",
  "rgba(245, 158, 11, 0.7)",
  "rgba(249, 115, 22, 0.85)",
  "rgba(239, 68, 68, 0.95)",
  "rgba(190, 18, 60, 1)",
];

function Heatmap({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();
  const visualization = useMapsLibrary("visualization") as
    | (typeof google.maps.visualization | null)
    | null;

  useEffect(() => {
    if (!map || !visualization) return;

    const layer = new visualization.HeatmapLayer({
      data: points.map((p) => ({
        location: new google.maps.LatLng(p.lat, p.lng),
        weight: p.weight,
      })),
      radius: 38,
      opacity: 0.75,
      gradient: GRADIENT,
    });
    layer.setMap(map);

    return () => {
      layer.setMap(null);
    };
  }, [map, visualization, points]);

  return null;
}

function UnitMarkers({ units }: { units: SensorUnit[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const markers = units
      .filter((u) => u.status !== "offline")
      .map((u) => {
        const color =
          u.composite >= 85
            ? "#10b981"
            : u.composite >= 70
              ? "#f59e0b"
              : u.composite >= 55
                ? "#f97316"
                : "#ef4444";
        return new google.maps.Marker({
          position: { lat: u.lat, lng: u.lng },
          map,
          title: `${u.name} · ${u.composite}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      });
    return () => markers.forEach((m) => m.setMap(null));
  }, [map, units]);

  return null;
}

function MissingKeyFallback({ units }: { units: SensorUnit[] }) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-md border border-dashed border-border bg-muted/30">
      <svg viewBox="0 0 600 420" className="h-full w-full">
        <defs>
          <radialGradient id="riskGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.55)" />
            <stop offset="60%" stopColor="rgba(245, 158, 11, 0.25)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.06"
            />
          </pattern>
        </defs>
        <rect width="600" height="420" fill="url(#grid)" />
        <circle cx="430" cy="280" r="140" fill="url(#riskGrad)" />
        <circle cx="180" cy="180" r="110" fill="url(#riskGrad)" opacity="0.7" />
        <circle cx="320" cy="210" r="80" fill="url(#riskGrad)" opacity="0.5" />
        {units
          .filter((u) => u.status !== "offline")
          .map((u, i) => {
            const x = 80 + ((u.lng - 102.55) / 0.18) * 480;
            const y = 380 - ((u.lat - 17.9) / 0.12) * 340;
            const color =
              u.composite >= 85
                ? "#10b981"
                : u.composite >= 70
                  ? "#f59e0b"
                  : u.composite >= 55
                    ? "#f97316"
                    : "#ef4444";
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />
              </g>
            );
          })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-medium">
          <MapPin className="size-3.5 text-muted-foreground" />
          Google Maps key not configured
        </div>
        <p className="text-[11px] text-muted-foreground">
          Add{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            .env.local
          </code>{" "}
          to render the live Vientiane heatmap. Schematic preview shown.
        </p>
      </div>
    </div>
  );
}

export function MapPanel({
  units,
  heatmap,
}: {
  units: SensorUnit[];
  heatmap: HeatmapPoint[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>District risk heatmap</CardTitle>
            <CardDescription>
              Vientiane prefecture · weighted by composite risk score and child density.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Low
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              Watch
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-red-500" />
              High
            </div>
            <Badge variant="outline" className="text-[10px]">
              {heatmap.length} weighted points
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {apiKey ? (
          <APIProvider apiKey={apiKey} libraries={["visualization"]}>
            <div className="h-[420px] w-full overflow-hidden rounded-md">
              <Map
                defaultCenter={VIENTIANE_CENTER}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="chip-vientiane"
                className="h-full w-full"
              >
                <Heatmap points={heatmap} />
                <UnitMarkers units={units} />
              </Map>
            </div>
          </APIProvider>
        ) : (
          <MissingKeyFallback units={units} />
        )}
      </CardContent>
    </Card>
  );
}
