import { detectInstallations } from '@/lib/dbeaver/detection'
import { parseDBeaverJSON, parseDBeaverXML } from '@/lib/dbeaver/parser'
import { decryptDBeaverCredentials } from '@/lib/dbeaver/credentials'
import { findScripts } from '@/lib/dbeaver/scripts'
import { DBeaverInstallation, ParsedConnection, ParsedQuery, ImportResult } from '@/lib/dbeaver/types'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import fs from 'fs'
import path from 'path'
import rawLog from '@bksLogger'

const log = rawLog.scope('DBeaver Import')

export interface IDBeaverImportHandlers {
  'dbeaver/detect': () => Promise<DBeaverInstallation[]>
  'dbeaver/parse': (args: { path: string }) => Promise<{ connections: ParsedConnection[], queries: ParsedQuery[] }>
  'dbeaver/import': (args: { connections: ParsedConnection[], queries: ParsedQuery[] }) => Promise<ImportResult>
}

export const DBeaverImportHandlers: IDBeaverImportHandlers = {
  'dbeaver/detect': async function() {
    return await detectInstallations()
  },

  'dbeaver/parse': async function({ path: dbeaverDir }: { path: string }) {
    const connections: ParsedConnection[] = []

    const jsonPath = path.join(dbeaverDir, 'data-sources.json')
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf8')
      connections.push(...parseDBeaverJSON(content))
    }

    if (connections.length === 0) {
      const xmlPath = path.join(dbeaverDir, '.dbeaver-data-sources.xml')
      if (fs.existsSync(xmlPath)) {
        const content = fs.readFileSync(xmlPath, 'utf8')
        connections.push(...parseDBeaverXML(content))
      }
    }

    const creds = await decryptDBeaverCredentials(dbeaverDir)
    for (const conn of connections) {
      const connCreds = creds.get(conn.dbeaverId)
      if (connCreds) {
        if (connCreds.user && !conn.username) conn.username = connCreds.user
        if (connCreds.password) conn.password = connCreds.password
      }
    }

    const generalDir = path.dirname(dbeaverDir)
    const queries = await findScripts(generalDir)

    return { connections, queries }
  },

  'dbeaver/import': async function({ connections, queries }: { connections: ParsedConnection[], queries: ParsedQuery[] }) {
    const errors: string[] = []
    let importedConnections = 0
    let importedQueries = 0
    const idMap = new Map<string, number>()

    for (const conn of connections) {
      try {
        if (!conn.connectionType) {
          errors.push(`Skipped "${conn.name}": unsupported database type "${conn.unsupportedDriver}"`)
          continue
        }

        const existing = await SavedConnection.findOneBy({
          name: conn.name,
          host: conn.host || 'localhost',
          port: conn.port,
          defaultDatabase: conn.defaultDatabase,
        })

        if (existing) {
          errors.push(`Skipped "${conn.name}": connection already exists`)
          idMap.set(conn.dbeaverId, existing.id)
          continue
        }

        const saved = new SavedConnection()
        saved.connectionType = conn.connectionType
        saved.name = conn.name
        saved.host = conn.host || 'localhost'
        saved.port = conn.port
        saved.defaultDatabase = conn.defaultDatabase
        saved.username = conn.username
        saved.password = conn.password
        saved.readOnlyMode = conn.readOnlyMode
        saved.rememberPassword = !!conn.password
        saved.sshEnabled = conn.sshEnabled
        saved.sshHost = conn.sshHost
        saved.sshPort = conn.sshPort
        saved.sshUsername = conn.sshUsername

        if (conn.sshMode) {
          saved.sshMode = conn.sshMode
          if (conn.sshMode === 'userpass') saved.sshPassword = conn.sshPassword
          if (conn.sshMode === 'keyfile') saved.sshKeyfile = conn.sshKeyfile
        }

        saved.ssl = conn.ssl
        saved.sslCaFile = conn.sslCaFile
        saved.sslCertFile = conn.sslCertFile
        saved.sslKeyFile = conn.sslKeyFile

        await saved.save()
        idMap.set(conn.dbeaverId, saved.id)
        importedConnections++
      } catch (err: any) {
        log.error(`Failed to import connection "${conn.name}":`, err)
        errors.push(`Failed to import "${conn.name}": ${err.message || err}`)
      }
    }

    for (const query of queries) {
      try {
        const fq = new FavoriteQuery()
        fq.title = query.title
        fq.text = query.text
        fq.excerpt = query.text.substring(0, 200)
        fq.connectionHash = 'DEPRECATED'
        await fq.save()
        importedQueries++
      } catch (err: any) {
        log.error(`Failed to import query "${query.title}":`, err)
        errors.push(`Failed to import query "${query.title}": ${err.message || err}`)
      }
    }

    return { importedConnections, importedQueries, errors }
  }
}
