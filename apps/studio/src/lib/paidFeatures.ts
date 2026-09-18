import { SmartLocalStorage } from '@/common/LocalStorage'
import { isUltimateType } from '@/common/interfaces/IConnection'
import type { IConnection } from '@/common/interfaces/IConnection'
import { ConnectionTypes, ConnectionType } from '@/lib/db/types'

export type PaidFeatureId =
  | 'premium-databases'
  | 'ai-shell'
  | 'json-row-view'
  | 'import-from-file'
  | 'multi-table-export'
  | 'backup-restore'
  | 'advanced-filters'
  | 'editable-query-results'
  | 'query-to-file'
  | 'cloud-workspaces'
  | 'enterprise-auth'
  | 'er-diagram'

export interface PaidFeature {
  id: PaidFeatureId
  label: string
  /** One short line on what the feature does, for the trial dialogs. */
  description: string
}

/**
 * Every feature the app gates behind a paid license, in the order the trial
 * dialogs list them when nothing has been used yet. Keep in step with the
 * `isCommunity` / `isUltimate` gates in the components and the comparison
 * table in docs/includes/feature_comparison.md.
 */
export const PAID_FEATURES: PaidFeature[] = [
  {
    id: 'premium-databases',
    label: '12 more databases',
    description: 'Oracle, MongoDB, DuckDB, ClickHouse, Cassandra, Snowflake, DynamoDB and more',
  },
  {
    id: 'ai-shell',
    label: 'SQL AI shell',
    description: 'Plain-English questions become SQL, run with your own model key',
  },
  {
    id: 'json-row-view',
    label: 'JSON row view',
    description: 'Any row as JSON in the sidebar, wide tables included',
  },
  {
    id: 'import-from-file',
    label: 'Import from file',
    description: 'CSV, JSON and Excel straight into a table',
  },
  {
    id: 'multi-table-export',
    label: 'Export multiple tables',
    description: 'A whole schema in one export',
  },
  {
    id: 'backup-restore',
    label: 'Backup & restore',
    description: 'Native dump and restore from inside the app',
  },
  {
    id: 'advanced-filters',
    label: 'Unlimited table filters',
    description: 'Three or more filters on a table',
  },
  {
    id: 'editable-query-results',
    label: 'Editable query results',
    description: 'Edit rows straight from a SELECT',
  },
  {
    id: 'query-to-file',
    label: 'Query to file',
    description: 'Stream a full result set to disk',
  },
  {
    id: 'cloud-workspaces',
    label: 'Cloud workspaces',
    description: 'Connections and queries synced across devices and teams',
  },
  {
    id: 'enterprise-auth',
    label: 'Enterprise authentication',
    description: 'AWS IAM, Azure AD and Kerberos sign-in',
  },
  {
    id: 'er-diagram',
    label: 'ER diagrams',
    description: 'Table relationships drawn from the schema',
  },
]

export interface PaidFeatureUsage {
  count: number
  firstUsedAt: number
  lastUsedAt: number
  /** Specifics worth showing back, eg which premium databases were used. */
  details: string[]
}

export type PaidFeatureUsageMap = Partial<Record<PaidFeatureId, PaidFeatureUsage>>

export interface RankedPaidFeature extends PaidFeature {
  usage: PaidFeatureUsage | null
}

export const PAID_FEATURE_USAGE_KEY = 'paidFeatureUsage'

const MAX_DETAILS = 8

/**
 * Basic, local-only bookkeeping of which paid features have actually been
 * used. The trial-ended dialog leads with these so the user sees exactly what
 * they are about to lose. Nothing here leaves the machine.
 */
export function getPaidFeatureUsage(): PaidFeatureUsageMap {
  try {
    const stored = SmartLocalStorage.getJSON(PAID_FEATURE_USAGE_KEY, {})
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored as PaidFeatureUsageMap
    }
  } catch {
    // corrupt or unavailable storage: behave as if nothing was used
  }
  return {}
}

export function recordPaidFeatureUse(
  id: PaidFeatureId,
  detail?: string,
  now: Date = new Date()
): PaidFeatureUsage | null {
  try {
    const usage = getPaidFeatureUsage()
    const existing = usage[id]
    const timestamp = now.getTime()
    const entry: PaidFeatureUsage = existing
      ? {
        count: (existing.count ?? 0) + 1,
        firstUsedAt: existing.firstUsedAt ?? timestamp,
        lastUsedAt: timestamp,
        details: Array.isArray(existing.details) ? [...existing.details] : [],
      }
      : { count: 1, firstUsedAt: timestamp, lastUsedAt: timestamp, details: [] }

    if (detail && !entry.details.includes(detail) && entry.details.length < MAX_DETAILS) {
      entry.details.push(detail)
    }

    usage[id] = entry
    SmartLocalStorage.addItem(PAID_FEATURE_USAGE_KEY, usage)
    return entry
  } catch {
    // Usage tracking must never break the feature being used.
    return null
  }
}

export function clearPaidFeatureUsage(): void {
  SmartLocalStorage.removeItem(PAID_FEATURE_USAGE_KEY)
}

/**
 * The catalogue with used features first (most used at the top, ties broken by
 * recency), followed by the unused ones in catalogue order.
 */
export function rankPaidFeaturesByUsage(
  usage: PaidFeatureUsageMap = getPaidFeatureUsage(),
  features: PaidFeature[] = PAID_FEATURES
): RankedPaidFeature[] {
  const ranked: RankedPaidFeature[] = features.map((feature) => ({
    ...feature,
    usage: usage[feature.id] ?? null,
  }))
  const used = ranked
    .filter((feature) => feature.usage)
    .sort((a, b) => (b.usage.count - a.usage.count) || (b.usage.lastUsedAt - a.usage.lastUsedAt))
  const unused = ranked.filter((feature) => !feature.usage)
  return [...used, ...unused]
}

/** Display name for a connection type, eg 'oracle' -> 'Oracle'. */
export function connectionTypeLabel(type: ConnectionType): string {
  return ConnectionTypes.find((ct) => ct.value === type)?.name ?? type
}

/** True when the connection signs in with a paid scheme: AWS IAM, Azure, or Windows / Kerberos. */
export function usesEnterpriseAuth(config: Partial<IConnection> | null | undefined): boolean {
  if (!config) return false
  return Boolean(
    config.iamAuthOptions?.iamAuthenticationEnabled ||
    config.azureAuthOptions?.azureAuthEnabled ||
    config.windowsAuthEnabled
  )
}

function enterpriseAuthLabel(config: Partial<IConnection>): string {
  if (config.windowsAuthEnabled) return 'Windows / Kerberos'
  if (config.azureAuthOptions?.azureAuthEnabled) return 'Azure'
  return 'AWS IAM'
}

/** Record what a successful connection relied on: a premium engine, an enterprise auth scheme, or both. */
export function recordConnectionFeatureUse(config: Partial<IConnection> | null | undefined): void {
  if (!config?.connectionType) return
  if (isUltimateType(config.connectionType)) {
    recordPaidFeatureUse('premium-databases', connectionTypeLabel(config.connectionType))
  }
  if (usesEnterpriseAuth(config)) {
    recordPaidFeatureUse('enterprise-auth', enterpriseAuthLabel(config))
  }
}

/** Only first-party (bks-) plugins are gated; these two are the paid ones with tabs. */
export function paidFeatureForPlugin(pluginId: string | null | undefined): PaidFeatureId | null {
  switch (pluginId) {
    case 'bks-ai-shell':
      return 'ai-shell'
    case 'bks-er-diagram':
      return 'er-diagram'
    default:
      return null
  }
}
