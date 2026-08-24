import { isDateDataType, isNumericDataType, normalizeDataType } from '@/common/utils'

export type DataTypeColorFamily = 'string' | 'number' | 'dateTime' | 'boolean' | 'binary' | 'other'

export function getDataTypeColorFamily(dataType?: string, value?: unknown): DataTypeColorFamily {
  if (dataType) {
    if (/^tinyint\s*\(\s*1\s*\)(?:\s|$)/i.test(dataType)) return 'boolean'
    const normalized = normalizeDataType(dataType)
    if (isDateDataType(normalized)) return 'dateTime'
    if (/^bool(ean)?\b/.test(normalized)) return 'boolean'
    if (isNumericDataType(normalized)) return 'number'
    if (/(binary|blob|bytea|\braw\b|image)/.test(normalized)) return 'binary'
    if (/(char|text|string|clob|citext|enum|set)/.test(normalized)) return 'string'
    return 'other'
  }

  if (typeof value === 'number' || typeof value === 'bigint') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'dateTime'
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'binary'
  if (typeof value === 'string') return 'string'
  return 'other'
}
