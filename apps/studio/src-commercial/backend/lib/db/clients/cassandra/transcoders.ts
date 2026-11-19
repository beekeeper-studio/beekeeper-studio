import * as cassandra from 'cassandra-driver';
import _ from 'lodash';
import { Transcoder } from '@/lib/db/serialization/transcoders';
import { BksFieldType } from '@/lib/db/models';
import { decimalToString, durationToString } from './valueConverter';

const { BigDecimal, Duration, Integer } = cassandra.types;

const DECIMAL_REGEX = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

// The formats Cassandra accepts for a duration literal. Units are case insensitive,
// the ISO 8601 letters are not.
const DURATION_REGEX = /^-?(?:(?:\d+(?:[yY]|[mM][oO]|[wW]|[dD]|[hH]|[mM][sS]|[uU][sS]|µ[sS]|[nN][sS]|[mM]|[sS]))+|P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?|P\d+W|P\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$/;

const MAX_SCALE = 2 ** 31 - 1;

/**
 * BigDecimal.fromString() ignores an exponent, so "1.5E+4" is stored as 0.0015.
 */
export function parseDecimal(text: string): cassandra.types.BigDecimal | undefined {
  const match = DECIMAL_REGEX.exec(text.trim());
  if (!match) return undefined;
  const [, sign, whole = '', fraction = '', exponent = '0'] = match;
  if (!whole && !fraction) return undefined;
  const scale = fraction.length - Number(exponent);
  if (Math.abs(scale) > MAX_SCALE) return undefined;
  const unscaled = Integer.fromString(`${sign === '-' ? '-' : ''}${whole}${fraction}`);
  // Same layout as the decimal wire format: a 32 bit scale, then the unscaled value
  const scaleBuffer = Buffer.alloc(4);
  scaleBuffer.writeInt32BE(scale);
  return BigDecimal.fromBuffer(Buffer.concat([scaleBuffer, Integer.toBuffer(unscaled)]));
}

/**
 * Duration.fromString() returns an empty duration for text it doesn't understand,
 * so only hand it something Cassandra would accept.
 */
export function parseDuration(text: string): cassandra.types.Duration | undefined {
  const trimmed = text.trim();
  return DURATION_REGEX.test(trimmed) ? Duration.fromString(trimmed) : undefined;
}

function cassandraTranscoder<T>(
  type: BksFieldType,
  Ctor: new (...args: any[]) => T,
  toText: (value: T) => string,
  parse: (text: string) => T | undefined
): Transcoder<T, string> {
  return {
    serialize(value) {
      return value instanceof Ctor ? toText(value) : value as unknown as string;
    },
    deserialize(value) {
      // an empty cell is saved as null
      if (!value.trim()) return value as unknown as T;
      const parsed = parse(value);
      if (parsed === undefined) {
        // the driver would store something else rather than reject it
        throw new Error(`Invalid ${type.toLowerCase()} value: ${value}`);
      }
      return parsed;
    },
    serializeCheckByField(field): boolean {
      return field.bksType === type;
    },
    deserializeCheckByValue(_value): _value is string {
      return false;
    },
    deserializeCheckByField(field, value): value is string {
      return field.bksType === type && _.isString(value);
    },
  };
}

export const CassandraDecimalTranscoder = cassandraTranscoder('DECIMAL', BigDecimal, decimalToString, parseDecimal);
export const CassandraDurationTranscoder = cassandraTranscoder('DURATION', Duration, durationToString, parseDuration);

export function columnTypeToBksType(type: string): BksFieldType {
  if (type === 'decimal') return 'DECIMAL';
  if (type === 'duration') return 'DURATION';
  return type.includes('blob') ? 'BINARY' : 'UNKNOWN';
}
