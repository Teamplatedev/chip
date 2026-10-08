import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { IngestionService } from './ingestion/index.js';
import { DataStore } from './store.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const ingestion = new IngestionService(config);
  const store = new DataStore(ingestion);
  await store.init();
  store.startAutoRefresh(config.refreshIntervalMin * 60_000);

  const app = buildApp(store, config);
  app.listen(config.port, () => {
    const src = store.getSourceStatus().find((s) => s.key === 'airgradient');
    console.log(`chip-backend listening on http://localhost:${config.port}/api`);
    console.log(`environmental source: ${src?.state ?? 'unknown'} — ${src?.note ?? ''}`);
    console.log(`auto-refresh: every ${config.refreshIntervalMin} min`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start chip-backend:', err);
  process.exit(1);
});
