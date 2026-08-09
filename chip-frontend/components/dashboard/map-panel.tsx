"use client";

// NOTE: Phase 2 migrates this panel from Google Maps to MapLibre GL with an
// open vector tile pipeline (mandatory for the open-source obligation). For
// Phase 1 the existing Google renderer is retained but recoloured to the 0-4
// child-weighted risk model and fed the monitoring-network sites.
//
// Google removed the Heatmap Layer in Maps JS API v3.65, so district risk is
// drawn as translucent level-coloured circles instead — a cleaner choropleth
// stand-in until the MapLibre migration.

import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  levelStyle,
  siteLevel,
  VIENTIANE_CENTER,
  type DistrictRisk,
  type MonitoringSite,
} from "@/lib/types";

function DistrictCircles({ districts }: { districts: DistrictRisk[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const circles = districts.map((d) => {
      const color = levelStyle(d.riskLevel).hex;
      return new google.maps.Circle({
        map,
        center: { lat: d.centerLat, lng: d.centerLng },
        // Radius grows with risk level so higher-risk districts read stronger.
        radius: 1400 + d.riskLevel * 650,
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.28,
      });
    });
    return () => circles.forEach((c) => c.setMap(null));
  }, [map, districts]);

  return null;
}

function SiteMarkers({ sites }: { sites: MonitoringSite[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const markers = sites
      .filter((s) => s.status !== "offline")
      .map((s) => {
        const color = levelStyle(siteLevel(s.reading.pm25)).hex;
        return new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng },
          map,
          title: `${s.name} · PM2.5 ${s.reading.pm25} µg/m³`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
          },
        });
      });
    return () => markers.forEach((m) => m.setMap(null));
  }, [map, sites]);

  return null;
}

function MissingKeyFallback({
  districts,
  sites,
}: {
  districts: DistrictRisk[];
  sites: MonitoringSite[];
}) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-md border border-dashed border-border bg-muted/30">
      <svg viewBox="0 0 600 420" className="h-full w-full">
        <defs>
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
        {districts.map((d, i) => {
          const x = 80 + ((d.centerLng - 102.55) / 0.18) * 480;
          const y = 380 - ((d.centerLat - 17.9) / 0.12) * 340;
          const color = levelStyle(d.riskLevel).hex;
          return (
            <circle
              key={`d-${i}`}
              cx={x}
              cy={y}
              r={26 + d.riskLevel * 10}
              fill={color}
              fillOpacity={0.22}
              stroke={color}
              strokeOpacity={0.5}
            />
          );
        })}
        {sites
          .filter((s) => s.status !== "offline")
          .map((s, i) => {
            const x = 80 + ((s.lng - 102.55) / 0.18) * 480;
            const y = 380 - ((s.lat - 17.9) / 0.12) * 340;
            const color = levelStyle(siteLevel(s.reading.pm25)).hex;
            return (
              <circle key={`s-${i}`} cx={x} cy={y} r="4" fill={color} stroke="white" strokeWidth="1.5" />
            );
          })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-medium">
          <MapPin className="size-3.5 text-muted-foreground" />
          Map key not configured
        </div>
        <p className="text-[11px] text-muted-foreground">
          Add{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          to render the live Vientiane map. Schematic preview shown. (MapLibre GL
          migration is Phase 2.)
        </p>
      </div>
    </div>
  );
}

export function MapPanel({
  districts,
  sites,
}: {
  districts: DistrictRisk[];
  sites: MonitoringSite[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>District risk map</CardTitle>
            <CardDescription>
              Vientiane prefecture · child-weighted exposure and monitoring sites.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              L0–1
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              L2
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-red-600" />
              L3–4
            </div>
            <Badge variant="outline" className="text-[10px]">
              {sites.length} sites
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <div className="h-[420px] w-full overflow-hidden rounded-md">
              <Map
                defaultCenter={VIENTIANE_CENTER}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="chip-vientiane"
                className="h-full w-full"
              >
                <DistrictCircles districts={districts} />
                <SiteMarkers sites={sites} />
              </Map>
            </div>
          </APIProvider>
        ) : (
          <MissingKeyFallback districts={districts} sites={sites} />
        )}
      </CardContent>
    </Card>
  );
}
