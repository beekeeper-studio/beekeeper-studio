import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'CLI Connection'
  Object.assign(c, overrides)
  return c
}

describe('SavedConnection.cliEnabled', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('defaults to off', async () => {
    const conn = buildConnection()
    await conn.save()
    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.cliEnabled).toBe(false)
  })

  it('persists through the appdb save handler', async () => {
    const conn = buildConnection({ cliEnabled: true })
    const result = await AppDbHandlers['appdb/saved/save']({
      // connectionType is an accessor, so it is not picked up by a spread
      obj: { ...conn, connectionType: conn.connectionType },
      options: undefined,
    })
    expect(result.cliEnabled).toBe(true)

    const fromDb = await SavedConnection.findOneBy({ id: result.id })
    expect(fromDb.cliEnabled).toBe(true)

    const found = await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: result.id } })
    expect(found.cliEnabled).toBe(true)
  })

  it('is copied onto the recent connection record', async () => {
    const conn = buildConnection({ cliEnabled: true })
    await conn.save()
    const used = await UsedConnection.recordUse({ ...conn, connectionType: conn.connectionType } as any)
    expect(used.cliEnabled).toBe(true)

    const quick = buildConnection()
    const unsaved = await UsedConnection.recordUse({ ...quick, connectionType: quick.connectionType } as any)
    expect(unsaved.connectionId).toBeNull()
    expect(unsaved.cliEnabled).toBe(false)
  })
})
