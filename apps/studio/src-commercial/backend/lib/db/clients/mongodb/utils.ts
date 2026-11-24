import _ from "lodash";

/**
 * Replace every ObjectId in a value, at any depth, with its hex string.
 *
 * An ObjectId loses its class when it's sent to the renderer, so it shows up
 * (and gets downloaded or exported) as {"buffer": {...}}. Checks _bsontype
 * rather than instanceof so ObjectIds from another bson copy are caught too.
 */
export function objectIdsToHex(value: any): any {
  if (value?._bsontype === "ObjectId") return value.toHexString();
  if (_.isArray(value)) return value.map(objectIdsToHex);
  if (_.isPlainObject(value)) return _.mapValues(value, objectIdsToHex);
  return value;
}
