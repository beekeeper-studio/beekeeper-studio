// Copyright (c) 2015 The SQLECTRON Team

import { Error as CustomError } from '../lib/errors'
import _ from 'lodash';
import { format } from 'sql-formatter';
import { TableFilter, TableOrView, Routine, TableColumn } from '@/lib/db/models';
import { SettingsPlugin } from '@/plugins/SettingsPlugin';
import { IndexColumn } from '@shared/lib/dialects/models';
import type { Stream } from 'stream';

export function camelCaseObjectKeys(data) {
  if (_.isPlainObject(data)) {
    const result = _.deepMapKeys(data, (_value, key) => _.camelCase(key))
    return result
  }
  return data
}

// I don't know why different, but don't want to edit.
export function snakeCaseObjectKeys(data) {
  const result = _.mapKeys(data, (_value, key) => {
    return _.snakeCase(key)
  })
  return result
}

export function parseIndexColumn(str: string): IndexColumn {
  str = str.trim()

  const order = str.endsWith('DESC') ? 'DESC' : 'ASC'
  const nameAndPrefix = str.replaceAll(' DESC', '').trimEnd()

  let name: string = nameAndPrefix
  let prefix: number | null = null

  const prefixMatch = nameAndPrefix.match(/\((\d+)\)$/)
  if (prefixMatch) {
    prefix = Number(prefixMatch[1])
    name = nameAndPrefix.slice(0, nameAndPrefix.length - prefixMatch[0].length).trimEnd()
  }

  return { name, order, prefix }
}

export function having<T, U>(item: T | undefined | null, f: (T) => U, errorOnNone?: string): U | null {
  if (item) return f(item)
  if (errorOnNone) throw new Error(errorOnNone)
  return null
}

export function readWebFile(file: File) {
  const reader = new FileReader()
  const result = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(reader.error)
    }
    reader.onabort = () => {
      reject(new Error('File reading aborted'))
    }
  })
  reader.readAsText(file)
  return {
    result,
    abort: reader.abort,
  }
}

export async function waitPromise(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}


export function createCancelablePromise(error: CustomError, timeIdle = 100): any {
  let canceled = false;
  let discarded = false;


  return {
    async wait() {
      while (!canceled && !discarded) {
        await waitPromise(timeIdle);
      }

      if (canceled) {
        const err = new Error(error.message || 'Promise canceled.');

        Object.getOwnPropertyNames(error)
          .forEach((key: string) => err[key] = error[key]); // eslint-disable-line no-return-assign

        throw err;
      }
    },
    cancel() {
      canceled = true;
    },
    discard() {
      discarded = true;
    },
    get canceled() {
      return canceled;
    }
  };
}

export function makeString(value: any): string {
  if(value === BigInt(0)) return '0';
  return _.toString(value);
}

export function safeSqlFormat(
  ...args: Parameters<typeof format>
): ReturnType<typeof format> {
  try {
    return format(args[0], args[1]);
  } catch (ex) {
    return args[0];
  }
}

/** Join filters by AND or OR */
export function joinFilters(filters: string[], ops: TableFilter[] = []): string {
  if (filters.length === 0) return ''
  return filters.reduce((a, b, idx) => `${a} ${ops[idx]?.op || 'AND'} ${b}`)
}

/** Get rid of invalid filters and parse if needed */
export function normalizeFilters(filters: TableFilter[]) {
  const normalized: TableFilter[] = [];
  for (const filter of filters as TableFilter[]) {
    if (!(filter.type && filter.field && (filter.value || filter.type.includes('is')))) continue;
    if (filter.type === "in") {
      const value = (filter.value as string).split(/\s*,\s*/);
      normalized.push({ ...filter, value });
    } else {
      normalized.push(filter);

      if (filter.type.includes('is')) {
        continue;
      }
    }
    filter.value = filter.value.toString();
  }
  return normalized;
}

/** Create an object for filter used in Row Filter Builder */
export function createTableFilter(field: string): TableFilter {
  return { op: "AND", field, type: "=", value: "" }
}

// isEmpty(1) returns true, we don't want that!
// https://stackoverflow.com/questions/36691125/lodash-isblank
export function isBlank(value) {
  return _.isEmpty(value) && !_.isNumber(value) || _.isNaN(value);
}

/** Check if an array of filters is considered empty */
export function checkEmptyFilters(filters: TableFilter[]): boolean {
  if (filters.length === 0) {
    return true
  }
  if (filters.length === 1) {
    return isBlank(filters[0].value)
  }
  return filters.every(filter => isBlank(filter.value));
}

/** Useful for identifying an entity item in table list */
export function entityId(schema: string, entity?: TableOrView | Routine) {
  if (entity) return `${entity.entityType}.${schema}.${entity.name}`;
  return `schema.${schema}`;
}

export function isFile(e: DragEvent) {
    const dt = e.dataTransfer;
    for (let i = 0; i < dt.types.length; i++) {
        if (dt.types[i] === "Files") {
            return true;
        }
    }
    return false;
}

export async function setLastExportPath(exportPath: string) {
  await SettingsPlugin.set('lastExportPath', exportPath)
}

// Stringify all the arrays and objects in range data
export function stringifyRangeData(rangeData: Record<string, any>[]) {
  const transformedRangeData:Record<string, any>[]  = [];

  for (let i = 0; i < rangeData.length; i++) {
    const keys = Object.keys(rangeData[i]);

    transformedRangeData[i] = {};

    for (const key of keys) {
      let value = rangeData[i][key];

      if (_.isTypedArray(value)) {
        value = typedArrayToString(value);
      } else if (value && typeof value === "object") {
        value = JSON.stringify(value);
      }

      transformedRangeData[i][key] = value
    }
  }

  return transformedRangeData;
}

export const rowHeaderField = '--row-header--bks';

export function isBksInternalColumn(field: string) {
  return field.endsWith('--bks')
    || field.startsWith('__beekeeper_internal')
    || field === rowHeaderField;
}

export function streamToString(stream: Stream): Promise<string> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export function streamToBuffer(stream: Stream): Promise<Buffer> {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/** Make `object.toString` look better :D */
export function friendlyJsonObject<T extends object>(obj: T): T {
  Object.defineProperties(obj, {
    [Symbol.toPrimitive]() {
      try {
        return stringifyWithBigInt(obj);
      } catch (ex) {
        console.warn('Error serializing object:', obj, ex);
        return "[object Object]"
      }
    },
  });

  if(!obj.hasOwnProperty("toString")){
    Object.defineProperties(obj, {
      toString: {
        value() {
          try {
            return stringifyWithBigInt(obj);
          } catch (ex) {
            console.warn('Error serializing object:', obj, ex);
            return "[object Object]"
          }
        },
        enumerable: false, // This tells js to not clone this property. Useful when we want to send this object to utility.
        }
      })
   }

  return obj;
}

export function stringifyWithBigInt(value: any): string {
  return JSON.stringify(
    value,
    (_key, val) => typeof val === 'bigint' ? `${val}n` : val
  );
}

/** Convert Typed Array (Array Buffer View) to string based on `binaryEncoding` */
export function typedArrayToString(typedArray: ArrayBufferView, forceEncoding?: 'hex' | 'base64') {
  const encoding = forceEncoding || window.bksConfig.ui.general.binaryEncoding
  if (encoding === 'base64') {
    // @ts-expect-error polyfill
    return typedArray.toBase64();
  } else {
    // @ts-expect-error polyfill
    return typedArray.toHex();
  }
}

export function stringToTypedArray(str: string, forceEncoding?: 'hex' | 'base64') {
  const encoding = forceEncoding || window.bksConfig.ui.general.binaryEncoding
  if (encoding === 'base64') {
    // @ts-expect-error polyfill
    return Uint8Array.fromBase64(str);
  } else {
    // @ts-expect-error polyfill
    return Uint8Array.fromHex(str);
  }
}

export function removeUnsortableColumnsFromSortBy(sortParms: { field: string; dir: string }[], tableColumns: TableColumn[], disallowedSortColumns = []) {
  return sortParms.reduce((acc, sortObj) => {
      const found = tableColumns.find(el => el.columnName.toLowerCase() === sortObj.field.toLowerCase())

      if (!found) return acc
      if (disallowedSortColumns.includes(found.dataType.toLowerCase())) return acc

      acc.push(sortObj)
      return acc
    }, [])
}

export function toRegexSafe(input: string) {
  const match = input.match(/^\/(.+)\/([a-z]*)$/);
  if (!match) return null;
  try {
    return new RegExp(match[1], match[2]);
  } catch (e) {
    return null;
  }
}
export function extractVariablesAndCleanQuery(query: string) {
  const variables: Record<string, string> = {};

  // Expression for valid lines: -- %var% = valor
  const linePattern = /^\s*--\s*%(.*?)%\s*=\s*(.+)$/gm;

  // Expression for invalid lines: -- %var% = (no value)
  const invalidLinePattern = /^\s*--\s*%(.*?)%\s*=\s*$/gm;
  const invalidMatch = query.match(invalidLinePattern);
  if (invalidMatch) {
    throw new Error(`Malformed variable: "${invalidMatch[0]}"`);
  }

  let match;
  while ((match = linePattern.exec(query)) !== null) {
    const [_, name, value] = match;
    if (!name || !value || value.trim() === '') {
      throw new Error(`Malformed variable: "${match[0]}"`);
    }
    variables[name] = value.trim();
  }

  // Variables inside blocks: /* VARS: ... */
  const blockPattern = /\/\*\s*VARS:(.*?)\*\//gs;
  let blockMatch;
  while ((blockMatch = blockPattern.exec(query)) !== null) {
    const blockContent = blockMatch[1];

    const varPattern = /%(.*?)%\s*=\s*(.*)/g;
    let varMatch;
    while ((varMatch = varPattern.exec(blockContent)) !== null) {
      const [_, name, value] = varMatch;
      if (!name || !value || value.trim() === '') {
        throw new Error(`Malformed variable: "${varMatch[0]}"`);
      }
      variables[name] = value.trim();
    }
  }

  // Remove variable definitions from the query
  const cleanedQuery = query
    .replace(linePattern, '')
    .replace(blockPattern, '')
    .trim();

  return { variables, cleanedQuery };
}

export function substituteVariables(query: string, variables: Record<string, string>): string {
  return substituteVariablesSafely(query, variables);
}

export function substituteVariablesSafely(query: string, variables: Record<string, string>): string {
  let result = '';
  let insideSingleQuote = false;
  let insideDoubleQuote = false;
  let i = 0;

  while (i < query.length) {
    const char = query[i];
    const nextChar = query[i + 1];

    // Handle escaping of single quotes
    if (char === "'" && nextChar === "'") {
      result += "''";
      i += 2;
      continue;
    }

    // Toggle quote flags
    if (!insideDoubleQuote && char === "'") {
      insideSingleQuote = !insideSingleQuote;
      result += char;
      i++;
      continue;
    }

    if (!insideSingleQuote && char === '"') {
      insideDoubleQuote = !insideDoubleQuote;
      result += char;
      i++;
      continue;
    }

    // Attempt to match variable pattern
    const variableMatch = query.slice(i).match(/^%(\w+)%/);
    if (!insideSingleQuote && !insideDoubleQuote && variableMatch) {
      const varName = variableMatch[1];
      const rawValue = variables[varName];
      if (rawValue === undefined) {
        // If variable is undefined, skip substitution
        result += `%${varName}%`;
        i += varName.length + 2;
        continue;
      }

      let value = rawValue.trim();
      let isJSON = false;

      try {
        const parsed = JSON.parse(value);
        isJSON = typeof parsed === 'object';
      } catch {
        // Not JSON
      }

      const isList = value.startsWith('(') && value.endsWith(')');
      const isQuoted = /^'.*'$/.test(value);
      const isNull = value.toLowerCase() === 'null';
      const isNumber = /^-?\d+(\.\d+)?$/.test(value); 

      if (!isJSON && !isList && !isQuoted && !isNull && !isNumber) {
        value = `'${value}'`;
      }

      result += value;
      i += varName.length + 2;
    } else {
      result += char;
      i++;
    }
  }

  return result;
}
