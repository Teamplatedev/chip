import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Anomaly,
  Dimension,
  DistrictRisk,
  Facility,
  HeatmapPoint,
  Overview,
  SensorReading,
  SensorUnit,
  Severity,
  TelemetryPoint,
  UnitStatus,
} from './types';

const VIENTIANE_CENTER = { lat: 17.9757, lng: 102.6331 };

interface DistrictSeed {
  name: string;
  center: { lat: number; lng: number };
  spread: number;
  baseRisk: number;
  childPopulation: number;
}

const DISTRICT_SEEDS: DistrictSeed[] = [
  { name: 'Chanthabouly', center: { lat: 17.9676, lng: 102.6072 }, spread: 0.018, baseRisk: 38, childPopulation: 24800 },
  { name: 'Sikhottabong', center: { lat: 17.9701, lng: 102.5825 }, spread: 0.020, baseRisk: 67, childPopulation: 31200 },
  { name: 'Xaysetha', center: { lat: 17.9912, lng: 102.6494 }, spread: 0.024, baseRisk: 24, childPopulation: 28400 },
  { name: 'Sisattanak', center: { lat: 17.9501, lng: 102.6225 }, spread: 0.018, baseRisk: 41, childPopulation: 22100 },
  { name: 'Hadxaifong', center: { lat: 17.9214, lng: 102.6911 }, spread: 0.026, baseRisk: 78, childPopulation: 18900 },
  { name: 'Naxaithong', center: { lat: 18.0421, lng: 102.5128 }, spread: 0.030, baseRisk: 52, childPopulation: 14600 },
  { name: 'Sangthong', center: { lat: 18.0958, lng: 102.2541 }, spread: 0.035, baseRisk: 71, childPopulation: 9800 },
  { name: 'Pak Ngum', center: { lat: 17.7841, lng: 102.8915 }, spread: 0.040, baseRisk: 84, childPopulation: 11200 },
];

const FACILITY_PREFIXES: Record<Facility, string[]> = {
  school: ['Primary', 'Secondary', 'School Annex', 'Lycée'],
  childcare: ['Childcare', 'Pre-school', 'Kindergarten', 'Care Center'],
  clinic: ['Health Post', 'Pediatric Wing', 'Community Clinic', 'MCH Clinic'],
  shelter: ['Shelter', 'Family Center', 'Refuge', 'Transit House'],
};

const PLACE_NAMES = [
  'Ban Phonsavanh', 'Ban Naxay', 'Ban Sokpaluang', 'Ban Phonpapao', 'Ban Sisavath',
  'Ban Dongdok', 'Ban Saphanthong', 'Ban Nongbone', 'That Luang', 'Patuxai',
  'Mahosot', 'Thadeua', 'Sibounheuang', 'Vatchan', 'Phonkheng',
  'Nonghai', 'Khok Saath', 'Dongnasok', 'Nongniew', 'Phonthong',
  'Houaykhot', 'Sokpaluang', 'Saylom', 'Ban Khoua', 'Ban Donnoun',
  'Ban Nongtha', 'Ban Phaxai', 'Houayhong', 'Naxai Tai', 'Phonsi',
];

class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  bool(p = 0.5): boolean {
    return this.next() < p;
  }
}

const DIM_BASE: Dimension[] = [
  { key: 'air', label: 'Air Quality', score: 0, delta: 0, description: 'CO₂ + PM2.5 fused index, weighted by occupancy density.' },
  { key: 'safety', label: 'Safety', score: 0, delta: 0, description: 'Smoke, intrusion, and overcurrent precursor signals.' },
  { key: 'hygiene', label: 'Hygiene', score: 0, delta: 0, description: 'Humidity load + mold-risk band over 24h rolling window.' },
  { key: 'efficiency', label: 'Efficiency', score: 0, delta: 0, description: 'Thermal stability and power draw vs. baseline.' },
];

@Injectable()
export class MockService implements OnModuleInit {
  private readonly logger = new Logger(MockService.name);

  private units: SensorUnit[] = [];
  private districts: DistrictRisk[] = [];
  private anomalies: Anomaly[] = [];
  private dimensions: Dimension[] = [];
  private heatmap: HeatmapPoint[] = [];
  private telemetry: Map<string, TelemetryPoint[]> = new Map();
  private generatedAt = new Date('2026-05-14T09:00:00+07:00');

  onModuleInit() {
    this.regenerate(20260514);
    this.logger.log(
      `Generated ${this.units.length} units, ${this.anomalies.length} anomalies, ${this.telemetry.size} telemetry series`,
    );
  }

  getUnits() { return this.units; }
  getUnit(id: string) { return this.units.find((u) => u.id === id); }
  getDistricts() { return this.districts; }
  getAnomalies() { return this.anomalies; }
  getDimensions() { return this.dimensions; }
  getHeatmap() { return this.heatmap; }
  getCenter() { return VIENTIANE_CENTER; }

  getTelemetry(unitId: string, range: '24h' | '7d' = '24h'): TelemetryPoint[] {
    const full = this.telemetry.get(unitId) ?? [];
    if (range === '7d') return full;
    return full.slice(-96);
  }

  getAggregateTelemetry(range: '24h' | '7d' = '24h'): TelemetryPoint[] {
    const series = Array.from(this.telemetry.values()).filter((s) => s.length > 0);
    if (!series.length) return [];
    const length = range === '7d' ? series[0].length : 96;
    const start = series[0].length - length;
    const points: TelemetryPoint[] = [];
    for (let i = 0; i < length; i++) {
      let co2 = 0, pm25 = 0, temperature = 0, humidity = 0, n = 0;
      const t = series[0][start + i]?.t ?? '';
      for (const s of series) {
        const p = s[start + i];
        if (!p) continue;
        co2 += p.co2; pm25 += p.pm25; temperature += p.temperature; humidity += p.humidity; n++;
      }
      points.push({
        t,
        co2: Math.round(co2 / n),
        pm25: Math.round(pm25 / n),
        temperature: Number((temperature / n).toFixed(1)),
        humidity: Number((humidity / n).toFixed(1)),
      });
    }
    return points;
  }

  getOverview(): Overview {
    const online = this.units.filter((u) => u.status === 'online').length;
    const covered = this.units
      .filter((u) => u.status !== 'offline')
      .reduce((s, u) => s + u.childCount, 0);
    const highest = [...this.districts].sort((a, b) => b.riskIndex - a.riskIndex)[0];
    return {
      generatedAt: this.generatedAt.toISOString(),
      onlineCount: online,
      totalCount: this.units.length,
      childrenCovered: covered,
      dimensions: this.dimensions,
      anomaliesActive: this.anomalies.length,
      highestRiskDistrict: highest?.district ?? '',
    };
  }

  private regenerate(seed: number) {
    const rng = new Rng(seed);
    const facilities: Facility[] = ['school', 'childcare', 'clinic', 'shelter'];
    this.units = [];

    const targetPerDistrict = [9, 8, 9, 7, 8, 5, 4, 4];
    let serial = 1;

    DISTRICT_SEEDS.forEach((seed, idx) => {
      const count = targetPerDistrict[idx];
      for (let i = 0; i < count; i++) {
        const facility = facilities[rng.int(0, facilities.length - 1)];
        const placeBase = rng.pick(PLACE_NAMES);
        const facilityWord = rng.pick(FACILITY_PREFIXES[facility]);
        const name = `${placeBase} ${facilityWord}`;

        const lat = seed.center.lat + (rng.next() - 0.5) * seed.spread * 2;
        const lng = seed.center.lng + (rng.next() - 0.5) * seed.spread * 2;

        const status: UnitStatus =
          rng.next() < 0.85 ? 'online' : rng.next() < 0.6 ? 'buffering' : 'offline';

        const childCount =
          facility === 'school' ? rng.int(80, 380)
          : facility === 'childcare' ? rng.int(18, 110)
          : facility === 'clinic' ? rng.int(10, 60)
          : rng.int(8, 45);

        const riskBias = (seed.baseRisk - 50) / 50;

        const reading: SensorReading = status === 'offline' ? {
          temperature: 0, humidity: 0, co2: 0, pm25: 0, smoke: 0, current: 0, intrusion: false,
        } : {
          temperature: Number((26 + rng.range(-1, 7) + riskBias * 2).toFixed(1)),
          humidity: Math.round(55 + rng.range(-5, 25) + riskBias * 8),
          co2: Math.round(500 + rng.range(0, 1100) + riskBias * 300),
          pm25: Math.round(15 + rng.range(0, 70) + riskBias * 25),
          smoke: Number((rng.range(0, 0.08) + (rng.bool(0.05) ? 0.15 : 0)).toFixed(2)),
          current: Number((3 + rng.range(0, 9) + riskBias).toFixed(1)),
          intrusion: rng.bool(0.02),
        };

        const air = status === 'offline' ? 0 : Math.max(0, Math.min(100, Math.round(
          100 - (reading.co2 - 500) / 12 - reading.pm25 / 1.5,
        )));
        const safety = status === 'offline' ? 0 : Math.max(0, Math.min(100, Math.round(
          100 - reading.smoke * 400 - (reading.current > 10 ? 12 : 0) - (reading.intrusion ? 35 : 0),
        )));
        const hygiene = status === 'offline' ? 0 : Math.max(0, Math.min(100, Math.round(
          100 - Math.max(0, reading.humidity - 60) * 1.6,
        )));
        const efficiency = status === 'offline' ? 0 : Math.max(0, Math.min(100, Math.round(
          100 - Math.abs(reading.temperature - 27) * 4 - Math.max(0, reading.current - 6) * 2,
        )));

        const composite = status === 'offline' ? 0 : Math.round((air + safety + hygiene + efficiency) / 4);

        this.units.push({
          id: `VTE-${serial.toString().padStart(3, '0')}`,
          name,
          facility,
          district: seed.name,
          lat,
          lng,
          status,
          childCount,
          composite,
          reading,
          dimensions: { air, safety, hygiene, efficiency },
        });
        serial++;
      }
    });

    this.districts = DISTRICT_SEEDS.map((s) => {
      const units = this.units.filter((u) => u.district === s.name);
      const online = units.filter((u) => u.status !== 'offline');
      const avgComposite = online.length
        ? online.reduce((sum, u) => sum + u.composite, 0) / online.length
        : 0;
      const inverted = online.length ? Math.max(0, 100 - avgComposite) : s.baseRisk;
      const riskIndex = Math.round(0.55 * inverted + 0.45 * s.baseRisk);
      return {
        district: s.name,
        centerLat: s.center.lat,
        centerLng: s.center.lng,
        childPopulation: s.childPopulation,
        riskIndex,
        unitCount: units.length,
      };
    });

    this.dimensions = DIM_BASE.map((d) => {
      const onlineUnits = this.units.filter((u) => u.status !== 'offline');
      const avg = onlineUnits.length
        ? onlineUnits.reduce((s, u) => s + u.dimensions[d.key], 0) / onlineUnits.length
        : 0;
      return {
        ...d,
        score: Math.round(avg),
        delta: Number((rng.range(-6, 4)).toFixed(1)),
      };
    });

    this.telemetry.clear();
    const intervalMin = 15;
    const totalPoints = (24 * 60 * 7) / intervalMin;
    const startEpoch = this.generatedAt.getTime() - totalPoints * intervalMin * 60_000;

    for (const u of this.units) {
      if (u.status === 'offline') {
        this.telemetry.set(u.id, []);
        continue;
      }
      const series: TelemetryPoint[] = [];
      const baseCo2 = Math.max(420, u.reading.co2 * 0.55);
      const basePm25 = Math.max(10, u.reading.pm25 * 0.55);
      const baseTemp = u.reading.temperature - 2;
      const baseHum = u.reading.humidity - 5;

      for (let i = 0; i < totalPoints; i++) {
        const tMs = startEpoch + i * intervalMin * 60_000;
        const d = new Date(tMs);
        const hour = d.getHours() + d.getMinutes() / 60;
        const dow = d.getDay();

        const dayActive = dow >= 1 && dow <= 5 ? 1 : 0.35;
        const occupancy = hour >= 8 && hour <= 17
          ? Math.sin(((hour - 8) / 9) * Math.PI) * dayActive
          : 0;

        const noise = (rng.next() - 0.5) * 0.4 + 1;
        const spike = rng.bool(0.01) ? 1.6 : 1;

        const co2 = Math.round(baseCo2 + occupancy * 820 * noise * spike);
        const pm25 = Math.round((basePm25 + occupancy * 40 + (hour >= 17 && hour <= 19 ? 12 : 0)) * noise);
        const temperature = Number(
          (baseTemp + occupancy * 5.5 + (hour >= 13 && hour <= 16 ? 1.2 : 0) + (rng.next() - 0.5)).toFixed(1),
        );
        const humidity = Number(
          (baseHum + occupancy * 8 + (hour >= 4 && hour <= 7 ? 6 : 0) + (rng.next() - 0.5) * 3).toFixed(1),
        );

        series.push({
          t: d.toISOString(),
          co2,
          pm25,
          temperature,
          humidity,
        });
      }
      this.telemetry.set(u.id, series);
    }

    const anomalyTemplates: { signal: string; message: (u: SensorUnit) => string; sev: Severity; weight: number }[] = [
      { signal: 'PM2.5 precursor', message: (u) => `Rolling 30-min PM2.5 trajectory ↑ 2.${Math.floor(Math.random()*9)}σ above seasonal baseline at ${u.name}.`, sev: 'high', weight: 3 },
      { signal: 'CO₂ saturation', message: (u) => `CO₂ crossed ${1100 + Math.floor(Math.random()*400)} ppm during occupancy at ${u.name}.`, sev: 'medium', weight: 4 },
      { signal: 'Humidity drift', message: (u) => `Humidity sustained > 78% for ${4 + Math.floor(Math.random()*6)}h — mold-risk band at ${u.name}.`, sev: 'medium', weight: 4 },
      { signal: 'Link loss', message: (u) => `Unit ${u.id} dropped 4G LTE — local buffer engaged.`, sev: 'high', weight: 2 },
      { signal: 'Overcurrent', message: (u) => `Overcurrent spike (${(10 + Math.random()*4).toFixed(1)}A) on auxiliary circuit.`, sev: 'low', weight: 2 },
      { signal: 'Smoke trace', message: (u) => `Ambient smoke trace (${(0.1 + Math.random()*0.2).toFixed(2)}) — sustained 8m at ${u.name}.`, sev: 'critical', weight: 1 },
      { signal: 'Thermal anomaly', message: (u) => `Ambient temperature delta vs. cohort > 4σ at ${u.name}.`, sev: 'medium', weight: 3 },
      { signal: 'Intrusion', message: (u) => `After-hours intrusion sensor tripped at ${u.name}.`, sev: 'critical', weight: 1 },
      { signal: 'Buffering', message: (u) => `Telemetry buffering — backhaul intermittent at ${u.name}.`, sev: 'low', weight: 3 },
    ];
    const weightedTemplates = anomalyTemplates.flatMap((a) => Array(a.weight).fill(a));

    this.anomalies = [];
    const anomalyCount = 64;
    const elevatedUnits = [...this.units]
      .filter((u) => u.status !== 'offline')
      .sort((a, b) => a.composite - b.composite);
    const pool = elevatedUnits.slice(0, Math.max(20, Math.floor(elevatedUnits.length * 0.6)));
    if (pool.length === 0) pool.push(...this.units);

    for (let i = 0; i < anomalyCount; i++) {
      const tpl = weightedTemplates[rng.int(0, weightedTemplates.length - 1)];
      const unit = pool[rng.int(0, pool.length - 1)];
      const minsAgo = rng.int(2, 60 * 36);
      const detectedAt = new Date(this.generatedAt.getTime() - minsAgo * 60_000);
      this.anomalies.push({
        id: `A-${(3000 + i).toString()}`,
        unitId: unit.id,
        unitName: unit.name,
        district: unit.district,
        signal: tpl.signal,
        message: tpl.message(unit),
        severity: tpl.sev,
        detectedAt: detectedAt.toISOString(),
      });
    }
    this.anomalies.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));

    this.heatmap = [];
    for (const d of this.districts) {
      this.heatmap.push({ lat: d.centerLat, lng: d.centerLng, weight: d.riskIndex / 8 });
    }
    for (const u of this.units) {
      if (u.status === 'offline') continue;
      this.heatmap.push({
        lat: u.lat,
        lng: u.lng,
        weight: Math.max(1, (100 - u.composite) / 7),
      });
    }
    for (let i = 0; i < 60; i++) {
      const d = DISTRICT_SEEDS[rng.int(0, DISTRICT_SEEDS.length - 1)];
      this.heatmap.push({
        lat: d.center.lat + (rng.next() - 0.5) * d.spread * 2,
        lng: d.center.lng + (rng.next() - 0.5) * d.spread * 2,
        weight: rng.range(1, 8) * ((d.baseRisk + 30) / 100),
      });
    }
  }
}
