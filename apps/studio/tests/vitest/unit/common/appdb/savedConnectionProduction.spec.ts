import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'Production Connection'
  Object.assign(c, overrides)
  return c
}

describe('AppDbHandlers - isProduction', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('is off for a new connection', () => {
    expect(new SavedConnection().isProduction).toBe(false)
  })

  it('persists isProduction when saving a connection', async () => {
    const conn = buildConnection({ isProduction: true })

    const result = await AppDbHandlers['appdb/saved/save']({
      // connectionType is an accessor, so it is not picked up by a spread
      obj: { ...conn, connectionType: conn.connectionType },
      options: undefined,
    })

    expect(result.isProduction).toBe(true)
    const fromDb = await SavedConnection.findOneBy({ id: result.id })
    expect(fromDb.isProduction).toBe(true)
  })

  it('allows turning isProduction back off', async () => {
    const conn = buildConnection({ isProduction: true })
    await conn.save()

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, isProduction: false },
      options: undefined,
    })

    expect(result.isProduction).toBe(false)
    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.isProduction).toBe(false)
  })

  // The recent connections list keeps a copy of the config it was opened with.
  it('carries over to a recent connection', async () => {
    const conn = buildConnection({ isProduction: true })
    await conn.save()

    // the renderer hands over plain objects, with connectionType copied out of its accessor
    const used = await UsedConnection.recordUse({ ...conn, connectionType: conn.connectionType } as SavedConnection)
    expect(used.isProduction).toBe(true)
    const fromDb = await UsedConnection.findOneBy({ id: used.id })
    expect(fromDb.isProduction).toBe(true)
  })
})
