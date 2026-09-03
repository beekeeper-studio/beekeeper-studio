import * as cassandra from 'cassandra-driver';

/**
 * A column/field type descriptor as handed to us by the driver.
 *
 * The shape of `info` depends on `code`:
 *  - list/set:  a single nested descriptor (the element type)
 *  - map:       a two element tuple, [keyType, valueType]
 *  - tuple:     an array of descriptors, one per position
 *  - udt:       { name, keyspace, fields: [{ name, type }] }
 *  - custom:    the fully qualified Java class name, or for a vector,
 *               [elementType, dimensions] alongside customTypeName: 'vector'
 *  - scalars:   unused
 */
export type CassandraType = {
  code: number;
  info?: any;
  customTypeName?: string;
};

/** Column type descriptors per table, keyed by `keyspace.table` then column. */
export type ColumnTypes = Record<string, Record<string, CassandraType>>;

const dataTypes = cassandra.types.dataTypes;

/**
 * Duration: months, days and a nanoseconds Long. toString() gives back the CQL
 * literal, e.g. 1mo2d3s - except for a zero duration, where it appends nothing
 * for each zero component and returns an empty string. A blank cell would be
 * indistinguishable from an unset value, so spell zero out as `0s`, which is
 * what Cassandra accepts back.
 */
function durationToString(value: any) {
  return String(value) || '0s';
}

function convertScalar(value: any, code: number) {
  switch (code) {
    // Long, or a native BigInt when the driver is configured for it. A counter
    // decodes to a Long too, so it needs the same treatment as a bigint.
    case dataTypes.bigint:
    case dataTypes.counter:
    // Integer, the driver's arbitrary precision integer (a CQL varint is a Java
    // BigInteger). Backed by an int array, so its raw form is meaningless.
    case dataTypes.varint:
    // BigDecimal, an Integer plus a scale.
    case dataTypes.decimal:
      return String(value);
    case dataTypes.duration:
      return durationToString(value);
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
      // blob decodes to a Buffer, which the grid renders as binary. Left alone
      // on purpose.
      return value;
  }
}

/** A driver Vector: an elements array plus the subtype it was decoded with. */
function isVector(value: any) {
  return Array.isArray(value?.elements) && typeof value?.subtype === 'string';
}

/**
 * `custom` covers what the driver decodes outside the CQL type codes: vectors,
 * DSE geometry (Point, LineString, Polygon), DateRange, and duration on older
 * protocol versions. Anything the driver cannot decode stays a Buffer.
 */
function convertCustom(value: any, info: any) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (isVector(value)) {
    // A Vector is a Proxy over its elements and throws on structured clone, so
    // it has to become a plain array.
    const elementType = Array.isArray(info) ? info[0] : undefined;
    return value.elements.map((v: any) => convertValueByType(v, elementType));
  }

  // A real server sends duration as a custom type rather than under its own
  // type code, so this - not the `duration` case above - is the path it takes.
  if (value instanceof cassandra.types.Duration) {
    return durationToString(value);
  }

  // The rest are class instances whose toString() is the literal form.
  return typeof value.toString === 'function' ? value.toString() : value;
}

/**
 * The driver builds plain object maps with `map[key] = value`, which stringifies
 * any key that is not already a primitive - a Tuple key arrives as `(1,2)`, a
 * Date key as its toString form. Feeding one of those back through the walker
 * destroys it: the tuple branch would call Array.from on the string and shred it
 * into `(,1,,,2,)`. A key that is already a string is left as it is.
 *
 * A key can only be a comparable frozen type, so duration and vector are ruled
 * out by Cassandra itself ("Durations are not allowed as map keys"), but a
 * frozen tuple is legal, which is the case this guards.
 */
function convertMapKey(key: any, keyType: CassandraType) {
  const isContainer = keyType?.code === dataTypes.tuple
    || keyType?.code === dataTypes.udt
    || keyType?.code === dataTypes.list
    || keyType?.code === dataTypes.set
    || keyType?.code === dataTypes.map;

  if (isContainer && typeof key === 'string') {
    return key;
  }

  return convertValueByType(key, keyType);
}

/**
 * Convert a driver-decoded value into something that survives the trip to the
 * renderer and reads sensibly in the grid.
 *
 * Driver types like Uuid, Long, Integer, BigDecimal, Duration and InetAddress
 * are class instances, so once they cross the process boundary they arrive as
 * their raw internals - a UUID turns into `{ buffer: { type: "Buffer", data:
 * [...] } }`, a varint into `{ bits_: [...], sign_: 0 }`. Containers are walked
 * recursively so a driver type is converted no matter how deeply it is nested:
 * set<frozen<udt>>, a udt holding a list, a udt inside a udt, and so on.
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
      const convertedKey = convertMapKey(k, keyType);
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

  if (code === dataTypes.custom) {
    return convertCustom(value, info);
  }

  return convertScalar(value, code);
}

/**
 * The CQL name for a column's type, e.g. `varint`, `duration`, `list<uuid>`,
 * `map<text, int>`, or a udt's own name.
 *
 * The driver derives this from the same descriptor `convertValueByType` walks,
 * including the nested subtypes. The previous hand-maintained array indexed
 * names by type code, which only holds while the codes are contiguous: they
 * are not (list is 32, udt 48), so every collection came back `user-defined`
 * and duration - code 21, one past tinyint - came back `list`.
 */
export function dataTypeName(type: CassandraType): string {
  // Exported by the driver but missing from its type definitions.
  const getName: (type: CassandraType) => string =
    (cassandra.types as any).getDataTypeNameByCode;

  // The driver names every custom type `custom`, but a real server sends
  // duration and the DSE geometry types this way, identified by a Java class
  // name. `org.apache.cassandra.db.marshal.DurationType` -> `duration`.
  if (type?.code === dataTypes.custom && typeof type.info === 'string') {
    const className = type.info.split('.').pop() ?? '';
    const name = className.replace(/Type$/, '').toLowerCase();
    if (name) {
      return name;
    }
  }

  try {
    return getName(type);
  } catch {
    return 'user-defined';
  }
}

/**
 * The inverse of `convertValueByType`, for values on their way back to the
 * server as bound parameters.
 *
 * `convertValueByType` flattens driver classes so they survive the trip to the
 * renderer, but the driver's encoder is stricter than its decoder: it takes a
 * string for the numeric types "for historical reasons", yet insists on the
 * real class for a duration, a vector and the DSE geometry types, and on a
 * Tuple for a tuple. Encoding a plain value for one of those throws, so every
 * one has to be rebuilt from the string or array the grid hands back.
 *
 * Anything the encoder already accepts is passed through untouched.
 */
export function toDriverValue(value: any, type: CassandraType) {
  if (value == null) {
    return null;
  }

  const { code, info } = type ?? {};

  if (code === dataTypes.list || code === dataTypes.set) {
    return Array.from(value).map((v) => toDriverValue(v, info));
  }

  if (code === dataTypes.map) {
    // Keys are left alone. Cassandra rejects duration and vector as map keys
    // outright, but a frozen tuple is legal - and the driver hands those to us
    // already stringified to `(1,2)`, which Tuple offers no way back from. Such
    // a map reads fine and is not writable; nothing here can change that.
    const valueType = (info ?? [])[1];
    const entries = value instanceof Map ? value.entries() : Object.entries(value);
    const converted = {};
    for (const [k, v] of entries) {
      converted[k as string] = toDriverValue(v, valueType);
    }
    return converted;
  }

  if (code === dataTypes.udt) {
    const converted = {};
    (info?.fields ?? []).forEach((field) => {
      converted[field.name] = toDriverValue(value[field.name], field.type);
    });
    return converted;
  }

  if (code === dataTypes.tuple) {
    // encodeTuple calls value.get(i), so a plain array will not do.
    if (value instanceof cassandra.types.Tuple) {
      return value;
    }
    const elements = Array.from(value).map((v, i) => toDriverValue(v, info?.[i]));
    return cassandra.types.Tuple.fromArray(elements);
  }

  if (code === dataTypes.custom) {
    return customToDriverValue(value, type);
  }

  if (code === dataTypes.duration) {
    return toDuration(value);
  }

  return value;
}

function toDuration(value: any) {
  return value instanceof cassandra.types.Duration
    ? value
    : cassandra.types.Duration.fromString(String(value));
}

/** Rebuilders for the custom types, keyed by their Java class name. */
const customFromString = {
  DurationType: (v: string) => cassandra.types.Duration.fromString(v),
  PointType: (v: string) => cassandra.geometry.Point.fromString(v),
  LineStringType: (v: string) => cassandra.geometry.LineString.fromString(v),
  PolygonType: (v: string) => cassandra.geometry.Polygon.fromString(v),
  DateRangeType: (v: string) => cassandra.datastax.search.DateRange.fromString(v),
};

function customToDriverValue(value: any, type: CassandraType) {
  const { info, customTypeName } = type;

  if (isVector(value)) {
    return value;
  }

  if (customTypeName === 'vector') {
    // encodeVector reads the element type off the column rather than off the
    // Vector, so the subtype here is only a label.
    const elementType = Array.isArray(info) ? info[0] : undefined;
    const elements = Array.from(value).map((v) => toDriverValue(v, elementType));
    return new cassandra.types.Vector(elements, dataTypeName(elementType));
  }

  if (typeof value !== 'string') {
    return value;
  }

  const className = typeof info === 'string' ? info.split('.').pop() : '';
  const rebuild = customFromString[className];
  return rebuild ? rebuild(value) : value;
}
