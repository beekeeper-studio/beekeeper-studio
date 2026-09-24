import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { validate } from 'class-validator'

function buildConnection(overrides: Partial<SavedConnection> = {}): SavedConnection {
  const c = new SavedConnection()
  c.connectionType = 'sqlite'
  c.defaultDatabase = ':memory:'
  c.name = 'Test Connection'
  Object.assign(c, overrides)
  return c
}

describe('ConnectionFolder', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('can be saved and retrieved', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'My Connections'
    await folder.save()

    const found = await ConnectionFolder.findOneBy({ id: folder.id })
    expect(found).not.toBeNull()
    expect(found.name).toBe('My Connections')
    expect(found.parentId).toBeNull()
  })

  it('starts with zero folders', async () => {
    expect(await ConnectionFolder.count()).toBe(0)
  })

  it('allows deletion when empty', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Empty Folder'
    await folder.save()

    await folder.remove()
    expect(await ConnectionFolder.count()).toBe(0)
  })

  it('allows deletion after all connections are moved out', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    const conn = buildConnection({ connectionFolderId: folder.id })
    await conn.save()

    conn.connectionFolderId = null
    await conn.save()

    await folder.remove()
    expect(await ConnectionFolder.count()).toBe(0)
    // Connection should still exist
    expect(await SavedConnection.count()).toBe(1)
  })

  it('can have a parent folder', async () => {
    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const child = new ConnectionFolder()
    child.name = 'Child'
    child.parentId = parent.id
    await child.save()

    const found = await ConnectionFolder.findOneBy({ id: child.id })
    expect(found.parentId).toBe(parent.id)
  })

  it('prevents deletion when it contains connections', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Non-empty Folder'
    await folder.save()

    const conn = buildConnection({ connectionFolderId: folder.id })
    await conn.save()

    await expect(folder.remove()).rejects.toThrow('Cannot delete folder "Non-empty Folder"')
    // Folder should still exist
    expect(await ConnectionFolder.count()).toBe(1)
  })

  it('includes the item count in the error message', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    await buildConnection({ connectionFolderId: folder.id }).save()
    await buildConnection({ connectionFolderId: folder.id }).save()

    await expect(folder.remove()).rejects.toThrow('2 connections')
  })

  it('prevents moving a folder into its own descendant', async () => {
    const a = new ConnectionFolder()
    a.name = 'A'
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'B'
    b.parentId = a.id
    await b.save()

    const c = new ConnectionFolder()
    c.name = 'C'
    c.parentId = b.id
    await c.save()

    // The grandchild case, two levels down.
    const moving = await ConnectionFolder.findOneBy({ id: a.id })
    moving.parentId = c.id

    // The save handler runs class-validator before persisting, so that is where
    // this is caught — not in a lifecycle hook on save() itself.
    const errors = await validate(moving)
    expect(errors).toHaveLength(1)
    expect(Object.values(errors[0].constraints)).toContain('Cannot move folder "A" inside itself.')
  })

  // The ancestor walk is a recursive CTE, which will happily generate rows
  // forever on a cyclic tree. It runs in the utility process, so looping means a
  // hung app rather than a visible error. Nothing enforced acyclicity before this
  // check existed, so an app.db written earlier can still contain a cycle.
  it('terminates on a pre-existing cycle instead of hanging', async () => {
    await ConnectionFolder.query(
      `INSERT INTO connection_folder (id, name, parentId, expanded, createdAt, updatedAt, version)
       VALUES (1, 'a', 2, 1, datetime('now'), datetime('now'), 0),
              (2, 'b', 1, 1, datetime('now'), datetime('now'), 0)`
    )

    const child = await ConnectionFolder.findOneBy({ id: 2 })
    child.parentId = 1
    await expect(validate(child)).resolves.toBeDefined()
  }, 5000)

  it('prevents a folder from becoming its own parent', async () => {
    const a = new ConnectionFolder()
    a.name = 'A'
    await a.save()

    const moving = await ConnectionFolder.findOneBy({ id: a.id })
    moving.parentId = a.id

    const errors = await validate(moving)
    expect(errors).toHaveLength(1)
    expect(Object.values(errors[0].constraints)).toContain('Cannot move folder "A" inside itself.')
  })

  it('rejects a move that collides with a name at the destination', async () => {
    // The collision is created by the reparent, not by a rename — the duplicate
    // check has to run on a parent change too.
    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const existing = new ConnectionFolder()
    existing.name = 'Reports'
    existing.parentId = parent.id
    await existing.save()

    const other = new ConnectionFolder()
    other.name = 'Reports'
    await other.save()

    const moving = await ConnectionFolder.findOneBy({ id: other.id })
    moving.parentId = parent.id
    await expect(moving.save()).rejects.toThrow('already exists in this location')
  })

  it('prevents creating a duplicate folder at the root', async () => {
    const a = new ConnectionFolder()
    a.name = 'Work'
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'Work'
    await expect(b.save()).rejects.toThrow('A folder named "Work" already exists in this location.')
    expect(await ConnectionFolder.count()).toBe(1)
  })

  it('prevents creating a duplicate subfolder within the same parent', async () => {
    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const a = new ConnectionFolder()
    a.name = 'Shared'
    a.parentId = parent.id
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'Shared'
    b.parentId = parent.id
    await expect(b.save()).rejects.toThrow('A folder named "Shared" already exists in this location.')
  })

  it('allows the same folder name in different parents', async () => {
    const root = new ConnectionFolder()
    root.name = 'Shared'
    await root.save()

    const parent = new ConnectionFolder()
    parent.name = 'Parent'
    await parent.save()

    const child = new ConnectionFolder()
    child.name = 'Shared'
    child.parentId = parent.id
    await child.save()

    expect(await ConnectionFolder.count()).toBe(3)
  })

  it('allows updating a folder without renaming', async () => {
    const folder = new ConnectionFolder()
    folder.name = 'Folder'
    await folder.save()

    folder.expanded = false
    await folder.save()

    const found = await ConnectionFolder.findOneBy({ id: folder.id })
    expect(found.expanded).toBe(false)
  })

  it('prevents renaming a folder to collide with a sibling', async () => {
    const a = new ConnectionFolder()
    a.name = 'Alpha'
    await a.save()

    const b = new ConnectionFolder()
    b.name = 'Beta'
    await b.save()

    b.name = 'Alpha'
    await expect(b.save()).rejects.toThrow('A folder named "Alpha" already exists in this location.')
  })
})
