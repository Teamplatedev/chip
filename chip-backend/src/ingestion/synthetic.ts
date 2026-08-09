import type { EnvironmentalSource, IngestionResult, RawReading } from './source.js';
import { DISTRICT_SEEDS, Rng } from './source.js';
import type { SiteStatus } from '../domain/types.js';

const PLACE_NAMES = [
  'Ban Phonsavanh', 'Ban Naxay', 'Ban Sokpaluang', 'Ban Phonpapao', 'Ban Sisavath',
  'Ban Dongdok', 'Ban Saphanthong', 'Ban Nongbone', 'That Luang', 'Patuxai',
  'Mahosot', 'Thadeua', 'Sibounheuang', 'Vatchan', 'Phonkheng',
  'Nonghai', 'Khok Saath', 'Dongnasok', 'Nongniew', 'Phonthong',
  'Houaykhot', 'Sokpaluang', 'Saylom', 'Ban Khoua', 'Ban Donnoun',
];

/**
 * Synthetic environmental source. Reproduces the shape of the national school
 * climate network so the platform runs end to end without upstream access, and
 * so the AirGradient adapter has a deterministic fallback. Values are biased by
 * each district's baseline hazard character.
 */
export class SyntheticSource implements EnvironmentalSource {
  readonly key = 'synthetic';
  readonly label = 'Synthetic network (fallback)';

  constructor(
    private readonly seed = 20260514,
    private readonly nowIso = '2026-08-09T09:00:00+07:00',
  ) {}

  fetchCurrent(): Promise<IngestionResult> {
    const rng = new Rng(this.seed);
    const readings: RawReading[] = [];
    let serial = 1;

    for (const d of DISTRICT_SEEDS) {
      for (let i = 0; i < d.monitors; i++) {
        const bias = (d.baseHazard - 50) / 50;
        const status: SiteStatus =
          rng.next() < 0.85 ? 'online' : rng.next() < 0.6 ? 'buffering' : 'offline';

        const offline = status === 'offline';
        // Seasonally plausible for August (wet season): monsoon suppresses
        // PM2.5, humidity runs high, heat is moderate. The dry-season peak
        // (Dec-Apr) would raise PM2.5 and heat sharply — that seasonality is a
        // model input under the workplan, approximated here by the baseline.
        const reading = {
          pm25: offline ? 0 : Math.max(2, Math.round(9 + rng.range(0, 34) + bias * 18)),
          temperature: offline ? 0 : Number((27 + rng.range(-1, 7) + bias * 2.5).toFixed(1)),
          humidity: offline ? 0 : Math.round(64 + rng.range(-6, 22) + bias * 5),
          co2: offline ? 0 : Math.round(480 + rng.range(0, 900) + bias * 220),
        };

        readings.push({
          siteId: `VTE-${serial.toString().padStart(3, '0')}`,
          siteName: `${rng.pick(PLACE_NAMES)} station`,
          lat: d.center.lat + (rng.next() - 0.5) * d.spread * 2,
          lng: d.center.lng + (rng.next() - 0.5) * d.spread * 2,
          status,
          source: 'synthetic',
          observedAt: this.nowIso,
          ...reading,
        });
        serial++;
      }
    }

    return Promise.resolve({ source: this.label, live: false, readings });
  }
}
