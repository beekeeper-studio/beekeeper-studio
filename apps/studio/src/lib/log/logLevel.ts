// Computes default log levels for the file and console transports based on
// the build mode and a couple of opt-in env vars. Verbose logging is off by
// default in production (warn+ only) — users can flip it back on with
// BKS_LOG_LEVEL or the existing DEBUG flag. See
// docs/support/troubleshooting.md for the user-facing doc.

import type { LogLevel } from 'electron-log';

const VALID_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

function isValidLevel(level: string | undefined): level is LogLevel {
  return !!level && (VALID_LEVELS as string[]).includes(level);
}

// Mirrors the dev check used in redact.ts — see the comment there for why
// platform_info isn't imported.
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export interface LogLevels {
  file: LogLevel;
  console: LogLevel;
}

export function resolveLogLevels(): LogLevels {
  const override = process.env.BKS_LOG_LEVEL?.toLowerCase();
  if (isValidLevel(override)) {
    return { file: override, console: override };
  }

  if (isDevelopment() || process.env.DEBUG) {
    return { file: 'silly', console: 'info' };
  }

  return { file: 'warn', console: 'warn' };
}
