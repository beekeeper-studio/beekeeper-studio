import _ from "lodash";
import { Binary, Code, DBRef, Decimal128, Double, Int32, Long, MaxKey, MinKey, ObjectId, Timestamp, UUID } from "mongodb";

/**
 * Replace every BSON value the driver leaves as a class instance, at any depth,
 * with a plain value the renderer can show and export.
 *
 * These lose their class when they're sent to the renderer, so a Decimal128
 * shows up (and gets downloaded or exported) as {"bytes": {...}}, an ObjectId as
 * {"buffer": {...}} and so on. Checks _bsontype rather than instanceof so values
 * from another bson copy are caught too.
 */
export function bsonValuesToPlain(value: any): any {
  switch (value?._bsontype) {
    case "ObjectId":
      return value.toHexString();
    case "Decimal128":
      return value.toString();
    case "Long":
      return value.lessThanOrEqual(Number.MAX_SAFE_INTEGER) && value.greaterThanOrEqual(Number.MIN_SAFE_INTEGER)
        ? value.toNumber()
        : value.toString();
    case "Int32":
    case "Double":
      return value.valueOf();
    case "Timestamp":
      return { t: value.t, i: value.i };
    case "Binary":
      // toUUID() throws for a subtype 4 value that isn't 16 bytes long
      return value.sub_type === Binary.SUBTYPE_UUID && value.position === 16
        ? value.toUUID().toString()
        : value.toString("base64");
    case "DBRef":
      return {
        $ref: value.collection,
        $id: bsonValuesToPlain(value.oid),
        ...(value.db ? { $db: value.db } : {}),
        ...bsonValuesToPlain(value.fields),
      };
    case "Code":
      return value.scope ? { code: value.code, scope: bsonValuesToPlain(value.scope) } : value.code;
    case "MinKey":
    case "MaxKey":
      return value._bsontype;
  }
  if (_.isRegExp(value)) return value.toString();
  if (_.isArray(value)) return value.map(bsonValuesToPlain);
  if (_.isPlainObject(value)) return _.mapValues(value, bsonValuesToPlain);
  return value;
}

const INTEGER = /^[+-]?\d+$/;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const HEX_UUID = /^[0-9a-f]{32}$/i;
const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
// bson only stores these flags for a JS RegExp, others would be dropped silently
const REGEX_TEXT = /^\/(.*)\/([gim]*)$/s;
const LONG_MAX = BigInt("9223372036854775807");

function bsonTypeOf(value: any): string | undefined {
  if (value?._bsontype) return value._bsontype;
  if (_.isDate(value)) return "Date";
  if (_.isRegExp(value)) return "RegExp";
  return undefined;
}

function invalid(type: string, value: any): never {
  throw new Error(`Invalid ${type} value: ${_.isString(value) ? value : JSON.stringify(value)}`);
}

function parseDate(text: string): Date | undefined {
  const match = ISO_DATE.exec(text);
  if (!match) return undefined;
  // new Date() rolls an invalid day over, 2024-02-30 becomes 1 March
  const [, year, month, day] = match.map(Number);
  const calendarDay = new Date(Date.UTC(year, month - 1, day));
  if (calendarDay.getUTCMonth() !== month - 1 || calendarDay.getUTCDate() !== day) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseAs(type: string, input: string, original: any): any {
  const text = input.trim();
  switch (type) {
    case "ObjectId":
      return /^[0-9a-f]{24}$/i.test(text) ? new ObjectId(text) : undefined;
    case "Decimal128":
      try {
        return Decimal128.fromString(text);
      } catch {
        return undefined;
      }
    case "Long":
      if (!INTEGER.test(text)) return undefined;
      return BigInt(text) <= LONG_MAX && BigInt(text) >= -LONG_MAX - BigInt(1) ? Long.fromString(text) : undefined;
    case "Int32":
      return INTEGER.test(text) && Number(text) === (Number(text) | 0) ? new Int32(Number(text)) : undefined;
    case "Double":
      return NUMBER.test(text) || ["NaN", "Infinity", "-Infinity"].includes(text) ? new Double(Number(text)) : undefined;
    case "Binary":
      // other binaries are shown as hex or base64 depending on where they're
      // edited, so text can't be read back safely
      if (original.sub_type !== Binary.SUBTYPE_UUID) {
        throw new Error("Binary values can't be edited as text");
      }
      return UUID_TEXT.test(text) || HEX_UUID.test(text) ? new UUID(text) : undefined;
    case "Code":
      return original.scope ? undefined : new Code(input);
    case "MinKey":
      return text === "MinKey" ? new MinKey() : undefined;
    case "MaxKey":
      return text === "MaxKey" ? new MaxKey() : undefined;
    case "Date":
      return parseDate(text);
    case "RegExp": {
      const match = REGEX_TEXT.exec(text);
      return match ? new RegExp(match[1], match[2]) : undefined;
    }
  }
  return undefined;
}

// the same value as it may come back from the grid, as text
function shownAs(original: any): string[] {
  if (original?._bsontype === "Binary") return [original.toString("hex"), original.toString("base64")];
  if (_.isDate(original)) return [original.toISOString()];
  return [];
}

/**
 * Undo bsonValuesToPlain for an edited value, using the value it replaces.
 *
 * The grid edits plain values, and sends objects and arrays back as JSON text,
 * so an edit comes back with a Decimal128 as a string, an ObjectId nested in an
 * object as hex and so on. Saving that as is would quietly change the stored
 * type. Anything left as it was gets its original value back, and edited text
 * is parsed as the original type, or rejected if it isn't valid for it.
 */
export function restoreBsonTypes(value: any, original: any): any {
  if (value == null || original == null) return value;
  const plain = bsonValuesToPlain(original);
  if (_.isEqual(value, plain) || shownAs(original).includes(value)) return original;

  if (_.isString(value) && (_.isPlainObject(plain) || _.isArray(plain))) {
    let parsed: any;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`Expected JSON for an object or array value, got: ${JSON.stringify(value)}`);
    }
    return restoreBsonTypes(parsed, original);
  }

  const type = bsonTypeOf(original);
  if (type && _.isString(value)) {
    return parseAs(type, value, original) ?? invalid(type, value);
  }
  if (type === "Timestamp") {
    if (!Number.isInteger(value?.t) || !Number.isInteger(value?.i)) invalid(type, value);
    return new Timestamp({ t: value.t, i: value.i });
  }
  if (type === "DBRef") {
    if (!_.isString(value?.$ref) || value.$id == null) invalid(type, value);
    const { $ref, $id, $db, ...fields } = value;
    return new DBRef($ref, restoreBsonTypes($id, original.oid), $db, restoreBsonTypes(fields, original.fields));
  }
  if (type === "Code" && _.isString(value?.code)) {
    return new Code(value.code, restoreBsonTypes(value.scope, original.scope) ?? undefined);
  }
  if (_.isNumber(value)) {
    if (type === "Decimal128") return parseAs(type, String(value), original) ?? invalid(type, value);
    if (type === "Long" && Number.isSafeInteger(value)) return Long.fromNumber(value);
    if (type === "Int32" && value === (value | 0)) return new Int32(value);
    if (type === "Double") return new Double(value);
  }
  // anything else would replace a BSON value with something of another type
  if (type) invalid(type, value);

  if (_.isArray(value) && _.isArray(original)) {
    // elements can be added, removed or moved, so match them by value first
    const plainItems = original.map(bsonValuesToPlain);
    const types = _.uniq(original.filter((o) => o != null).map(bsonTypeOf));
    return value.map((item, i) => {
      const same = plainItems.findIndex((p) => _.isEqual(p, item));
      if (same >= 0) return original[same];
      // an edited subdocument or array keeps the types of the one at the same place
      const atIndex = original[i];
      if ((_.isPlainObject(item) && _.isPlainObject(atIndex)) || (_.isArray(item) && _.isArray(atIndex))) {
        return restoreBsonTypes(item, atIndex);
      }
      // a new value in an array of one BSON type is read as that type
      return types.length === 1 && types[0] ? restoreBsonTypes(item, original.find((o) => o != null)) : item;
    });
  }
  if (_.isPlainObject(value) && _.isPlainObject(original)) {
    return _.mapValues(value, (item, key) => restoreBsonTypes(item, original[key]));
  }
  return value;
}
