import { NumberValue } from '@aws-sdk/lib-dynamodb';

const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function parseJson(text: string, typeLabel: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`"${text}" is not valid JSON for a ${typeLabel} value`);
  }
}

function toNumber(text: string): NumberValue {
  const trimmed = text.trim();
  if (!NUMBER_RE.test(trimmed)) {
    throw new Error(`"${text}" is not a valid Number`);
  }
  // NumberValue keeps the exact decimal string, so large or high-precision
  // numbers are not rounded through a JS float on their way to DynamoDB.
  return new NumberValue(trimmed);
}

function parseArray(text: string, typeLabel: string): unknown[] {
  const parsed = parseJson(text, typeLabel);
  if (!Array.isArray(parsed)) {
    throw new Error(`${typeLabel} values must be a JSON array`);
  }
  return parsed;
}

/**
 * The table editor hands every edited cell to the client as text. DynamoDB is
 * typed per attribute, so a string written as-is would be stored as `S` even if
 * the attribute is a Number or a Map. This converts the text back into the value
 * the column's type calls for, using the labels from `DYNAMO_TYPE_LABELS`.
 *
 * Only strings are converted: anything that is already a number, object, etc.
 * passes through untouched, as do String, Binary and unknown column types.
 */
export function coerceDynamoValue(value: unknown, typeLabel?: string | null): unknown {
  if (typeof value !== 'string' || !typeLabel) return value;

  switch (typeLabel) {
    case 'Number':
      return value.trim() === '' ? null : toNumber(value);
    case 'Boolean': {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      throw new Error(`"${value}" is not a valid Boolean (use true or false)`);
    }
    case 'Null':
      return null;
    case 'Map': {
      if (value.trim() === '') return null;
      const parsed = parseJson(value, 'Map');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Map values must be a JSON object');
      }
      return parsed;
    }
    case 'List':
      return value.trim() === '' ? null : parseArray(value, 'List');
    case 'String Set':
      return value.trim() === '' ? null : new Set(parseArray(value, 'String Set').map(String));
    case 'Number Set':
      return value.trim() === ''
        ? null
        : new Set(parseArray(value, 'Number Set').map((n) => toNumber(String(n))));
    default:
      return value;
  }
}
