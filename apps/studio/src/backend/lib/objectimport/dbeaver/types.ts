import { IObjectImportStats } from "@/common/interfaces/IObjectImportStats";
import { ConnectionType } from "@/lib/db/types";

// Shapes of DBeaver's project configuration files, as written by
// org.jkiss.dbeaver.registry.DataSourceSerializerModern (DBeaver 6.1.3+).
// Every value DBeaver writes into `properties` maps is a string.

export interface DBeaverHandlerConfig {
  type?: string
  enabled?: boolean
  'save-password'?: boolean
  // plaintext fallbacks written by old versions / "secure" configuration managers
  user?: string
  password?: string
  credentials?: Record<string, string>
  properties?: Record<string, string>
}

export interface DBeaverConnectionConfig {
  host?: string
  port?: string
  server?: string
  database?: string
  url?: string
  configurationType?: 'MANUAL' | 'URL' | string
  // plaintext credentials (DBeaver < 6.1.3, or projects that don't use credentials-config.json)
  user?: string
  password?: string
  credentials?: Record<string, string>
  type?: string
  color?: string
  keepAlive?: number
  'config-profile'?: string
  'config-profile-source'?: string
  properties?: Record<string, string>
  'provider-properties'?: Record<string, string>
  'auth-model'?: string
  'auth-properties'?: Record<string, string>
  handlers?: Record<string, DBeaverHandlerConfig>
  events?: Record<string, { enabled?: boolean, command?: string }>
  bootstrap?: {
    autocommit?: boolean
    defaultCatalog?: string
    defaultSchema?: string
    query?: string[]
  }
}

export interface DBeaverConnection {
  provider: string
  driver: string
  'original-provider'?: string
  'original-driver'?: string
  name?: string
  description?: string
  'save-password'?: boolean
  'read-only'?: boolean
  folder?: string
  configuration?: DBeaverConnectionConfig
}

export interface DBeaverConnectionTypeConfig {
  name?: string
  color?: string
  colorDark?: string
}

export interface DBeaverNetworkProfile {
  name?: string
  handlers?: Record<string, DBeaverHandlerConfig>
}

export interface DBeaverDataSourcesFile {
  folders?: Record<string, { parent?: string, description?: string }>
  connections?: Record<string, DBeaverConnection>
  'connection-types'?: Record<string, DBeaverConnectionTypeConfig>
  'network-profiles'?: Record<string, DBeaverNetworkProfile>
}

/**
 * Decrypted credentials-config.json:
 * `{ <connection id | "profile:<id>">: { "#connection" | "network/<handler>[/profile/<name>]": { user, password, ...secure props } } }`
 */
export type DBeaverCredentials = Record<string, Record<string, Record<string, string>>>

/** One data-sources*.json file plus its matching credentials-config*.json. */
export interface DBeaverStorage {
  fileName: string
  dataSources: DBeaverDataSourcesFile
  credentials: DBeaverCredentials
}

export interface DBeaverProject {
  name: string
  path: string
  storages: DBeaverStorage[]
}

export interface DBeaverSource {
  path: string
  projects: DBeaverProject[]
  warnings: string[]
}

export interface DBeaverWorkspaceSummary {
  path: string
  projects: { name: string, connections: number }[]
}

export interface DBeaverConnectionPreview {
  /** Stable key for selecting connections to import: `<project>/<DBeaver connection id>` */
  key: string
  project: string
  name: string
  /** DBeaver folder path, e.g. `Production/EU` */
  folder: string | null
  /** DBeaver `provider/driver`, e.g. `postgresql/postgres-jdbc` */
  driver: string
  connectionType: ConnectionType | null
  supported: boolean
  hasPassword: boolean
  warnings: string[]
}

export interface DBeaverImportPreview {
  path: string
  projects: string[]
  connections: DBeaverConnectionPreview[]
  warnings: string[]
}

export interface DBeaverImportOptions {
  /** Beekeeper connection folder to import into (null = top level) */
  parentId?: number | null
  /** Keys from the preview. Defaults to every supported connection. */
  keys?: string[]
  /** Recreate DBeaver's folder structure (default true) */
  includeFolders?: boolean
  /** Import saved passwords, passphrases and tokens (default true) */
  includePasswords?: boolean
}

export interface DBeaverImportStats extends IObjectImportStats {
  /** Connections that were selected but couldn't be imported */
  skipped: number
}
