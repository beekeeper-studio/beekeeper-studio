// Redacts sensitive values (passwords, passphrases, tokens, secrets, private
// keys) from log messages before they reach a transport. Wired into the
// shared logger via its `hooks` API.

import type { LogMessage } from 'electron-log';
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
  // Catches typeorm/cloud-workspace fields like passwordCipherText,
  // sshPasswordCipher, encryptedToken — the cipher payload is still secret.
  /cipher/i,
  /encrypted/i,
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

export function redactMessage(message: LogMessage): LogMessage {
  if (!message || !Array.isArray(message.data)) return message;
  return { ...message, data: message.data.map(redact) };
}

// Exposed for tests.
export const __test__ = { redact, isSensitiveKey };
