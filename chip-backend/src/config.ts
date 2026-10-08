export interface Config {
  port: number;
  /** Background data-refresh interval, in minutes. */
  refreshIntervalMin: number;
  corsOrigins: (string | RegExp)[];
  airgradient: {
    enabled: boolean;
    baseUrl: string;
    token?: string;
    timeoutMs: number;
    /** Only ingest sites from this public contributor (the UNICEF Lao network). */
    contributor: string;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3001),
    refreshIntervalMin: Number(env.REFRESH_INTERVAL_MIN ?? 15),
    corsOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /\.vercel\.app$/,
    ],
    airgradient: {
      // The UNICEF Lao network is exposed on the AirGradient public endpoint
      // without a token, so the live connector is ON by default. It still falls
      // back to synthetic if the upstream is unreachable. Set AIRGRADIENT_ENABLED
      // = false to force synthetic. A token, if provided, is passed through.
      enabled: env.AIRGRADIENT_ENABLED !== 'false',
      baseUrl: env.AIRGRADIENT_BASE_URL ?? 'https://api.airgradient.com',
      token: env.AIRGRADIENT_API_TOKEN,
      timeoutMs: Number(env.AIRGRADIENT_TIMEOUT_MS ?? 10000),
      contributor: env.AIRGRADIENT_CONTRIBUTOR ?? 'UNICEF',
    },
  };
}
