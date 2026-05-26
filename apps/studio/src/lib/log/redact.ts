// Redacts sensitive values (passwords, passphrases, tokens, secrets, private
// keys) from electron-log messages before they reach a transport. Wired up via
// electron-log's `hooks` API: see https://github.com/megahertz/electron-log/blob/master/docs/extend.md#hooks

import { cloneDeepWith } from 'lodash';

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /privatekey/i,
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

export function redactMessage(message: LogMessageLike): LogMessageLike {
  if (!message || !Array.isArray(message.data)) return message;
  return { ...message, data: message.data.map(redact) };
}

// Exposed for tests.
export const __test__ = { redact, isSensitiveKey };
