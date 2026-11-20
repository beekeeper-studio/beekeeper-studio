import * as cassandra from 'cassandra-driver';
import { isIP } from 'net';
import _ from 'lodash';
import { INTEGER_REGEX, NUMERIC_REGEX } from '@/lib/db/serialization/transcoders';
import { editableColumnTypes, EditableColumnType } from '@shared/lib/dialects/cassandra';

const { BigDecimal, Duration, Integer, LocalDate, LocalTime, Long, TimeUuid, Uuid } = cassandra.types;

/**
 * The driver accepts text for most types but doesn't validate it: "1.5" goes into
 * an int as 1, "abc" into a bigint as 0, "false" into a boolean as true. So every
 * edited value is parsed here first, and anything that isn't valid is rejected.
 */

const DECIMAL_REGEX = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

// The formats Cassandra accepts for a duration literal. Units are case insensitive,
// the ISO 8601 letters are not.
const DURATION_REGEX = /^-?(?:(?:\d+(?:[yY]|[mM][oO]|[wW]|[dD]|[hH]|[mM][sS]|[uU][sS]|µ[sS]|[nN][sS]|[mM]|[sS]))+|P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?|P\d+W|P\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})$/;

const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
const DATE_REGEX = /^-?\d{4,}-\d{2}-\d{2}$/;
const TIME_REGEX = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_REGEX = /^0x(?:[0-9a-f]{2})*$/i;

const MAX_SCALE = 2 ** 31 - 1;

type Parser = (text: string) => unknown;

/**
 * BigDecimal.fromString() ignores an exponent, so "1.5E+4" is stored as 0.0015.
 */
export function parseDecimal(text: string): cassandra.types.BigDecimal | undefined {
  const match = DECIMAL_REGEX.exec(text);
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
 * Duration.fromString() returns an empty duration for text it doesn't understand.
 */
export function parseDuration(text: string): cassandra.types.Duration | undefined {
  return DURATION_REGEX.test(text) ? Duration.fromString(text) : undefined;
}

function integer(bits: number): Parser {
  const max = BigInt(2) ** BigInt(bits - 1);
  return (text) => {
    if (!INTEGER_REGEX.test(text)) return undefined;
    const value = BigInt(text);
    if (value < -max || value >= max) return undefined;
    return bits === 64 ? Long.fromString(value.toString()) : Number(value);
  };
}

function floatingPoint(single: boolean): Parser {
  return (text) => {
    if (['NaN', 'Infinity', '-Infinity'].includes(text)) return Number(text);
    if (!NUMERIC_REGEX.test(text)) return undefined;
    const value = Number(text);
    const stored = single ? Math.fround(value) : value;
    return Number.isFinite(stored) ? value : undefined;
  };
}

function parseTimestamp(text: string) {
  if (!TIMESTAMP_REGEX.test(text)) return undefined;
  // Date rolls an invalid day over as well
  const [year, month, day] = text.slice(0, 10).split('-').map(Number);
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  if (calendarDay.getUTCMonth() !== month - 1 || calendarDay.getUTCDate() !== day) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDate(text: string) {
  if (!DATE_REGEX.test(text)) return undefined;
  const date = LocalDate.fromString(text);
  // LocalDate rolls an invalid day over, 2026-02-30 becomes 2026-03-02
  return date.toString() === text ? date : undefined;
}

function parseTime(text: string) {
  const match = TIME_REGEX.exec(text);
  if (!match) return undefined;
  const [, hours, minutes, seconds = '0'] = match;
  if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return undefined;
  return LocalTime.fromString(text);
}

const parsers: Record<EditableColumnType, Parser> = {
  ascii: (text) => (/^[\x00-\x7F]*$/.test(text) ? text : undefined),
  text: (text) => text,
  varchar: (text) => text,
  tinyint: integer(8),
  smallint: integer(16),
  int: integer(32),
  bigint: integer(64),
  varint: (text) => (INTEGER_REGEX.test(text) ? Integer.fromString(text) : undefined),
  float: floatingPoint(true),
  double: floatingPoint(false),
  decimal: parseDecimal,
  duration: parseDuration,
  boolean: (text) => ({ true: true, false: false })[text.toLowerCase()],
  timestamp: parseTimestamp,
  date: parseDate,
  time: parseTime,
  uuid: (text) => (UUID_REGEX.test(text) ? Uuid.fromString(text) : undefined),
  timeuuid: (text) => (UUID_REGEX.test(text) && text[14] === '1' ? TimeUuid.fromString(text) : undefined),
  inet: (text) => (isIP(text) ? text : undefined),
  blob: (text) => (HEX_REGEX.test(text) ? Buffer.from(text.slice(2), 'hex') : undefined),
};

function isEditable(type: string): type is EditableColumnType {
  return (editableColumnTypes as readonly string[]).includes(type);
}

const isTextType = (type: EditableColumnType) => ['ascii', 'text', 'varchar'].includes(type);

/**
 * Turn a value from the table view into what the driver should write for a column
 * of this CQL type. Throws if the type can't be edited or the value isn't valid.
 */
export function parseEditedValue(value: unknown, type: string): unknown {
  if (value == null) return value;
  if (!isEditable(type)) {
    throw new Error(`Editing ${type} columns is not supported`);
  }

  if (type === 'blob' && value instanceof Uint8Array) return Buffer.from(value);
  if (type === 'boolean' && _.isBoolean(value)) return value;
  if (type === 'timestamp' && value instanceof Date) return value;

  const text = _.isNumber(value) || _.isBoolean(value) ? String(value) : value;
  if (!_.isString(text)) {
    throw new Error(`Invalid ${type} value: ${String(value)}`);
  }
  if (isTextType(type)) {
    const parsed = parsers[type](text);
    if (parsed === undefined) throw new Error(`Invalid ${type} value: ${text}`);
    return parsed;
  }

  // an emptied cell means NULL for anything that isn't text
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parsed = parsers[type](trimmed);
  if (parsed === undefined) {
    throw new Error(`Invalid ${type} value: ${text}`);
  }
  return parsed;
}

/**
 * Cloning a row copies collections and UDTs as they were read, so those go through
 * as before. Text can't be trusted for them: the driver turns "ab" into {"0":"a","1":"b"}
 * for a map.
 */
export function parseInsertedValue(value: unknown, type: string): unknown {
  if (!isEditable(type) && (Array.isArray(value) || _.isPlainObject(value))) return value;
  return parseEditedValue(value, type);
}

/**
 * Key values only pick the row, so a type that can't be edited is passed through
 * as before rather than blocking the change.
 */
export function parseKeyValue(value: unknown, type: string): unknown {
  return isEditable(type) ? parseEditedValue(value, type) : value;
}
