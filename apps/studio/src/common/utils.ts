// Copyright (c) 2015 The SQLECTRON Team

import { Error as CustomError } from '../lib/errors'
import _ from 'lodash';
import { format } from 'sql-formatter';
import { TableFilter, TableOrView, Routine } from '@/lib/db/models';
import { SettingsPlugin } from '@/plugins/SettingsPlugin';
import { IndexColumn } from '@shared/lib/dialects/models';
import type { Stream } from 'stream';

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
      const value = rangeData[i][key];
      transformedRangeData[i][key] =
        value && typeof value === "object" ? JSON.stringify(value) : value;
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
