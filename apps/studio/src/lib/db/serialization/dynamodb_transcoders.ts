import { NumberValue } from "@aws-sdk/lib-dynamodb";
import { BksField, BksFieldType } from "../models";
import { NUMERIC_REGEX, Transcoder } from "./transcoders";
import _ from "lodash";

export interface DynamoBksField extends BksField {
  dynamoType?: string;
}

export function dynamoCodeToBksType(code: string | undefined | null): BksFieldType {
  switch (code) {
    case 'N':
      return 'NUMBER';
    case 'BOOL':
      return 'BOOLEAN';
    case 'M':
      return 'OBJECT';
    case 'L':
    case 'SS':
    case 'NS':
    case 'BS':
      return 'ARRAY';
    case 'B':
      return 'BINARY';
    case 'S':
      return 'STRING';
    default:
      return 'UNKNOWN';
  }
}

export const DynamoDBNumberTranscoder: Transcoder<NumberValue | null, string> = {
  serialize(value) {
    if (value instanceof NumberValue) return value.toString();
    return value as unknown as string;
  },
  deserialize(value) {
    if (typeof value !== 'string') return value as any;
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (!NUMERIC_REGEX.test(trimmed)) {
      throw new Error(`"${value}" is not a valid Number`);
    }
    return new NumberValue(trimmed);
  },
  serializeCheckByField(_field): boolean {
    return false;
  },
  deserializeCheckByValue(_value): _value is string {
    return false;
  },
  deserializeCheckByField(field, value): value is string {
    return (field.bksType === 'NUMBER' || (field as DynamoBksField).dynamoType === 'N') && typeof value === 'string';
  },
};

export const DynamoDBBooleanTranscoder: Transcoder<boolean | null, string> = {
  serialize(value) {
    return value ? 'true' : 'false';
  },
  deserialize(value) {
    if (typeof value !== 'string') return value as any;
    const lower = value.trim().toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === '') return null;
    throw new Error(`"${value}" is not a valid Boolean (use true or false)`);
  },
  serializeCheckByField(_field): boolean {
    return false;
  },
  deserializeCheckByValue(_value): _value is string {
    return false;
  },
  deserializeCheckByField(field, value): value is string {
    return (field.bksType === 'BOOLEAN' || (field as DynamoBksField).dynamoType === 'BOOL') && typeof value === 'string';
  },
};

export const DynamoDBJsonTranscoder: Transcoder<unknown, string> = {
  serialize(value) {
    if (value instanceof Set) return JSON.stringify(Array.from(value));
    return JSON.stringify(value);
  },
  deserialize(value, field) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (trimmed === '') return null;

    let parsed: unknown;
    const dynamoType = (field as DynamoBksField)?.dynamoType;
    const isMap = field?.bksType === 'OBJECT' || dynamoType === 'M';
    const typeLabel = isMap ? 'Map' : dynamoType === 'SS' ? 'String Set' : dynamoType === 'NS' ? 'Number Set' : 'List';

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error(`"${value}" is not valid JSON for a ${typeLabel} value`);
    }

    if (isMap) {
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Map values must be a JSON object');
      }
      return parsed;
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`${typeLabel} values must be a JSON array`);
    }

    if (dynamoType === 'SS') {
      return new Set(parsed.map(String));
    }

    if (dynamoType === 'NS') {
      return new Set(
        parsed.map((item) => {
          const s = String(item).trim();
          if (!NUMERIC_REGEX.test(s)) {
            throw new Error(`"${item}" is not a valid Number`);
          }
          return new NumberValue(s);
        })
      );
    }

    return parsed;
  },
  serializeCheckByField(_field): boolean {
    return false;
  },
  deserializeCheckByValue(_value): _value is string {
    return false;
  },
  deserializeCheckByField(field, value): value is string {
    const dt = (field as DynamoBksField)?.dynamoType;
    return (
      (field.bksType === 'OBJECT' || field.bksType === 'ARRAY' || dt === 'M' || dt === 'L' || dt === 'SS' || dt === 'NS') &&
      typeof value === 'string'
    );
  },
};

export const DynamoDBNullTranscoder: Transcoder<null, string> = {
  serialize(_value) {
    return 'null';
  },
  deserialize(_value) {
    return null;
  },
  serializeCheckByField(_field): boolean {
    return false;
  },
  deserializeCheckByValue(_value): _value is string {
    return false;
  },
  deserializeCheckByField(field, value): value is string {
    return (field as DynamoBksField)?.dynamoType === 'NULL' && typeof value === 'string';
  },
};
