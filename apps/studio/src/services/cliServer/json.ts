/**
 * Database drivers hand back values JSON.stringify can't cope with (BigInt
 * throws, Buffers turn into {type, data} arrays, Dates lose their type, cycles
 * throw). Everything that goes over the CLI socket passes through here first.
 */

const MAX_DEPTH = 64

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER)

export interface CliBinaryValue {
  type: 'binary'
  encoding: 'hex'
  data: string
}

function binary(view: ArrayBufferView | ArrayBuffer): CliBinaryValue {
  const buffer = ArrayBuffer.isView(view)
    ? Buffer.from(view.buffer, view.byteOffset, view.byteLength)
    : Buffer.from(view)
  return { type: 'binary', encoding: 'hex', data: buffer.toString('hex') }
}

export function sanitizeForJson(value: unknown, seen: WeakSet<object> = new WeakSet(), depth = 0): any {
  if (value === null || value === undefined) return null

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      return Number.isFinite(value) ? value : null
    case 'bigint':
      return value <= MAX_SAFE && value >= MIN_SAFE ? Number(value) : value.toString()
    case 'function':
    case 'symbol':
      return null
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return binary(value)
  }

  if (depth > MAX_DEPTH) return '[nested too deep]'

  if (typeof value === 'object') {
    if (seen.has(value)) return '[circular]'
    seen.add(value)
    try {
      if (Array.isArray(value)) {
        return value.map((item) => sanitizeForJson(item, seen, depth + 1))
      }
      if (value instanceof Map) {
        const result: Record<string, any> = {}
        for (const [key, item] of value.entries()) {
          result[String(key)] = sanitizeForJson(item, seen, depth + 1)
        }
        return result
      }
      if (value instanceof Set) {
        return Array.from(value).map((item) => sanitizeForJson(item, seen, depth + 1))
      }
      // Decimal-ish and other driver value types usually know how to describe
      // themselves. Buffers were handled above, so this never produces {type, data}.
      if (typeof (value as any).toJSON === 'function') {
        return sanitizeForJson((value as any).toJSON(), seen, depth + 1)
      }
      const result: Record<string, any> = {}
      for (const [key, item] of Object.entries(value)) {
        result[key] = sanitizeForJson(item, seen, depth + 1)
      }
      return result
    } finally {
      seen.delete(value)
    }
  }

  return null
}
