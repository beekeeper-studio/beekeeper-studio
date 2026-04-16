import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { SshConfig } from '@/common/appdb/models/SshConfig'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'Test Connection'
  Object.assign(c, overrides)
  return c
}

describe('AppDbHandlers - appdb/saved/save', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('preserves connectionFolderId in the returned result', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Work'
    await folder.save()

    const conn = buildConnection()
    await conn.save()

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, connectionFolderId: folder.id },
      options: undefined
    })

    expect(result.connectionFolderId).toBe(folder.id)
  })

  it('writes connectionFolderId to the database', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Staging'
    await folder.save()

    const conn = buildConnection()
    await conn.save()

    await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, connectionFolderId: folder.id },
      options: undefined
    })

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.connectionFolderId).toBe(folder.id)
  })

  it('can move a connection from one folder to another', async () => {
    const folderA = new ConnectionFolder()
    folderA.name = 'Folder A'
    await folderA.save()

    const folderB = new ConnectionFolder()
    folderB.name = 'Folder B'
    await folderB.save()

    const conn = buildConnection({ connectionFolderId: folderA.id })
    await conn.save()

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, connectionFolderId: folderB.id },
      options: undefined
    })

    expect(result.connectionFolderId).toBe(folderB.id)

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.connectionFolderId).toBe(folderB.id)
  })

  it('updates an existing sshConfig instead of recreating it when id is present', async () => {
    // First save: create the connection with a new sshConfig (no id)
    const first = await AppDbHandlers['appdb/saved/save']({
      obj: buildConnection({
        sshEnabled: true,
        sshConfigs: [
          {
            position: 0,
            sshConfig: {
              host: 'bastion.example.com',
              port: 22,
              mode: 'userpass',
              username: 'tunnel-user',
              password: 's3cr3t',
            }
          }
        ] as any
      }),
      options: undefined
    })

    const fromDb = await SavedConnection.findOne({
      where: { id: first.id },
      relations: ['sshConfigs', 'sshConfigs.sshConfig']
    })
    const originalSshConfigId = fromDb.sshConfigs[0].sshConfig.id

    // Second save: pass the sshConfig back with its id and a changed host
    await AppDbHandlers['appdb/saved/save']({
      obj: {
        ...first,
        sshConfigs: [
          {
            ...fromDb.sshConfigs[0],
            sshConfig: {
              ...fromDb.sshConfigs[0].sshConfig,
              host: 'updated.example.com',
            }
          }
        ] as any
      },
      options: undefined
    })

    const updated = await SavedConnection.findOne({
      where: { id: first.id },
      relations: ['sshConfigs', 'sshConfigs.sshConfig']
    })

    expect(updated.sshConfigs).toHaveLength(1)
    // The SshConfig row should be updated in place, not a new one created
    expect(updated.sshConfigs[0].sshConfig.id).toBe(originalSshConfigId)
    expect(updated.sshConfigs[0].sshConfig.host).toBe('updated.example.com')

    const totalSshConfigs = await SshConfig.count()
    expect(totalSshConfigs).toBe(1)
  })

  it('deletes an orphaned sshConfig when it is removed from the connection', async () => {
    // First save: create connection with an sshConfig
    const first = await AppDbHandlers['appdb/saved/save']({
      obj: buildConnection({
        sshEnabled: true,
        sshConfigs: [
          {
            position: 0,
            sshConfig: {
              host: 'bastion.example.com',
              port: 22,
              mode: 'userpass',
              username: 'tunnel-user',
              password: 's3cr3t',
            }
          }
        ] as any
      }),
      options: undefined
    })

    expect(await SshConfig.count()).toBe(1)

    // Second save: remove the sshConfig
    await AppDbHandlers['appdb/saved/save']({
      obj: { ...first, sshConfigs: [] as any },
      options: undefined
    })

    expect(await SshConfig.count()).toBe(0)
  })

  it('saves a connection with sshConfigs in a transaction', async () => {
    const result = await AppDbHandlers['appdb/saved/save']({
      obj: buildConnection({
        sshEnabled: true,
        sshConfigs: [
          {
            position: 0,
            sshConfig: {
              host: 'bastion.example.com',
              port: 22,
              mode: 'userpass',
              username: 'tunnel-user',
              password: 's3cr3t',
            }
          }
        ] as any
      }),
      options: undefined
    })

    expect(result.sshEnabled).toBe(true)
  })
})
