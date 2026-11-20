import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'
import { applyImportedUrl } from '@/lib/connection/importFromUrl'

const parseUrl = (url: string) => AppDbHandlers['appdb/saved/parseUrl']({ url })

describe('applyImportedUrl', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('takes the connection fields from the URL', async () => {
    const config: any = { host: 'old', port: 1111, username: 'old', defaultDatabase: 'old' }

    applyImportedUrl(config, await parseUrl('postgres://alice:s3cret@db.example.com:5433/previews'))

    expect(config).toMatchObject({
      connectionType: 'postgresql',
      host: 'db.example.com',
      port: 5433,
      username: 'alice',
      password: 's3cret',
      defaultDatabase: 'previews',
    })
  })

  it('keeps the identity and settings of the connection being edited', async () => {
    const config: any = {
      id: 7,
      name: 'Render preview',
      labelColor: 'red',
      workspaceId: 4,
      connectionFolderId: 3,
      sshEnabled: true,
      sshHost: 'bastion.example.com',
      createdAt: new Date('2024-01-01'),
    }

    applyImportedUrl(config, await parseUrl('postgres://u:p@db.example.com/app'))

    expect(config).toMatchObject({
      id: 7,
      name: 'Render preview',
      labelColor: 'red',
      workspaceId: 4,
      connectionFolderId: 3,
      sshEnabled: true,
      sshHost: 'bastion.example.com',
      createdAt: new Date('2024-01-01'),
    })
  })

  it('updates the saved connection instead of creating a new one', async () => {
    const original = new SavedConnection()
    original.connectionType = 'postgresql'
    original.name = 'Render preview'
    original.host = 'old.example.com'
    original.port = 5432
    original.username = 'old'
    original.defaultDatabase = 'old_db'
    const saved = await AppDbHandlers['appdb/saved/save']({
      obj: { ...original, connectionType: original.connectionType },
      options: undefined,
    })

    // What the connection form does: edit the saved connection, import a URL, save.
    const config: any = { ...saved, connectionType: saved.connectionType }
    applyImportedUrl(config, await parseUrl('postgres://new:pw@pr-42.example.com:5433/pr_42'))
    const result = await AppDbHandlers['appdb/saved/save']({ obj: config, options: undefined })

    expect(result.id).toBe(saved.id)
    expect(await SavedConnection.count()).toBe(1)
    const fromDb = await SavedConnection.findOneBy({ id: saved.id })
    expect(fromDb).toMatchObject({
      name: 'Render preview',
      host: 'pr-42.example.com',
      port: 5433,
      username: 'new',
      defaultDatabase: 'pr_42',
    })
  })

  it('does not turn SSL off when the URL does not mention it', async () => {
    const config: any = { ssl: true }

    applyImportedUrl(config, await parseUrl('postgres://u:p@db.example.com/app'))

    expect(config.ssl).toBe(true)
  })

  it('turns SSL on when the URL asks for it', async () => {
    const config: any = { ssl: false }

    applyImportedUrl(config, await parseUrl('postgres://u:p@db.example.com/app?sslmode=require'))

    expect(config.ssl).toBe(true)
  })

  it('merges driver options only when the URL sets them', async () => {
    const config: any = { options: { keep: 'me', connectionMethod: 'url' } }

    applyImportedUrl(config, await parseUrl('postgres://u:p@db.example.com/app'))
    expect(config.options).toStrictEqual({ keep: 'me', connectionMethod: 'url' })

    applyImportedUrl(config, await parseUrl('cockroachdb://u:p@db.example.com/app?options=--cluster%3Dmy-cluster'))
    expect(config.options).toMatchObject({ keep: 'me', connectionMethod: 'url', cluster: 'my-cluster' })
  })
})
