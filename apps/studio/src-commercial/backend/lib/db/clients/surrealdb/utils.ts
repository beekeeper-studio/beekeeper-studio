import { DateTime, Decimal, Duration, Geometry, RecordId, Uuid } from "surrealdb";
import _ from "lodash";
import { BksFieldType } from "@/lib/db/models";

export function kindToBksType(kind: string): BksFieldType {
  // Remove the option<> wrapper
  const unwrapped = kind?.trim().replace(/^option<(.*)>$/, '$1') ?? '';
  // Extract the base type, ignoring generic args and any `none` union members
  const match = unwrapped.match(/^(?:none\s*\|\s*)*(\w+)\s*(?:\|\s*none\s*)*(?:<|$)/);
  if (!match) return 'UNKNOWN';
  const base = match[1];

  switch (base) {
    case 'record': return 'SURREALID';
    case 'string': return 'STRING';
    case 'number': return 'NUMBER';
    case 'int': return 'INTEGER';
    case 'float': return 'FLOAT';
    case 'decimal': return 'DECIMAL';
    case 'bool': return 'BOOLEAN';
    case 'datetime': return 'DATETIME';
    case 'duration': return 'DURATION';
    case 'uuid': return 'UUID';
    case 'object': return 'OBJECT';
    case 'array':
    case 'set':
      return 'ARRAY';
    case 'geometry': return 'GEOMETRY';
    default: return 'UNKNOWN';
  }
}

// Guess types for schemaless tables
export function valueToKind(value: unknown, table: string): string | null {
  if (value == null) return null;
  if (value instanceof RecordId) {
    return value.table.name === table ? 'string' : `record<${value.table.name}>`;
  }
  if (value instanceof Decimal) return 'decimal';
  if (value instanceof DateTime || value instanceof Date) return 'datetime';
  if (value instanceof Duration) return 'duration';
  if (value instanceof Uuid) return 'uuid';
  if (value instanceof Geometry) return 'geometry';
  if (_.isString(value)) return 'string';
  // A sample can't tell int from float, so stay general
  if (_.isNumber(value) || typeof value === 'bigint') return 'number';
  if (_.isBoolean(value)) return 'bool';
  if (_.isArray(value)) return 'array';
  if (value instanceof Set) return 'set';
  if (_.isPlainObject(value)) return 'object';
  return 'any';
}
