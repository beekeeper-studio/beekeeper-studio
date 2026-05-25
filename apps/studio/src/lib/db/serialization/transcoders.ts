import _ from "lodash";
import { BksField } from "../models";
import rawLog from "@bksLogger";
import { DuckDBBlobValue } from "@duckdb/node-api";
import { ObjectId } from "mongodb";
import { RecordId, StringRecordId } from "surrealdb";

const log = rawLog.scope("transcoders");

export interface Transcoder<T, U> {
  serialize(value: T): U;
  deserialize(value: U): T;
  serializeCheckByField(field: BksField): boolean;
  deserializeCheckByValue(value: unknown): value is U;
}

export const SurrealDBRecordTranscoder: Transcoder<RecordId | StringRecordId, string> = {
  serialize(value) {
    if (!(value instanceof RecordId) && !(value instanceof StringRecordId)) {
      log.warn("SurrealDBRecordTranscoder: cannot serialize non-recordid value");
      return value;
    }
    return value.toString();
  },
  deserialize(value) {
    return new StringRecordId(value)
  },
  serializeCheckByField(field): boolean {
    return field.bksType === 'SURREALID';
  },
  deserializeCheckByValue(value): value is string {
    // This may be too permissive but we'll see
    return _.isString(value) && /^(?:[a-zA-Z_][a-zA-Z0-9_\-]*|⟨[^⟩]+⟩):.+$/.test(value);
  }
}

export const MongoDBObjectIdTranscoder: Transcoder<ObjectId, Uint8Array> = {
  serialize(value) {
    if (!(value instanceof ObjectId)) {
      log.warn("MongoDBObjectIdTranscoder: cannot serialize non-objectid value");
      return value;
    }
    return value.id;
  },
  deserialize(value) {
    if (!_.isTypedArray(value)) {
      log.warn("MongoDBObjectIdTranscoder: cannot deserialize non-typed array value");
      return value as any; // eww
    }
    return new ObjectId(value);
  },
  serializeCheckByField(field: BksField): boolean {
    return field.bksType === "OBJECTID";
  },
  deserializeCheckByValue(value): value is Uint8Array {
    return _.isTypedArray(value);
  }
}

export const GenericBinaryTranscoder: Transcoder<Buffer, Uint8Array> = {
  serialize(value) {
    if (!_.isBuffer(value)) {
      log.warn("GenericBinaryTranscoder: cannot serialize non-buffer value");
      return value;
    }
    return new Uint8Array(value, 0, value.byteLength);
  },
  deserialize(value) {
    if (!_.isTypedArray(value)) {
      log.warn("GenericBinaryTranscoder: cannot deserialize non-typed array value");
      return value as Buffer;
    }
    return Buffer.from(value, 0, value.byteLength);
  },
  serializeCheckByField(field: BksField): boolean {
    return field.bksType === "BINARY";
  },
  deserializeCheckByValue(value): value is Uint8Array {
    return _.isTypedArray(value);
  },
};

export const LibSQLBinaryTranscoder: Transcoder<
  ArrayBuffer | Buffer,
  Uint8Array
> = {
  serialize(value) {
    if (!_.isBuffer(value) && !_.isArrayBuffer(value)) {
      log.warn("LibSQLBinaryTranscoder: cannot serialize non-buffer value");
      return value as Uint8Array;
    }
    return new Uint8Array(value, 0, value.byteLength);
  },
  deserialize(value) {
    if (!_.isTypedArray(value)) {
      log.warn("LibSQLBinaryTranscoder: cannot deserialize non-typed array value");
      return value;
    }
    const buffer = Buffer.from(value.buffer, 0, value.byteLength);
    Object.assign(buffer, {
      toSQL() {
        return `X'${this.toString("hex")}'`;
      },
    });
    return buffer;
  },
  serializeCheckByField(field: BksField): boolean {
    return field.bksType === "BINARY";
  },
  deserializeCheckByValue(value): value is Uint8Array {
    return _.isTypedArray(value);
  },
};

export const DuckDBBinaryTranscoder: Transcoder<DuckDBBlobValue, Uint8Array> = {
  serialize(value) {
    if (_.isNil(value)) return value;
    return new Uint8Array(value.bytes, 0, value.bytes.byteLength);
  },
  deserialize(value) {
    if (_.isNil(value)) return value;
    const blob = new DuckDBBlobValue(value);
    Object.assign(blob, {
      toSQL() {
        return `'${this.toString("hex")}'`;
      },
    })
    return blob;
  },
  serializeCheckByField(field: BksField): boolean {
    return field.bksType === "BINARY";
  },
  deserializeCheckByValue(value): value is Uint8Array {
    return _.isTypedArray(value);
  },
};

// Built-in class instances that Electron's structured-clone IPC can carry safely.
type AnyConstructor = new (...args: any[]) => unknown;
const STRUCTURED_CLONE_SAFE_CLASSES: ReadonlyArray<AnyConstructor> = [
  Date, Map, Set, RegExp, Error, ArrayBuffer, DataView,
];

function isIpcSafe(value: unknown): boolean {
  if (value === null || typeof value !== "object") return true;
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) return true;
  if (Array.isArray(value)) return true;
  if (ArrayBuffer.isView(value)) return true;
  return STRUCTURED_CLONE_SAFE_CLASSES.some((Klass) => value instanceof Klass);
}

function describeUnsafeValue(value: unknown): string {
  return (value as any)?.constructor?.name ?? typeof value;
}

/**
 * Safety net for the IPC boundary: throws when a class instance would otherwise
 * leak across structured-clone without a dedicated transcoder. Appended last so
 * dialect-specific transcoders get first claim on every field and value.
 */
export const UnknownTranscoder: Transcoder<unknown, unknown> = {
  serialize(value) {
    if (isIpcSafe(value)) return value;
    throw new Error(
      `UnknownTranscoder: refusing to serialize value of type ${describeUnsafeValue(value)}. ` +
      `Add a dedicated Transcoder and tag the BksField accordingly.`
    );
  },
  deserialize(value) {
    throw new Error(
      `UnknownTranscoder: refusing to deserialize value of type ${describeUnsafeValue(value)}. ` +
      `Missing transcoder for this dialect.`
    );
  },
  serializeCheckByField(field) {
    return field.bksType === "UNKNOWN";
  },
  deserializeCheckByValue(value) {
    return !isIpcSafe(value);
  },
};
