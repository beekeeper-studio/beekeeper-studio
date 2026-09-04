/**
 * Registry of the paid features the app gates behind a license, plus helpers
 * for the local record of which of them a user has actually tried.
 *
 * The usage record exists so the app can talk about the user's own trial
 * ("during your trial you used the JSON row viewer and editable results")
 * instead of a generic feature list. It is stored in the local user settings
 * table and is never sent anywhere.
 *
 * Feature ids are persisted, so treat them as an API: add new ones freely,
 * never rename or reuse an existing one.
 */

export type PaidFeatureId =
  | 'jsonViewer'
  | 'editableQueryResults'
  | 'importFromFile'
  | 'multiTableExport'
  | 'queryToFile'
  | 'advancedFilters'
  | 'folders'
  | 'cloudWorkspaces'
  | 'aiShell'
  | 'plugins'
  | 'backupRestore'
  | 'readOnlyMode'
  | 'premiumDatabase'

export interface PaidFeature {
  id: PaidFeatureId
  /** Short label, eg "JSON row viewer". */
  label: string
  /**
   * Names the upgrade modal is opened with for this feature, eg
   * `this.$root.$emit(AppEvent.upgradeModal, 'Import From File')`.
   * Compared case-insensitively.
   */
  aliases?: string[]
}

export const PAID_FEATURES: Record<PaidFeatureId, PaidFeature> = {
  jsonViewer: {
    id: 'jsonViewer',
    label: 'JSON row viewer',
    aliases: ['JSON Row Viewer', 'JSON row view'],
  },
  editableQueryResults: {
    id: 'editableQueryResults',
    label: 'Editable query results',
    aliases: ['Editable Query Results'],
  },
  importFromFile: {
    id: 'importFromFile',
    label: 'Import from file',
    aliases: ['Import From File'],
  },
  multiTableExport: {
    id: 'multiTableExport',
    label: 'Multi-table export',
    aliases: ['Multi-table Export', 'Multi-Table Export'],
  },
  queryToFile: {
    id: 'queryToFile',
    label: 'Query results to file',
    aliases: ['Query to File'],
  },
  advancedFilters: {
    id: 'advancedFilters',
    label: 'Unlimited table filters',
    aliases: ['Advanced Filters'],
  },
  folders: {
    id: 'folders',
    label: 'Connection and query folders',
    aliases: ['Folders'],
  },
  cloudWorkspaces: {
    id: 'cloudWorkspaces',
    label: 'Cloud workspaces',
    aliases: ['Cloud Workspaces'],
  },
  aiShell: {
    id: 'aiShell',
    label: 'AI shell',
    aliases: ['AI Shell', 'SQL AI shell'],
  },
  plugins: {
    id: 'plugins',
    label: 'Plugins',
  },
  backupRestore: {
    id: 'backupRestore',
    label: 'Database backup and restore',
    aliases: ['Database Backup', 'Database Restore', 'Backup', 'Restore'],
  },
  readOnlyMode: {
    id: 'readOnlyMode',
    label: 'Read-only mode',
    aliases: ['Read Only Mode'],
  },
  premiumDatabase: {
    id: 'premiumDatabase',
    label: 'Additional databases',
  },
}

/** Persisted per-feature record. */
export interface PaidFeatureUsageEntry {
  /** ISO timestamp of the first use. */
  firstUsedAt: string
  /** Optional qualifiers, eg the database engines connected to. */
  details?: string[]
}

export type PaidFeatureUsage = Partial<Record<PaidFeatureId, PaidFeatureUsageEntry>>

export interface UsedPaidFeature extends PaidFeature {
  firstUsedAt: Date
  details: string[]
  /** Label with the details folded in, eg "Oracle and MongoDB connections". */
  displayLabel: string
}

function isFeatureId(id: string): id is PaidFeatureId {
  return Object.prototype.hasOwnProperty.call(PAID_FEATURES, id)
}

/**
 * Parse whatever the settings table hands back (a JSON string, an already
 * parsed object, or nothing) into a clean usage map. Unknown ids and
 * malformed entries are dropped rather than thrown.
 */
export function parsePaidFeatureUsage(raw: unknown): PaidFeatureUsage {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    if (!raw.trim()) return {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

  const result: PaidFeatureUsage = {}
  for (const [id, entry] of Object.entries(parsed as Record<string, any>)) {
    if (!isFeatureId(id)) continue
    if (!entry || typeof entry !== 'object') continue
    const firstUsedAt = typeof entry.firstUsedAt === 'string' ? entry.firstUsedAt : null
    if (!firstUsedAt || Number.isNaN(new Date(firstUsedAt).getTime())) continue
    const details = Array.isArray(entry.details)
      ? entry.details.filter((d: unknown) => typeof d === 'string' && d.trim().length > 0)
      : []
    result[id] = details.length ? { firstUsedAt, details } : { firstUsedAt }
  }
  return result
}

/**
 * Record a use of `id`. Returns the new map and whether anything changed, so
 * callers can skip a write when the feature (and detail) was already known.
 */
export function recordPaidFeatureUsage(
  usage: PaidFeatureUsage,
  id: PaidFeatureId,
  detail?: string,
  now: Date = new Date()
): { usage: PaidFeatureUsage; changed: boolean } {
  const existing = usage[id]
  const cleanDetail = detail?.trim()

  if (existing && (!cleanDetail || existing.details?.includes(cleanDetail))) {
    return { usage, changed: false }
  }

  const entry: PaidFeatureUsageEntry = existing
    ? { ...existing, details: [...(existing.details ?? [])] }
    : { firstUsedAt: now.toISOString() }

  if (cleanDetail) {
    entry.details = [...(entry.details ?? []), cleanDetail]
  }

  return { usage: { ...usage, [id]: entry }, changed: true }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function displayLabel(feature: PaidFeature, details: string[]): string {
  if (feature.id === 'premiumDatabase' && details.length) {
    return `${joinNames(details)} ${details.length === 1 ? 'connection' : 'connections'}`
  }
  return feature.label
}

/** The features in `usage`, oldest first, ready for display. */
export function listUsedPaidFeatures(usage: PaidFeatureUsage): UsedPaidFeature[] {
  return Object.entries(usage)
    .map(([id, entry]) => {
      const feature = PAID_FEATURES[id as PaidFeatureId]
      const details = entry.details ?? []
      return {
        ...feature,
        firstUsedAt: new Date(entry.firstUsedAt),
        details,
        displayLabel: displayLabel(feature, details),
      }
    })
    .sort((a, b) => a.firstUsedAt.getTime() - b.firstUsedAt.getTime())
}

/**
 * Resolve the name the upgrade modal was opened with (eg "Import From File",
 * or a connection type name like "Oracle") to a feature id, or null.
 */
export function paidFeatureIdForName(name: string | null | undefined): PaidFeatureId | null {
  if (!name) return null
  const needle = name.trim().toLowerCase()
  for (const feature of Object.values(PAID_FEATURES)) {
    if (feature.label.toLowerCase() === needle) return feature.id
    if (feature.aliases?.some((a) => a.toLowerCase() === needle)) return feature.id
  }
  return null
}
