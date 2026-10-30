import BksConfig from '@/common/bksConfig'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { IConnection } from '@/common/interfaces/IConnection'
import { LocalWorkspace } from '@/common/interfaces/IWorkspace'
import { allStates } from '@/handlers/handlerState'
import { CliBackend, CliOpenConnection } from './commands'

export interface CliEnabledDeps {
  /** `[cli] enableForAllConnections` from the ini config. */
  enableForAll: boolean
  /** Latest saved copy of a local connection, so a change to the checkbox applies without reconnecting. */
  findSaved: (id: number) => Promise<Pick<IConnection, 'cliEnabled'> | null>
}

function isLocalConnection(config: IConnection): boolean {
  return config.workspaceId == null || config.workspaceId === LocalWorkspace.id
}

export async function resolveCliEnabled(connection: CliOpenConnection, deps: CliEnabledDeps): Promise<boolean> {
  if (deps.enableForAll) return true
  const config = connection.config
  if (!config) return false
  if (config.id && isLocalConnection(config)) {
    const saved = await deps.findSaved(config.id)
    if (saved) return !!saved.cliEnabled
  }
  return !!config.cliEnabled
}

/** The real backend: the utility process's per-window connection states. */
export const utilityCliBackend: CliBackend = {
  openConnections(): CliOpenConnection[] {
    const result: CliOpenConnection[] = []
    for (const [id, state] of allStates()) {
      if (!state.connection) continue
      result.push({
        id,
        config: state.usedConfig,
        database: state.database,
        client: state.connection,
      })
    }
    return result
  },

  isCliEnabled(connection: CliOpenConnection): Promise<boolean> {
    return resolveCliEnabled(connection, {
      enableForAll: !!BksConfig.cli?.enableForAllConnections,
      findSaved: (id) => SavedConnection.findOneBy({ id }),
    })
  },
}
