import _ from "lodash";
import { Binary } from "mongodb";

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
    // the driver only leaves a Long when it doesn't fit in a number
    case "Long":
      return value.toString();
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
