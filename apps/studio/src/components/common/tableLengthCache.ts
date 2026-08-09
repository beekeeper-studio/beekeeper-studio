export type RecordCountCacheEntry = {
  totalRecords: number | string | null,
  error: Error | null,
}

const recordCountCache = new Map<string, RecordCountCacheEntry>()

export function buildRecordCountCacheKey(
  table: { name: string, schema?: string } | null | undefined,
  filters: unknown,
) {
  if (!table) return null
  const tablePart = `${table.schema ?? ''}:${table.name}`
  const filtersPart = JSON.stringify(filters ?? null)
  return `${tablePart}:${filtersPart}`
}

export function getCachedRecordCount(cacheKey: string) {
  return recordCountCache.get(cacheKey)
}

export function setCachedRecordCount(cacheKey: string, entry: RecordCountCacheEntry) {
  recordCountCache.set(cacheKey, entry)
}

export function clearRecordCountCache() {
  recordCountCache.clear()
}
