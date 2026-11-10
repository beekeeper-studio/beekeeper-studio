import _ from "lodash";
import { BksField, BksFieldType } from "../models";
import rawLog from "@bksLogger";
import type { DuckDBBlobValue } from "@duckdb/node-api";
import { loadDuckDB } from "@shared/lib/knex-duckdb/loadDuckDB";
import { ObjectId } from "mongodb";

const log = rawLog.scope("transcoders");

export interface Transcoder<T, U> {
  serialize(value: T): U;
  deserialize(value: U, field?: BksField): T;
  serializeCheckByField(field: BksField): boolean;
  deserializeCheckByValue(value: unknown): value is U;
  deserializeCheckByField?(field: BksField, value: unknown): value is U
}

// Factory for simple transcoders, string => basic type based purely on BksFieldType
function primitiveTranscoder<T>(
  type: BksFieldType,
  parse: (value: string) => T | undefined
): Transcoder<T, string> {
  return {
    serialize(value) {
      return value as unknown as string;
    },
    deserialize(value) {
      const parsed = parse(value);
      return parsed === undefined ? value as unknown as T : parsed;
    },
    serializeCheckByField(_field): boolean {
      return false;
    },
    deserializeCheckByValue(_value): _value is string {
      return false;
    },
    deserializeCheckByField(field, value): value is string {
      return field.bksType === type && _.isString(value);
    },
  };
}

export const NUMERIC_REGEX = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const INTEGER_REGEX = /^[+-]?\d+$/;

function parseInteger(value: string): number | bigint | undefined {
  const trimmed = value.trim();
  if (!INTEGER_REGEX.test(trimmed)) return undefined;
  const num = Number(trimmed);
  return Number.isSafeInteger(num) ? num : BigInt(trimmed);
}

function parseFloatValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (!NUMERIC_REGEX.test(trimmed)) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

export const IntegerTranscoder = primitiveTranscoder('INTEGER', parseInteger);
export const FloatTranscoder = primitiveTranscoder('FLOAT', parseFloatValue);
export const NumberTranscoder = primitiveTranscoder('NUMBER', (value) =>
  INTEGER_REGEX.test(value.trim()) ? parseInteger(value) : parseFloatValue(value)
);
export const BooleanTranscoder = primitiveTranscoder('BOOLEAN', (value) => {
  const lower = value.trim().toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return undefined;
});

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
    const blob = new (loadDuckDB().DuckDBBlobValue)(value);
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
