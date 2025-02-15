import _ from "lodash";
import { BksField } from "../models";
import rawLog from "@bksLogger";
import { DuckDBBlobValue } from "@duckdb/node-api";
import { ObjectId } from "mongodb";

const log = rawLog.scope("transcoders");

export interface Transcoder<T, U> {
  serialize(value: T): U;
  deserialize(value: U): T;
  serializeCheckByField(field: BksField): boolean;
  deserializeCheckByValue(value: unknown): value is U;
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
