// Resolves the log level for the main and utility processes. Reads
// process.env directly (the renderer is handled separately — it can't see
// process.env, so main pushes the resolved level via platformInfo).
//
// Production defaults to `warn`; BKS_LOG_LEVEL overrides everything, and
// DEBUG=1 / NODE_ENV=development bumps to `silly`. See
// docs/support/troubleshooting.md for the user-facing doc.

import type { LogLevel } from 'electron-log';

const VALID: LogLevel[] = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

export function resolveLevel(env: any, isDev = false): LogLevel {
  const override = env.BKS_LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (override && (VALID as string[]).includes(override)) return override;
  if (env.NODE_ENV === 'development' || env.DEBUG || isDev) return 'silly';
  return 'warn';
}
