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

const dataTypes = cassandra.types.dataTypes;

function convertScalar(value: any, code: number) {
  switch (code) {
    case dataTypes.bigint:
      return String(value);
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

  return convertScalar(value, code);
}
