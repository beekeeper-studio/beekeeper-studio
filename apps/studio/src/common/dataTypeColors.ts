import { isDateDataType, isNumericDataType, normalizeDataType } from '@/common/utils'

export type DataTypeColorFamily = 'text' | 'number' | 'dateTime' | 'boolean' | 'binary' | 'other'

export type DataTypeColorPalette = Record<DataTypeColorFamily, string>

export interface DataTypeColorSettings {
  enabled: boolean
  light: DataTypeColorPalette
  dark: DataTypeColorPalette
}

const families: DataTypeColorFamily[] = ['text', 'number', 'dateTime', 'boolean', 'binary', 'other']

export const DEFAULT_DATA_TYPE_COLOR_SETTINGS: DataTypeColorSettings = {
  enabled: true,
  light: {
    text: '#15803D',
    number: '#1D4ED8',
    dateTime: '#7E22CE',
    boolean: '#C2410C',
    binary: '#BE123C',
    other: '#475569',
  },
  dark: {
    text: '#86EFAC',
    number: '#93C5FD',
    dateTime: '#D8B4FE',
    boolean: '#FDBA74',
    binary: '#FDA4AF',
    other: '#CBD5E1',
  },
}

function isColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

function normalizePalette(value: unknown, fallback: DataTypeColorPalette): DataTypeColorPalette {
  const palette = value && typeof value === 'object' ? value as Partial<DataTypeColorPalette> : {}
  return families.reduce((result, family) => {
    result[family] = isColor(palette[family]) ? palette[family] : fallback[family]
    return result
  }, {} as DataTypeColorPalette)
}

export function normalizeDataTypeColorSettings(value: unknown): DataTypeColorSettings {
  const settings = value && typeof value === 'object' ? value as Partial<DataTypeColorSettings> : {}
  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_DATA_TYPE_COLOR_SETTINGS.enabled,
    light: normalizePalette(settings.light, DEFAULT_DATA_TYPE_COLOR_SETTINGS.light),
    dark: normalizePalette(settings.dark, DEFAULT_DATA_TYPE_COLOR_SETTINGS.dark),
  }
}

export function dataTypeColorPalette(settings: DataTypeColorSettings, theme: string): DataTypeColorPalette {
  return theme === 'dark' || theme === 'solarized-dark' ? settings.dark : settings.light
}

export function dataTypeColorFamily(dataType?: string, value?: unknown): DataTypeColorFamily {
  if (dataType) {
    if (/^tinyint\s*\(\s*1\s*\)(?:\s|$)/i.test(dataType)) return 'boolean'
    const normalized = normalizeDataType(dataType)
    if (isDateDataType(normalized)) return 'dateTime'
    if (/^bool(ean)?\b/.test(normalized)) return 'boolean'
    if (isNumericDataType(normalized)) return 'number'
    if (/(binary|blob|bytea|\braw\b|image)/.test(normalized)) return 'binary'
    if (/(char|text|string|clob|citext|enum|set)/.test(normalized)) return 'text'
    return 'other'
  }

  if (typeof value === 'number' || typeof value === 'bigint') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'dateTime'
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'binary'
  if (typeof value === 'string') return 'text'
  return 'other'
}
