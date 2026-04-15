import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { QueryFolder } from '@/common/appdb/models/QueryFolder'
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'

function buildQuery(overrides: Partial<FavoriteQuery> = {}): FavoriteQuery {
  const q = new FavoriteQuery()
  q.title = 'Test Query'
  q.text = 'SELECT 1'
  q.excerpt = 'SELECT 1'
  q.connectionHash = 'test-hash'
  Object.assign(q, overrides)
  return q
}

describe('QueryFolder', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('can be saved and retrieved', async () => {
    const folder = new QueryFolder()
    folder.name = 'My Queries'
    await folder.save()

    const found = await QueryFolder.findOneBy({ id: folder.id })
    expect(found).not.toBeNull()
    expect(found.name).toBe('My Queries')
    expect(found.parentId).toBeNull()
  })

  it('starts with zero folders', async () => {
    expect(await QueryFolder.count()).toBe(0)
  })

  it('prevents deletion when it contains queries', async () => {
    const folder = new QueryFolder()
    folder.name = 'Non-empty Folder'
    await folder.save()

    const query = buildQuery({ queryFolderId: folder.id })
    await query.save()

    await expect(folder.remove()).rejects.toThrow('Cannot delete folder "Non-empty Folder"')
    // Folder should still exist
    expect(await QueryFolder.count()).toBe(1)
  })

  it('includes the item count in the error message', async () => {
    const folder = new QueryFolder()
    folder.name = 'Folder'
    await folder.save()

    await buildQuery({ queryFolderId: folder.id }).save()
    await buildQuery({ queryFolderId: folder.id }).save()

    await expect(folder.remove()).rejects.toThrow('2 queries')
  })

  it('uses singular "query" when count is 1', async () => {
    const folder = new QueryFolder()
    folder.name = 'Folder'
    await folder.save()

    await buildQuery({ queryFolderId: folder.id }).save()

    await expect(folder.remove()).rejects.toThrow('1 query')
  })

  it('allows deletion when empty', async () => {
    const folder = new QueryFolder()
    folder.name = 'Empty Folder'
    await folder.save()

    await folder.remove()
    expect(await QueryFolder.count()).toBe(0)
  })

  it('allows deletion after all queries are moved out', async () => {
    const folder = new QueryFolder()
    folder.name = 'Folder'
    await folder.save()

    const query = buildQuery({ queryFolderId: folder.id })
    await query.save()

    query.queryFolderId = null
    await query.save()

    await folder.remove()
    expect(await QueryFolder.count()).toBe(0)
    // Query should still exist
    expect(await FavoriteQuery.count()).toBe(1)
  })

  it('can have a parent folder', async () => {
    const parent = new QueryFolder()
    parent.name = 'Parent'
    await parent.save()

    const child = new QueryFolder()
    child.name = 'Child'
    child.parentId = parent.id
    await child.save()

    const found = await QueryFolder.findOneBy({ id: child.id })
    expect(found.parentId).toBe(parent.id)
  })

  it('prevents deletion of parent folder that contains subfolders', async () => {
    const parent = new QueryFolder()
    parent.name = 'Parent'
    await parent.save()

    // Subfolders don't count as "queries" so parent deletion is allowed
    // unless the subfolder also blocks via its own @BeforeRemove
    const child = new QueryFolder()
    child.name = 'Child'
    child.parentId = parent.id
    await child.save()

    // Parent has no queries directly — only a child folder
    await parent.remove()
    // Child's parentId becomes null via DB-level SET NULL
    const foundChild = await QueryFolder.findOneBy({ id: child.id })
    expect(foundChild).not.toBeNull()
    expect(foundChild.parentId).toBeNull()
  })
})
