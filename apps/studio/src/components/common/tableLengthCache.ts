export type RecordCountCacheEntry = {
  totalRecords: number | string | null,
  error: Error | null,
}

const recordCountCache = new Map<string, RecordCountCacheEntry>()

export function buildRecordCountCacheKey(
  tableId: string | null | undefined,
  filters: unknown,
) {
  if (!tableId) return null
  const filtersPart = JSON.stringify(filters ?? null)
  return `${tableId}:${filtersPart}`
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
