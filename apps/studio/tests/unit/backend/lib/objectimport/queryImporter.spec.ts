import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { QueryImporter } from '@/backend/lib/objectimport/query'
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import { QueryFolder } from '@/common/appdb/models/QueryFolder'

let tmpDir: string

async function writeQuery(dir: string, fileName: string, text = 'SELECT 1;') {
  const filePath = path.join(dir, fileName)
  await fs.writeFile(filePath, text, 'utf-8')
  return filePath
}

describe('QueryImporter (local)', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'query-import-'))
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('importSelections', () => {
    it('imports selected .sql and .txt files into the database', async () => {
      const a = await writeQuery(tmpDir, 'first.sql', 'SELECT * FROM users;')
      const b = await writeQuery(tmpDir, 'second.txt', 'SELECT * FROM orders;')

      const importer = new QueryImporter()
      const stats = await importer.importSelections([a, b], null)

      expect(stats.items).toBe(2)
      expect(stats.warnings).toEqual([])
      expect(await FavoriteQuery.count()).toBe(2)

      const titles = (await FavoriteQuery.find()).map((q) => q.title).sort()
      expect(titles).toEqual(['first.sql', 'second.txt'])
    })

    it('stores the file title and contents on the saved query', async () => {
      const a = await writeQuery(tmpDir, 'greeting.sql', 'SELECT 42;')

      const importer = new QueryImporter()
      await importer.importSelections([a], null)

      // text has select: false, so fetch it explicitly
      const saved = await FavoriteQuery.createQueryBuilder('q')
        .addSelect('q.text')
        .where('q.title = :title', { title: 'greeting.sql' })
        .getOne()
      expect(saved.text).toBe('SELECT 42;')
    })

    it('links imported queries to the given parent folder', async () => {
      const folder = new QueryFolder()
      folder.name = 'Imported'
      await folder.save()

      const a = await writeQuery(tmpDir, 'first.sql')

      const importer = new QueryImporter()
      const stats = await importer.importSelections([a], folder.id)

      expect(stats.items).toBe(1)
      const fromDb = await FavoriteQuery.findOneBy({ title: 'first.sql' })
      expect(fromDb.queryFolderId).toBe(folder.id)
    })

    it('skips files whose extension is not allowed with a warning', async () => {
      const good = await writeQuery(tmpDir, 'good.sql')
      const badPath = path.join(tmpDir, 'data.json')
      await fs.writeFile(badPath, '{}', 'utf-8')

      const importer = new QueryImporter()
      const stats = await importer.importSelections([good, badPath], null)

      expect(stats.items).toBe(1)
      expect(stats.warnings).toHaveLength(1)
      expect(stats.warnings[0]).toContain('files are allowed')
      expect(await FavoriteQuery.count()).toBe(1)
    })
  })

  describe('importDirectory', () => {
    it('creates a folder for the directory and imports its files into it', async () => {
      await writeQuery(tmpDir, 'a.sql')
      await writeQuery(tmpDir, 'b.sql')

      const importer = new QueryImporter()
      const stats = await importer.importDirectory(tmpDir, null)

      expect(stats.directories).toBe(1)
      expect(stats.items).toBe(2)
      expect(stats.warnings).toEqual([])

      const folder = await QueryFolder.findOneBy({ name: path.basename(tmpDir) })
      expect(folder).toBeTruthy()

      const queries = await FavoriteQuery.find()
      expect(queries).toHaveLength(2)
      for (const query of queries) {
        expect(query.queryFolderId).toBe(folder.id)
      }
    })

    it('recurses into subdirectories, creating nested folders', async () => {
      await writeQuery(tmpDir, 'top.sql')
      const subDir = path.join(tmpDir, 'nested')
      await fs.mkdir(subDir)
      await writeQuery(subDir, 'child.sql')

      const importer = new QueryImporter()
      const stats = await importer.importDirectory(tmpDir, null)

      expect(stats.directories).toBe(2)
      expect(stats.items).toBe(2)

      const topFolder = await QueryFolder.findOneBy({ name: path.basename(tmpDir) })
      const nestedFolder = await QueryFolder.findOneBy({ name: 'nested' })
      expect(nestedFolder.parentId).toBe(topFolder.id)

      const child = await FavoriteQuery.findOneBy({ title: 'child.sql' })
      expect(child.queryFolderId).toBe(nestedFolder.id)
    })

    it('imports files directly under the parent when importDir is false', async () => {
      await writeQuery(tmpDir, 'a.sql')

      const importer = new QueryImporter()
      const stats = await importer.importDirectory(tmpDir, null, false)

      expect(stats.directories).toBe(0)
      expect(stats.items).toBe(1)
      expect(await QueryFolder.count()).toBe(0)

      const query = await FavoriteQuery.findOneBy({ title: 'a.sql' })
      expect(query.queryFolderId).toBeNull()
    })

    it('skips non-sql files in the directory with a warning', async () => {
      await writeQuery(tmpDir, 'a.sql')
      await fs.writeFile(path.join(tmpDir, 'readme.md'), '# hi', 'utf-8')

      const importer = new QueryImporter()
      const stats = await importer.importDirectory(tmpDir, null)

      expect(stats.items).toBe(1)
      expect(stats.warnings.some((w) => w.includes('files are allowed'))).toBe(true)
    })
  })
})
