import { isDateDataType, isNumericDataType, normalizeDataType } from '@/common/utils'
import { BksFieldType } from './models'

export function inferBksFieldType(dataType?: string): BksFieldType {
  if (!dataType) {
    return 'UNKNOWN'
  }

  if (/^tinyint\s*\(\s*1\s*\)(?:\s|$)/i.test(dataType)) {
    return 'BOOLEAN'
  }

  const normalized = normalizeDataType(dataType)

  if (isDateDataType(normalized)) {
    return 'DATETIME'
  }
  if (/^bool(ean)?\b/.test(normalized)) {
    return 'BOOLEAN'
  }
  // oracle's NUMBER/BINARY_FLOAT and clickhouse's UInt* are not in the shared numeric list
  if (isNumericDataType(normalized) || /^(number|uint|binary_float|binary_double)/.test(normalized)) {
    return 'NUMBER'
  }
  if (/(binary|blob|bytea|bytes|\braw\b|image)/.test(normalized)) {
    return 'BINARY'
  }
  if (/(char|text|string|clob|citext|enum|set)/.test(normalized)) {
    return 'STRING'
  }

  return 'UNKNOWN'
}

export function bksTypeForValue(value: unknown): BksFieldType {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return 'NUMBER'
  }
  if (typeof value === 'boolean') {
    return 'BOOLEAN'
  }
  if (value instanceof Date) {
    return 'DATETIME'
  }
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return 'BINARY'
  }
  if (typeof value === 'string') {
    return 'STRING'
  }
  return 'UNKNOWN'
}
