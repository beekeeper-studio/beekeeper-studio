import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { SshConfig } from '@/common/appdb/models/SshConfig'
import { ConnectionSshConfig } from '@/common/appdb/models/ConnectionSshConfig'
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

  it('rejects saving a new connection with no name', async () => {
    const conn = buildConnection()
    delete conn.name

    await expect(
      AppDbHandlers['appdb/saved/save']({ obj: conn, options: undefined })
    ).rejects.toThrow(/name/i)

    expect(await SavedConnection.count()).toBe(0)
  })

  it('rejects saving a new connection with an empty-string name', async () => {
    const conn = buildConnection({ name: '' })

    await expect(
      AppDbHandlers['appdb/saved/save']({ obj: conn, options: undefined })
    ).rejects.toThrow(/name/i)

    expect(await SavedConnection.count()).toBe(0)
  })

  it('rejects updating an existing connection to have no name', async () => {
    const conn = buildConnection()
    await conn.save()

    await expect(
      AppDbHandlers['appdb/saved/save']({
        obj: { ...conn, name: '' },
        options: undefined
      })
    ).rejects.toThrow(/name/i)

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.name).toBe('Test Connection')
  })

  it('rejects saving a batch when any connection has no name', async () => {
    const good = buildConnection({ name: 'Good One' })
    const bad = buildConnection({ name: '' })

    await expect(
      AppDbHandlers['appdb/saved/save']({ obj: [good, bad], options: undefined })
    ).rejects.toThrow(/name/i)

    expect(await SavedConnection.count()).toBe(0)
  })
})

describe('AppDbHandlers - appdb/saved/saveWithSshConfigs', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  function userpassConfig(host: string, position: number) {
    return {
      position,
      sshConfig: {
        host,
        port: 22,
        mode: 'userpass',
        username: 'tunnel-user',
        password: 's3cr3t',
      },
    }
  }

  // Mirrors the IPC payload: a plain IConnection object, not a SavedConnection
  // entity (getter-backed columns would not survive serialization).
  function sshConn(sshConfigs: any[], overrides: Record<string, any> = {}) {
    return {
      connectionType: 'mysql',
      host: 'localhost',
      port: 3306,
      name: 'Test Connection',
      sshEnabled: true,
      sshConfigs,
      ...overrides,
    } as any
  }

  it('inserts a new sshConfig and links it to the connection with its position', async () => {
    const result = await AppDbHandlers['appdb/saved/saveWithSshConfigs'](
      sshConn([userpassConfig('bastion.example.com', 0)])
    )

    expect(result.id).toBeTruthy()
    expect(result.sshEnabled).toBe(true)
    expect(result.sshConfigs).toHaveLength(1)
    expect(result.sshConfigs[0].position).toBe(0)
    expect(result.sshConfigs[0].sshConfig.host).toBe('bastion.example.com')

    expect(await SshConfig.count()).toBe(1)
    const links = await ConnectionSshConfig.findBy({ connectionId: result.id })
    expect(links).toHaveLength(1)
    expect(links[0].sshConfigId).toBe(result.sshConfigs[0].sshConfig.id)
    expect(links[0].position).toBe(0)
  })

  it('updates an existing sshConfig in place when id is present (no duplicate row)', async () => {
    const first = await AppDbHandlers['appdb/saved/saveWithSshConfigs'](
      sshConn([userpassConfig('old.example.com', 0)])
    )
    const originalId = first.sshConfigs[0].sshConfig.id

    const updated = await AppDbHandlers['appdb/saved/saveWithSshConfigs']({
      ...first,
      sshConfigs: [
        {
          ...first.sshConfigs[0],
          sshConfig: { ...first.sshConfigs[0].sshConfig, host: 'new.example.com' },
        },
      ] as any,
    })

    expect(updated.sshConfigs).toHaveLength(1)
    expect(updated.sshConfigs[0].sshConfig.id).toBe(originalId)
    expect(updated.sshConfigs[0].sshConfig.host).toBe('new.example.com')
    expect(await SshConfig.count()).toBe(1)
    expect(await ConnectionSshConfig.countBy({ connectionId: first.id })).toBe(1)
  })

  it('deletes sshConfigs (and their join rows) that are absent from the payload', async () => {
    const first = await AppDbHandlers['appdb/saved/saveWithSshConfigs'](
      sshConn([userpassConfig('a.example.com', 0), userpassConfig('b.example.com', 1)])
    )
    expect(await SshConfig.count()).toBe(2)
    const removed = first.sshConfigs.find((j) => j.sshConfig.host === 'b.example.com')

    const updated = await AppDbHandlers['appdb/saved/saveWithSshConfigs']({
      ...first,
      sshConfigs: first.sshConfigs.filter((j) => j.sshConfig.host === 'a.example.com') as any,
    })

    expect(updated.sshConfigs).toHaveLength(1)
    expect(updated.sshConfigs[0].sshConfig.host).toBe('a.example.com')
    expect(await SshConfig.count()).toBe(1)
    expect(await SshConfig.findOneBy({ id: removed.sshConfig.id })).toBeNull()
    expect(await ConnectionSshConfig.countBy({ connectionId: first.id })).toBe(1)
  })

  it('preserves each row position from the payload', async () => {
    const result = await AppDbHandlers['appdb/saved/saveWithSshConfigs'](
      sshConn([userpassConfig('jump.example.com', 0), userpassConfig('target.example.com', 1)])
    )

    const positionByHost = Object.fromEntries(
      result.sshConfigs.map((j) => [j.sshConfig.host, j.position])
    )
    expect(positionByHost['jump.example.com']).toBe(0)
    expect(positionByHost['target.example.com']).toBe(1)
  })

  it('clears keyfilePassword when sshStoreKeyfilePassword is false', async () => {
    const result = await AppDbHandlers['appdb/saved/saveWithSshConfigs'](
      sshConn(
        [
          {
            position: 0,
            sshConfig: {
              host: 'h',
              port: 22,
              mode: 'keyfile',
              username: 'u',
              keyfile: '/path/to/key',
              keyfilePassword: 'secret',
            },
          },
        ],
        { sshStoreKeyfilePassword: false }
      )
    )

    expect(result.sshConfigs[0].sshConfig.keyfilePassword).toBeNull()
    const stored = await SshConfig.findOneBy({ id: result.sshConfigs[0].sshConfig.id })
    expect(stored.keyfilePassword).toBeNull()
  })

  it('keeps keyfilePassword when sshStoreKeyfilePassword is true', async () => {
    const result = await AppDbHandlers['appdb/saved/saveWithSshConfigs'](
      sshConn(
        [
          {
            position: 0,
            sshConfig: {
              host: 'h',
              port: 22,
              mode: 'keyfile',
              username: 'u',
              keyfile: '/path/to/key',
              keyfilePassword: 'secret',
            },
          },
        ],
        { sshStoreKeyfilePassword: true }
      )
    )

    expect(result.sshConfigs[0].sshConfig.keyfilePassword).toBe('secret')
  })

  it('saves a connection with no sshConfigs', async () => {
    const result = await AppDbHandlers['appdb/saved/saveWithSshConfigs']({
      connectionType: 'mysql',
      host: 'localhost',
      port: 3306,
      name: 'Test Connection',
    } as any)

    expect(result.id).toBeTruthy()
    expect(result.sshConfigs ?? []).toHaveLength(0)
    expect(await SshConfig.count()).toBe(0)
  })
})
