import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

// TypeORM drops a nil value from a where clause, so `findOneBy({ id: null })`
// matches the first row of the table. An object without an id was never
// saved: looking it up, or removing it, must touch nothing.

function build(name: string): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'postgresql'
  c.name = name
  c.host = `${name}.example.com`
  return c
}

describe('app db handlers handed a nil id', () => {
  let first: SavedConnection
  let second: SavedConnection

  beforeEach(async () => {
    await TestOrmConnection.connect()
    first = await build('first').save()
    second = await build('second').save()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  const names = async () => (await SavedConnection.find({ order: { id: 'ASC' } })).map((c) => c.name)

  it('removes nothing for an object with no id', async () => {
    await AppDbHandlers['appdb/saved/remove']({ obj: { id: null } as any })
    await AppDbHandlers['appdb/saved/remove']({ obj: { id: undefined } as any })
    await AppDbHandlers['appdb/saved/remove']({ obj: [{ id: null }, { id: undefined }] as any })

    expect(await names()).toEqual(['first', 'second'])
  })

  it('still removes the objects that do have an id', async () => {
    await AppDbHandlers['appdb/saved/remove']({ obj: [{ id: null }, { id: second.id }] as any })

    expect(await names()).toEqual(['first'])
  })

  it('finds nothing by a nil id', async () => {
    expect(await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: null } })).toBeNull()
    expect(await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: undefined } })).toBeNull()
    expect((await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: first.id } })).name).toBe('first')
  })
})
