import * as cassandra from 'cassandra-driver';

/**
 * A column/field type descriptor as handed to us by the driver.
 *
 * The shape of `info` depends on `code`:
 *  - list/set:  a single nested descriptor (the element type)
 *  - map:       a two element tuple, [keyType, valueType]
 *  - tuple:     an array of descriptors, one per position
 *  - udt:       { name, keyspace, fields: [{ name, type }] }
 *  - scalars:   unused
 */
export type CassandraType = {
  code: number;
  info?: any;
};

const { dataTypes, BigDecimal, Integer, Long } = cassandra.types;

// Protocol v4 has no duration type code, so the column is described as this custom type
const durationClassName = 'org.apache.cassandra.db.marshal.DurationType';

export function decimalToString(value: any): string {
  // BigDecimal#toString() assumes a non-negative scale and renders 1.5E+4
  // (15 with scale -3) as "15.", so use scientific notation for it like cqlsh.
  const buffer = BigDecimal.toBuffer(value);
  const scale = buffer.readInt32BE(0);
  if (scale >= 0) {
    return value.toString();
  }
  const unscaled = Integer.fromBuffer(buffer.subarray(4)).toString();
  const sign = unscaled.startsWith('-') ? '-' : '';
  const digits = unscaled.slice(sign.length);
  const fraction = digits.length > 1 ? `.${digits.slice(1)}` : '';
  return `${sign}${digits[0]}${fraction}E+${digits.length - 1 - scale}`;
}

const nanoUnits: [typeof Long.ONE, string][] = [
  [Long.fromNumber(3600e9), 'h'],
  [Long.fromNumber(60e9), 'm'],
  [Long.fromNumber(1e9), 's'],
  [Long.fromNumber(1e6), 'ms'],
  [Long.fromNumber(1e3), 'us'],
  [Long.ONE, 'ns'],
];

export function durationToString(value: any): string {
  // Same format as cqlsh. Duration#toString() rounds the years, so 18 months
  // comes out as "2y6mo".
  const { months, days, nanoseconds } = value;
  let result = '';
  const append = (amount: number | typeof Long.ONE, unit: string) => {
    if (amount.toString() !== '0') {
      result += `${amount}${unit}`;
    }
  };

  append(Math.floor(Math.abs(months) / 12), 'y');
  append(Math.abs(months) % 12, 'mo');
  append(Math.abs(days), 'd');
  let nanos = nanoseconds.isNegative() ? nanoseconds.negate() : nanoseconds;
  for (const [size, unit] of nanoUnits) {
    append(nanos.divide(size), unit);
    nanos = nanos.modulo(size);
  }

  if (!result) {
    return '0s';
  }
  return months < 0 || days < 0 || nanoseconds.isNegative() ? `-${result}` : result;
}

function floatToNumber(value: number): number {
  // The driver decodes a float into a double, so 3.14 arrives as
  // 3.140000104904175. Use the shortest number that maps back to the same float.
  if (!Number.isFinite(value)) {
    return value;
  }
  for (let precision = 1; precision <= 9; precision++) {
    const shorter = Number(value.toPrecision(precision));
    if (Math.fround(shorter) === value) {
      return shorter;
    }
  }
  return value;
}

function convertScalar(value: any, code: number, info?: any) {
  switch (code) {
    case dataTypes.bigint:
    case dataTypes.varint:
      return String(value);
    case dataTypes.decimal:
      // map keys arrive already stringified
      return typeof value === 'string' ? value : decimalToString(value);
    case dataTypes.duration:
      return durationToString(value);
    case dataTypes.custom:
      return info === durationClassName ? durationToString(value) : value;
    case dataTypes.float:
      return floatToNumber(Number(value));
    case dataTypes.timestamp:
      // Map keys reach us already coerced to strings: the driver builds plain
      // object maps with `map[key] = value`, which stringifies a Date key.
      return typeof value.toISOString === 'function' ? value.toISOString() : String(value);
    case dataTypes.time:
    case dataTypes.date:
      return String(value);
    case dataTypes.uuid:
    case dataTypes.timeuuid:
      return value?.buffer
        ? new cassandra.types.Uuid(Buffer.from(value.buffer)).toString()
        : value;
    case dataTypes.inet:
      return value.toString();
    default:
      return value;
  }
}

/**
 * Convert a driver-decoded value into something that survives the trip to the
 * renderer and reads sensibly in the grid.
 *
 * Driver types like Uuid, Long and InetAddress are class instances, so once
 * they cross the process boundary they arrive as their raw internals - a UUID
 * turns into `{ buffer: { type: "Buffer", data: [...] } }`. Containers are
 * walked recursively so a driver type is converted no matter how deeply it is
 * nested: set<frozen<udt>>, a udt holding a list, a udt inside a udt, and so on.
 */
export function convertValueByType(value: any, type: CassandraType) {
  if (value == null) {
    return null;
  }

  const { code, info } = type ?? {};

  if (code === dataTypes.list || code === dataTypes.set) {
    return Array.from(value).map((v) => convertValueByType(v, info));
  }

  if (code === dataTypes.map) {
    const [keyType, valueType] = info ?? [];
    const entries = value instanceof Map ? value.entries() : Object.entries(value);
    const converted = {};
    for (const [k, v] of entries) {
      const convertedKey = convertValueByType(k, keyType);
      converted[convertedKey as string] = convertValueByType(v, valueType);
    }
    return converted;
  }

  if (code === dataTypes.udt) {
    const converted = {};
    (info?.fields ?? []).forEach((field) => {
      converted[field.name] = convertValueByType(value[field.name], field.type);
    });
    return converted;
  }

  if (code === dataTypes.tuple) {
    // A driver Tuple is not iterable and exposes no indexed properties, so
    // Array.from(tuple) yields a same-length array of undefined. Read the
    // backing array instead.
    const elements = value.elements ?? value;
    return Array.from(elements).map((v, i) => convertValueByType(v, info?.[i]));
  }

  return convertScalar(value, code, info);
}
