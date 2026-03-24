import { DBeaverDataSources, DBeaverConnection, DBeaverHandler, ParsedConnection, mapDBeaverDriverToBKS } from './types'
import type { SshMode } from '@/common/interfaces/IConnection'

function extractSSH(handlers?: Record<string, DBeaverHandler>): Partial<ParsedConnection> {
  if (!handlers) return { sshEnabled: false, sshHost: null, sshPort: null, sshUsername: null, sshPassword: null, sshKeyfile: null, sshMode: null }

  const sshHandler = Object.values(handlers).find(
    h => h.type === 'ssh_tunnel' && h.enabled
  )
  if (!sshHandler?.properties) {
    return { sshEnabled: false, sshHost: null, sshPort: null, sshUsername: null, sshPassword: null, sshKeyfile: null, sshMode: null }
  }

  const props = sshHandler.properties
  let sshMode: SshMode = 'agent'
  if (props.keyFile) sshMode = 'keyfile'
  else if (props.password) sshMode = 'userpass'

  return {
    sshEnabled: true,
    sshHost: props.host || null,
    sshPort: props.port ? parseInt(props.port, 10) : 22,
    sshUsername: props.user || null,
    sshPassword: props.password || null,
    sshKeyfile: props.keyFile || null,
    sshMode,
  }
}

function makeDefaultParsedConnection(id: string): ParsedConnection {
  return {
    dbeaverId: id,
    name: '',
    connectionType: null,
    host: null,
    port: null,
    defaultDatabase: null,
    username: null,
    password: null,
    readOnlyMode: false,
    sshEnabled: false,
    sshHost: null,
    sshPort: null,
    sshUsername: null,
    sshPassword: null,
    sshKeyfile: null,
    sshMode: null,
    ssl: false,
    sslCaFile: null,
    sslCertFile: null,
    sslKeyFile: null,
    unsupportedDriver: null,
  }
}

export function parseDBeaverJSON(jsonContent: string): ParsedConnection[] {
  try {
    const data: DBeaverDataSources = JSON.parse(jsonContent)
    if (!data.connections) return []

    return Object.entries(data.connections).map(([id, conn]) => {
      const bksType = mapDBeaverDriverToBKS(conn.provider)
      const ssh = extractSSH(conn.configuration?.handlers)

      return {
        ...makeDefaultParsedConnection(id),
        name: conn.name || id,
        connectionType: bksType,
        host: conn.configuration?.host || null,
        port: conn.configuration?.port ? parseInt(conn.configuration.port, 10) : null,
        defaultDatabase: conn.configuration?.database || null,
        readOnlyMode: conn['read-only'] || false,
        unsupportedDriver: bksType === null ? conn.provider : null,
        ...ssh,
      }
    })
  } catch {
    return []
  }
}

export function parseDBeaverXML(xmlContent: string): ParsedConnection[] {
  try {
    const results: ParsedConnection[] = []
    const dsRegex = /<data-source\s+([^>]*)>([\s\S]*?)<\/data-source>/g
    let dsMatch: RegExpExecArray | null

    while ((dsMatch = dsRegex.exec(xmlContent)) !== null) {
      const dsAttrs = parseAttributes(dsMatch[1])
      const innerContent = dsMatch[2]

      const connMatch = /<connection\s+([^/>]*)\/?>/.exec(innerContent)
      const connAttrs = connMatch ? parseAttributes(connMatch[1]) : {}

      const provider = dsAttrs.provider || ''
      const bksType = mapDBeaverDriverToBKS(provider)

      results.push({
        ...makeDefaultParsedConnection(dsAttrs.id || ''),
        name: dsAttrs.name || dsAttrs.id || '',
        connectionType: bksType,
        host: connAttrs.host || null,
        port: connAttrs.port ? parseInt(connAttrs.port, 10) : null,
        defaultDatabase: connAttrs.database || null,
        username: connAttrs.user || null,
        password: connAttrs.password || null,
        unsupportedDriver: bksType === null ? provider : null,
      })
    }

    return results
  } catch {
    return []
  }
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const regex = /(\w[\w-]*)="([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}
