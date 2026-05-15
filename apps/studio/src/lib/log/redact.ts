// Redact sensitive values before logging. Walks plain objects and arrays,
// replacing the value of any key matching the sensitive-key pattern with
// '[REDACTED]'. Buffers are always replaced (they're usually private key
// material). Class instances, Errors, Dates, RegExps, primitives, and
// functions are returned as-is so we don't strip useful debug context.

const SENSITIVE_KEY = new RegExp(
  [
    'password',
    'passphrase',
    'privatekey',
    'private_key',
    'bastion_?key',
    '^key$',
    '^keys$',
    '^secret$',
    'apisecret',
    'api_?secret',
    'client_?secret',
    '^token$',
    'accesstoken',
    'access_?token',
    'refreshtoken',
    'refresh_?token',
    'idtoken',
    'id_?token',
    'authtoken',
    'auth_?token',
    'sessiontoken',
    'session_?token',
    'apikey',
    'api_?key',
    'license_?key',
    'licensekey',
    '^credentials?$',
    '^authorization$',
    '^cookie$',
    'session_?id',
    'sessionid',
    'key_?file',
    'keyfilename',
    'service_?account',
  ].join('|'),
  'i'
);

const REDACTED = '[REDACTED]';
const DEFAULT_MAX_DEPTH = 8;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isBuffer(value: unknown): boolean {
  return (
    typeof Buffer !== 'undefined' &&
    typeof Buffer.isBuffer === 'function' &&
    Buffer.isBuffer(value)
  );
}

function isSpecialObject(value: object): boolean {
  return (
    value instanceof Error ||
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Map ||
    value instanceof Set ||
    ArrayBuffer.isView(value as ArrayBufferView)
  );
}

/**
 * Returns whether a property name should have its value redacted.
 * Exported for tests; prefer redact() at call sites.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/**
 * Returns a safe-to-log copy of `value` with sensitive fields replaced.
 * - Primitives, functions, Errors, Dates, RegExps, Maps, Sets, and typed
 *   arrays are returned unchanged.
 * - Buffers are replaced with '[REDACTED]' (treated as key material).
 * - Plain objects and arrays are deep-cloned; values under sensitive keys
 *   are replaced with '[REDACTED]'. Non-plain objects (class instances)
 *   are returned as-is to avoid breaking on getters / circular refs.
 */
export function redact<T>(value: T, maxDepth = DEFAULT_MAX_DEPTH): T {
  return redactInternal(value, maxDepth, new WeakSet()) as T;
}

function redactInternal(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (isBuffer(value)) return REDACTED;
  if (isSpecialObject(value as object)) return value;
  if (depth <= 0) return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redactInternal(v, depth - 1, seen));
  }

  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key];
    if (isSensitiveKey(key)) {
      out[key] = child === null || child === undefined ? child : REDACTED;
    } else {
      out[key] = redactInternal(child, depth - 1, seen);
    }
  }
  return out;
}
