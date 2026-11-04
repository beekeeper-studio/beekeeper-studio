import { DateTime, Decimal, Duration, Geometry, jsonify, RecordId, StringRecordId, Uuid } from "surrealdb";
import { NUMERIC_REGEX, Transcoder } from "./transcoders";
import rawLog from "@bksLogger";
import { BksFieldType } from "../models";
import _ from "lodash";
import { RECORD_ID_REGEX } from "@/shared/lib/dialects/surrealdb";

const log = rawLog.scope("transcoders");

export const SurrealDBRecordTranscoder: Transcoder<RecordId | StringRecordId, string> = {
  serialize(value) {
    if (value instanceof RecordId || value instanceof StringRecordId) {
      return value.toString();
    }
    if (value != null) {
      log.warn("SurrealDBRecordTranscoder: cannot serialize non-recordid value");
    }
    return value as unknown as string;
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
  },
  deserializeCheckByField(field, value): value is string {
    return field.bksType === 'SURREALID' && _.isString(value) && RECORD_ID_REGEX.test(value);;
  },
}

// For Surreal types that have a specific constructor we can test against
function surrealValueTranscoder<T extends { toString(): string }>(
  type: BksFieldType,
  Ctor: new (input: string) => T,
  isValid: (value: string) => boolean = () => true
): Transcoder<T, string> {
  return {
    serialize(value) {
      if (value instanceof Ctor) return value.toString();
      return value as unknown as string;
    },
    deserialize(value) {
      if (!isValid(value)) return value as unknown as T;
      try {
        return new Ctor(value);
      } catch {
        return value as unknown as T;
      }
    },
    serializeCheckByField(field): boolean {
      return field.bksType === type;
    },
    deserializeCheckByValue(_value): _value is string {
      return false;
    },
    deserializeCheckByField(field, value): value is string {
      return field.bksType === type && _.isString(value) && value !== '';
    },
  };
}

export const SurrealDBDecimalTranscoder = surrealValueTranscoder('DECIMAL', Decimal, (v) => NUMERIC_REGEX.test(v.trim()));
export const SurrealDBDateTimeTranscoder = surrealValueTranscoder('DATETIME', DateTime);
export const SurrealDBDurationTranscoder = surrealValueTranscoder('DURATION', Duration);
export const SurrealDBUuidTranscoder = surrealValueTranscoder('UUID', Uuid);


export const SurrealDBJsonTranscoder: Transcoder<unknown, unknown> = {
  serialize(value) {
    return jsonify(value);
  },
  deserialize(value) {
    if (!_.isString(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return _.isObject(parsed) ? parsed : value;
    } catch {
      return value;
    }
  },
  serializeCheckByField(field): boolean {
    return field.bksType === 'OBJECT' || field.bksType === 'ARRAY';
  },
  deserializeCheckByValue(_value): _value is unknown {
    return false;
  },
  deserializeCheckByField(field, value): value is unknown {
    return (field.bksType === 'OBJECT' || field.bksType === 'ARRAY') && _.isString(value);
  },
}

type GeoJson = ReturnType<Geometry['toJSON']>;

export const SurrealDBGeometryTranscoder: Transcoder<Geometry, GeoJson> = {
  serialize(value) {
    if (value instanceof Geometry) return value.toJSON();
    return value as unknown as GeoJson;
  },
  deserialize(value) {
    try {
      const json = _.isString(value) ? JSON.parse(value) : value;
      if (!_.isPlainObject(json) || !_.isString(json.type)) return value as unknown as Geometry;
      const geometry = Geometry.fromJSON(json);
      return geometry instanceof Geometry ? geometry : value as unknown as Geometry;
    } catch {
      return value as unknown as Geometry;
    }
  },
  serializeCheckByField(field): boolean {
    return field.bksType === 'GEOMETRY';
  },
  deserializeCheckByValue(_value): _value is GeoJson {
    return false;
  },
  deserializeCheckByField(field, value): value is GeoJson {
    return field.bksType === 'GEOMETRY' && (_.isString(value) || _.isPlainObject(value));
  },
}
