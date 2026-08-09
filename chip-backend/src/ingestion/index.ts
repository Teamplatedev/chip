import type { Config } from '../config.js';
import { AirGradientSource } from './airgradient.js';
import { SyntheticSource } from './synthetic.js';
import type { EnvironmentalSource, IngestionResult } from './source.js';

export * from './source.js';

/**
 * Ingestion service. Tries the configured live source (AirGradient) first and
 * falls back to the synthetic network when it returns nothing usable. The
 * hardware-neutral design means adding MQTT / HTTP REST / CSV adapters later is
 * just another entry in the `primary` list — nothing downstream changes.
 */
export class IngestionService {
  private readonly primary: EnvironmentalSource[];
  private readonly fallback: EnvironmentalSource;

  constructor(config: Config) {
    this.primary = config.airgradient.enabled
      ? [new AirGradientSource(config.airgradient)]
      : [];
    this.fallback = new SyntheticSource();
  }

  async load(): Promise<IngestionResult> {
    for (const source of this.primary) {
      const result = await source.fetchCurrent();
      if (result.live && result.readings.length > 0) return result;
    }
    return this.fallback.fetchCurrent();
  }
}
