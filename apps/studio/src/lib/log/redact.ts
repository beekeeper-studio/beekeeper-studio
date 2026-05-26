// Redacts sensitive values (passwords, passphrases, tokens, secrets, private
// keys) from electron-log messages before they reach a transport. Wired up via
// electron-log's `hooks` API: see https://github.com/megahertz/electron-log/blob/master/docs/extend.md#hooks

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /passwd/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /privatekey/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
}

function redactValue(value: unknown, seen: Map<object, unknown>): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return REDACTED;
  if (typeof value === 'number' || typeof value === 'boolean') return REDACTED;
  if (Buffer.isBuffer(value)) return REDACTED;
  if (typeof value === 'object') return redact(value, seen);
  return REDACTED;
}

function redact(input: unknown, seen: Map<object, unknown> = new Map()): unknown {
  if (input == null || typeof input !== 'object') return input;
  if (Buffer.isBuffer(input)) return input;
  const cached = seen.get(input as object);
  if (cached !== undefined) return cached;

  if (Array.isArray(input)) {
    const out: unknown[] = [];
    seen.set(input as object, out);
    for (const item of input) out.push(redact(item, seen));
    return out;
  }

  // Skip non-plain objects (Date, Error, class instances with custom prototypes)
  // because copying them would lose behaviour and they're unlikely to be config bags.
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    seen.set(input as object, input);
    return input;
  }

  const out: Record<string, unknown> = {};
  seen.set(input as object, out);
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = value == null ? value : redactValue(value, seen);
    } else {
      out[key] = redact(value, seen);
    }
  }
  return out;
}

export interface LogMessageLike {
  data: unknown[];
  [k: string]: unknown;
}

export function redactMessage(message: LogMessageLike): LogMessageLike {
  if (!message || !Array.isArray(message.data)) return message;
  return { ...message, data: message.data.map((d) => redact(d)) };
}

// Exposed for tests.
export const __test__ = { redact, isSensitiveKey };
