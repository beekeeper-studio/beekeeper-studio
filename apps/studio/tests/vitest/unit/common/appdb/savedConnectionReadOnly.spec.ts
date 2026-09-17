import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'Read Only Connection'
  Object.assign(c, overrides)
  return c
}

describe('AppDbHandlers - readOnlyMode', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('persists readOnlyMode when saving a new connection', async () => {
    const conn = buildConnection({ readOnlyMode: true })

    const result = await AppDbHandlers['appdb/saved/save']({
      // connectionType is an accessor, so it is not picked up by a spread
      obj: { ...conn, connectionType: conn.connectionType },
      options: undefined,
    })

    expect(result.readOnlyMode).toBe(true)

    const fromDb = await SavedConnection.findOneBy({ id: result.id })
    expect(fromDb.readOnlyMode).toBe(true)
  })

  it('returns readOnlyMode as stored when reading a connection', async () => {
    const conn = buildConnection({ readOnlyMode: true })
    await conn.save()

    const found = await AppDbHandlers['appdb/saved/findOneBy']({
      options: { id: conn.id },
    })

    expect(found.readOnlyMode).toBe(true)
  })

  it('keeps readOnlyMode on when saving an unrelated change', async () => {
    const conn = buildConnection({ readOnlyMode: true })
    await conn.save()

    const loaded = await AppDbHandlers['appdb/saved/findOneBy']({
      options: { id: conn.id },
    })

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...loaded, name: 'Renamed' },
      options: undefined,
    })

    expect(result.readOnlyMode).toBe(true)

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.readOnlyMode).toBe(true)
  })

  it('allows turning readOnlyMode back off', async () => {
    const conn = buildConnection({ readOnlyMode: true })
    await conn.save()

    const result = await AppDbHandlers['appdb/saved/save']({
      obj: { ...conn, readOnlyMode: false },
      options: undefined,
    })

    expect(result.readOnlyMode).toBe(false)

    const fromDb = await SavedConnection.findOneBy({ id: conn.id })
    expect(fromDb.readOnlyMode).toBe(false)
  })
})
