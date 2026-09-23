import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { DBeaverConnectionImporter } from '@/backend/lib/objectimport/dbeaver/importer'
import { ConnectionImporter } from '@/backend/lib/objectimport/connection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { WorkspaceHandlers } from '@/handlers/workspaceHandlers'
import { newState, removeState } from '@/handlers/handlerState'
import {
  DBEAVER_EXPORT, DBEAVER_PROJECT, DBEAVER_WORKSPACE, FIXTURE_CONNECTION_COUNT, UNSUPPORTED_FIXTURE_CONNECTIONS,
} from '@tests/vitest/lib/dbeaverFixtures'

const IMPORTABLE = FIXTURE_CONNECTION_COUNT - UNSUPPORTED_FIXTURE_CONNECTIONS.length

async function folderPath(id: number | null): Promise<string | null> {
  const names: string[] = []
  while (id) {
    const folder = await ConnectionFolder.findOneBy({ id })
    names.unshift(folder.name)
    id = folder.parentId
  }
  return names.length ? names.join('/') : null
}

async function saved(name: string): Promise<SavedConnection> {
  const conn = await SavedConnection.findOneBy({ name })
  if (!conn) throw new Error(`${name} was not imported`)
  return conn
}

describe('DBeaverConnectionImporter (local)', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await TestOrmConnection.disconnect()
  })

  it('imports a DBeaver workspace into saved connections and folders', async () => {
    const stats = await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE)

    expect(stats).toMatchObject({ items: IMPORTABLE, skipped: 2, directories: 5 })
    expect(await SavedConnection.count()).toBe(IMPORTABLE)
    expect(stats.warnings).toContain('Skipped DB2 Legacy: DBeaver driver db2/db2 has no Beekeeper Studio equivalent')
    expect(stats.warnings).toContain('MySQL via SOCKS proxy: SOCKS proxies are not supported; imported without the proxy')

    const folders = await ConnectionFolder.find()
    expect((await Promise.all(folders.map((f) => folderPath(f.id)))).sort())
      .toEqual(['Analytics', 'Development', 'Production', 'Production/EU', 'Team'])

    const pg = await saved('Local Postgres')
    expect(pg).toMatchObject({
      connectionType: 'postgresql', host: 'localhost', port: 5432, defaultDatabase: 'app_dev', username: 'postgres', password: 'pg-secret',
      labelColor: 'default', readOnlyMode: false,
    })
    expect(await folderPath(pg.connectionFolderId)).toBe('Development')

    const eu = await saved('EU Postgres (SSH key + SSL)')
    expect(await folderPath(eu.connectionFolderId)).toBe('Production/EU')
    expect(eu).toMatchObject({
      labelColor: 'red', sshEnabled: true, sshMode: 'keyfile', sshHost: 'eu-bastion.example.com', sshPort: 2222, sshUsername: 'ubuntu',
      sshKeyfile: '/home/me/.ssh/id_ed25519', sshKeyfilePassword: 'key-passphrase', sshKeepaliveInterval: 30,
      ssl: true, sslCaFile: '/certs/eu/ca.pem', sslRejectUnauthorized: true,
    })

    expect(await saved('Prod Postgres (SSH password)')).toMatchObject({
      readOnlyMode: true, sshMode: 'userpass', sshUsername: 'deploy', sshPassword: 'ssh-secret',
    })
    expect(await saved('Postgres via jump host')).toMatchObject({
      sshBastionHost: 'jump.example.com', sshBastionHostPort: 2200, sshBastionMode: 'keyfile',
      sshBastionKeyfile: '/home/me/.ssh/jump_key', sshBastionKeyfilePassword: 'jump-key-pass',
    })
    expect(await saved('Oracle SID')).toMatchObject({
      options: { connectionMethod: 'connectionString', connectionString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=ora-sid.local)(PORT=1521))(CONNECT_DATA=(SID=XE)))' },
    })
    expect(await saved('Turso LibSQL')).toMatchObject({ libsqlOptions: { mode: 'url', authToken: 'libsql-token' } })
    expect(await saved('SQL Server (NTLM)')).toMatchObject({ username: 'jdoe', domain: 'CORP', password: 'ntlm-secret' })
    expect((await saved('Staging MySQL (password not saved)')).password).toBeNull()
    expect(await folderPath((await saved('Team Shared Postgres')).connectionFolderId)).toBe('Team')
  })

  it('imports a project export (.dbp)', async () => {
    const stats = await new DBeaverConnectionImporter().import(DBEAVER_EXPORT)
    expect(stats).toMatchObject({ items: IMPORTABLE, skipped: 2, directories: 5 })
    expect((await saved('Snowflake')).password).toBe('snow-secret')
  })

  it('leaves out every secret when passwords are excluded', async () => {
    await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE, { includePasswords: false })

    for (const conn of await SavedConnection.find()) {
      expect(conn.password).toBeNull()
      expect(conn.sshPassword).toBeNull()
      expect(conn.sshKeyfilePassword).toBeNull()
      expect(conn.sshBastionPassword).toBeNull()
      expect(conn.sshBastionKeyfilePassword).toBeNull()
      expect(conn.libsqlOptions.authToken).toBeUndefined()
    }
    expect((await saved('Local Postgres')).username).toBe('postgres')
  })

  it('imports only the selected connections', async () => {
    const importer = new DBeaverConnectionImporter()
    const preview = await importer.preview(DBEAVER_WORKSPACE)
    const keys = preview.connections.filter((c) => ['Local Postgres', 'DB2 Legacy'].includes(c.name)).map((c) => c.key)

    const stats = await importer.import(DBEAVER_WORKSPACE, { keys })
    expect(stats).toMatchObject({ items: 1, skipped: 1, directories: 1 })
    expect((await SavedConnection.find()).map((c) => c.name)).toEqual(['Local Postgres'])
  })

  it('imports into a parent folder, or flat without DBeaver folders', async () => {
    const parent = await new ConnectionFolder().withProps({ name: 'From DBeaver' }).save()
    await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE, { parentId: parent.id })
    expect(await folderPath((await saved('EU Postgres (SSH key + SSL)')).connectionFolderId)).toBe('From DBeaver/Production/EU')

    await SavedConnection.clear()
    const stats = await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE, { parentId: parent.id, includeFolders: false })
    expect(stats.directories).toBe(0)
    const folderIds = new Set((await SavedConnection.find()).map((c) => c.connectionFolderId))
    expect([...folderIds]).toEqual([parent.id])
  })

  it('reuses existing folders with the same name instead of duplicating them', async () => {
    const production = await new ConnectionFolder().withProps({ name: 'Production' }).save()

    const first = await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE)
    expect(first.directories).toBe(4)
    expect((await saved('Prod Postgres (SSH password)')).connectionFolderId).toBe(production.id)

    const second = await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE)
    expect(second.directories).toBe(0)
    expect(await ConnectionFolder.count()).toBe(5)
    expect(await SavedConnection.count()).toBe(IMPORTABLE * 2)
  })

  it('creates a folder per project when importing several projects', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'dbeaver-workspace-'))
    try {
      await fs.cp(DBEAVER_PROJECT, path.join(workspace, 'General'), { recursive: true })
      await fs.cp(DBEAVER_PROJECT, path.join(workspace, 'Client Work'), { recursive: true })

      const stats = await new DBeaverConnectionImporter().import(workspace)
      expect(stats.items).toBe(IMPORTABLE * 2)
      const paths = await Promise.all((await SavedConnection.findBy({ name: 'EU Postgres (SSH key + SSL)' })).map((c) => folderPath(c.connectionFolderId)))
      expect(paths.sort()).toEqual(['Client Work/Production/EU', 'General/Production/EU'])
    } finally {
      await fs.rm(workspace, { recursive: true, force: true })
    }
  })

  it('keeps importing when a batch fails', async () => {
    const original = ConnectionImporter.prototype.importItems
    vi.spyOn(ConnectionImporter.prototype, 'importItems').mockImplementation(async function (items) {
      if (items.some((i) => i.name === 'Trino')) throw new Error('rejected')
      return original.call(this, items)
    })

    const stats = await new DBeaverConnectionImporter().import(DBEAVER_WORKSPACE)
    expect(stats).toMatchObject({ items: IMPORTABLE - 1, skipped: 3 })
    expect(stats.warnings).toContain('Failed to import Trino: rejected')
    expect(await SavedConnection.findOneBy({ name: 'Trino' })).toBeNull()
  })
})

describe('DBeaver workspace handlers', () => {
  const sId = 'dbeaver-import-test'

  beforeEach(async () => {
    await TestOrmConnection.connect()
    newState(sId)
  })

  afterEach(async () => {
    await removeState(sId)
    await TestOrmConnection.disconnect()
  })

  it('previews and imports through the utility handlers', async () => {
    const preview = await WorkspaceHandlers['workspace/previewDBeaverConnections']({ path: DBEAVER_WORKSPACE })
    expect(preview.projects).toEqual(['General'])
    expect(preview.connections).toHaveLength(FIXTURE_CONNECTION_COUNT)
    expect(preview.connections.find((c) => c.name === 'Local Postgres')).toEqual({
      key: 'General/postgres-jdbc-1a0cc4aa8c1-4a433466ab963944',
      project: 'General',
      name: 'Local Postgres',
      folder: 'Development',
      driver: 'postgresql/postgres-jdbc',
      connectionType: 'postgresql',
      supported: true,
      hasPassword: true,
      warnings: [],
    })
    expect(preview.connections.find((c) => c.name === 'H2 Embedded')).toMatchObject({ supported: false, connectionType: null })
    // previewing writes nothing
    expect(await SavedConnection.count()).toBe(0)

    const stats = await WorkspaceHandlers['workspace/importDBeaverConnections']({ sId, path: DBEAVER_EXPORT, includeFolders: false })
    expect(stats).toMatchObject({ items: IMPORTABLE, directories: 0 })
    expect(await SavedConnection.count()).toBe(IMPORTABLE)
  })

  it('rejects calls without a path', async () => {
    await expect(WorkspaceHandlers['workspace/previewDBeaverConnections']({ path: '' })).rejects.toThrow('called with no path')
    await expect(WorkspaceHandlers['workspace/importDBeaverConnections']({ sId, path: undefined })).rejects.toThrow('called with no path')
  })
})
