// Redacts sensitive values (passwords, passphrases, tokens, secrets, private
// keys) from log messages before they reach a transport. Wired into the
// shared logger via its `hooks` API.

import { cloneDeepWith } from 'lodash';

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /\bpwd$/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /privatekey/i,
  /credentials?$/i,
  /apikey/i,
  /bearer/i,
  /\bjwt\b/i,
];

function isSensitiveKey(key: PropertyKey | undefined): boolean {
  if (typeof key !== 'string') return false;
  return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

function redact(input: unknown): unknown {
  return cloneDeepWith(input, (value, key) => {
    if (isSensitiveKey(key) && value != null) return REDACTED;
    // returning undefined hands the value back to lodash for normal cloning
    return undefined;
  });
}

export interface LogMessageLike {
  data: unknown[];
  [k: string]: unknown;
}

// Mirrors the dev-mode signal in src/common/platform_info/mainPlatformInfo.ts.
// We don't import platform_info directly because utilityPlatformInfo imports
// @bksLogger at module top-level, which creates a circular dep that breaks
// during logger init. esbuild statically replaces this expression at build
// time ("development" in watch mode, "production" otherwise); jest sets it to
// "test" so redaction stays on under integration tests.
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function redactMessage(message: LogMessageLike): LogMessageLike {
  if (!message || !Array.isArray(message.data)) return message;
  if (isDevelopment()) return message;
  return { ...message, data: message.data.map(redact) };
}

// Exposed for tests.
export const __test__ = { redact, isSensitiveKey, isDevelopment };
