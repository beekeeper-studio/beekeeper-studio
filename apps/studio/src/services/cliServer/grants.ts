import { CliAccess, CLI_QUERY_PERMISSIONS, CLI_WRITE_QUERY_PERMISSIONS } from '@beekeeperstudio/cli-client'
import { CliConnectionHandle } from './commands'
import { state } from '@/handlers/handlerState'

/** Where approvals live. They last only as long as the connection stays open. */
export interface CliGrantStore {
  find(clientName: string, connection: CliConnectionHandle): Promise<CliAccess | null>
  save(clientName: string, connection: CliConnectionHandle, access: CliAccess): Promise<void>
}

/** Drops unknown permissions and, on a read only connection, every write permission. */
export function normalizeAccess(access: Partial<CliAccess>, readOnlyMode: boolean): CliAccess {
  const queryTypes = (access.queryTypes || []).filter((type) => {
    if (!(CLI_QUERY_PERMISSIONS as readonly string[]).includes(type)) {
      return false
    }
    return !(readOnlyMode && CLI_WRITE_QUERY_PERMISSIONS.includes(type))
  })
  return {
    queryTypes: [...new Set(queryTypes)],
    savedQueriesRead: !!access.savedQueriesRead,
    savedQueriesWrite: !!access.savedQueriesWrite,
    openTabs: !!access.openTabs,
  }
}

export class MemoryCliGrantStore implements CliGrantStore {
  private readonly grants = new Map<string, CliAccess>()

  private key(clientName: string, connection: CliConnectionHandle): string {
    return `${connection.id}\0${clientName}`
  }

  async find(clientName: string, connection: CliConnectionHandle): Promise<CliAccess | null> {
    return this.grants.get(this.key(clientName, connection)) ?? null
  }

  async save(clientName: string, connection: CliConnectionHandle, access: CliAccess): Promise<void> {
    this.grants.set(this.key(clientName, connection), access)
  }
}

/** Keeps approvals on the window's connection, so they go away when it disconnects or the app quits. */
export class SessionCliGrantStore implements CliGrantStore {
  async find(clientName: string, connection: CliConnectionHandle): Promise<CliAccess | null> {
    return state(connection.id)?.cliGrants.get(clientName) ?? null
  }

  async save(clientName: string, connection: CliConnectionHandle, access: CliAccess): Promise<void> {
    state(connection.id)?.cliGrants.set(clientName, access)
  }
}
