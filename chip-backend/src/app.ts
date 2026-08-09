import express, { type Express } from 'express';
import cors from 'cors';
import type { Config } from './config.js';
import { createRouter } from './routes/index.js';
import type { DataStore } from './store.js';

/** Assembles the Express app over an initialised data store. */
export function buildApp(store: DataStore, config: Config): Express {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET'],
      credentials: false,
    }),
  );

  app.use('/api', createRouter(store));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
