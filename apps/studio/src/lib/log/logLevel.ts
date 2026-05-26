// Computes default log levels for the file and console transports. Each
// logger entrypoint passes in the env it can actually read — main/utility
// hand us `process.env`, the renderer hands us `import.meta.env`-derived
// values, since `process` isn't exposed under context isolation.
//
// Verbose logging is off by default in production (warn+ only) — users can
// flip it back on with BKS_LOG_LEVEL or the existing DEBUG flag. See
// docs/support/troubleshooting.md for the user-facing doc.

import type { LogLevel } from 'electron-log';

const VALID_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

function isValidLevel(level: string | undefined): level is LogLevel {
  return !!level && (VALID_LEVELS as string[]).includes(level);
}

export interface LogLevels {
  file: LogLevel;
  console: LogLevel;
}

export interface LogLevelInputs {
  /** True in dev builds; falsy in packaged/production builds. */
  isDevelopment: boolean;
  /** BKS_LOG_LEVEL value, or undefined if not set. Highest priority. */
  override?: string;
  /** Truthy if the user set DEBUG=1/DEBUG=*; opens devtools and bumps verbosity. */
  debugFlag?: boolean;
}

export function resolveLogLevels(inputs: LogLevelInputs): LogLevels {
  const override = inputs.override?.toLowerCase();
  if (isValidLevel(override)) {
    return { file: override, console: override };
  }

  if (inputs.isDevelopment || inputs.debugFlag) {
    return { file: 'silly', console: 'info' };
  }

  return { file: 'warn', console: 'warn' };
}

// Convenience for main/utility process callers, which can read process.env
// directly. esbuild substitutes `process.env.NODE_ENV` at build time.
export function resolveLogLevelsFromProcessEnv(): LogLevels {
  return resolveLogLevels({
    isDevelopment: process.env.NODE_ENV === 'development',
    override: process.env.BKS_LOG_LEVEL,
    debugFlag: !!process.env.DEBUG,
  });
}
