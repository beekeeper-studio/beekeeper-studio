import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { ConnectionImporter } from '@/backend/lib/objectimport/connection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { ConnectionFolder } from '@/common/appdb/models/ConnectionFolder'

let tmpDir: string

async function writeConn(dir: string, fileName: string, overrides: Record<string, any> = {}) {
  const contents = JSON.stringify({
    name: path.parse(fileName).name,
    connectionType: 'sqlite',
    defaultDatabase: ':memory:',
    ...overrides,
  })
  const filePath = path.join(dir, fileName)
  await fs.writeFile(filePath, contents, 'utf-8')
  return filePath
}

describe('ConnectionImporter (local)', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'conn-import-'))
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('importSelections', () => {
    it('imports selected .json files into the database', async () => {
      const a = await writeConn(tmpDir, 'alpha.json', { name: 'Alpha' })
      const b = await writeConn(tmpDir, 'beta.json', { name: 'Beta' })

      const importer = new ConnectionImporter()
      const stats = await importer.importSelections([a, b], null)

      expect(stats.items).toBe(2)
      expect(stats.warnings).toEqual([])
      expect(await SavedConnection.count()).toBe(2)

      const names = (await SavedConnection.find()).map((c) => c.name).sort()
      expect(names).toEqual(['Alpha', 'Beta'])
    })

    it('links imported connections to the given parent folder', async () => {
      const folder = new ConnectionFolder()
      folder.name = 'Imported'
      await folder.save()

      const a = await writeConn(tmpDir, 'alpha.json', { name: 'Alpha' })

      const importer = new ConnectionImporter()
      const stats = await importer.importSelections([a], folder.id)

      expect(stats.items).toBe(1)
      const fromDb = await SavedConnection.findOneBy({ name: 'Alpha' })
      expect(fromDb.connectionFolderId).toBe(folder.id)
    })

    it('skips non-.json files with a warning', async () => {
      const good = await writeConn(tmpDir, 'good.json', { name: 'Good' })
      const badPath = path.join(tmpDir, 'notes.txt')
      await fs.writeFile(badPath, 'not a connection', 'utf-8')

      const importer = new ConnectionImporter()
      const stats = await importer.importSelections([good, badPath], null)

      expect(stats.items).toBe(1)
      expect(stats.warnings).toHaveLength(1)
      expect(stats.warnings[0]).toContain('only .json files are allowed')
      expect(await SavedConnection.count()).toBe(1)
    })

    it('warns and skips files that are not valid json', async () => {
      const good = await writeConn(tmpDir, 'good.json', { name: 'Good' })
      const brokenPath = path.join(tmpDir, 'broken.json')
      await fs.writeFile(brokenPath, '{ not valid json', 'utf-8')

      const importer = new ConnectionImporter()
      const stats = await importer.importSelections([good, brokenPath], null)

      expect(stats.items).toBe(1)
      expect(stats.warnings).toHaveLength(1)
      expect(stats.warnings[0]).toContain('Failed to parse json')
      expect(await SavedConnection.count()).toBe(1)
    })
  })

  describe('importDirectory', () => {
    it('creates a folder for the directory and imports its files into it', async () => {
      await writeConn(tmpDir, 'alpha.json', { name: 'Alpha' })
      await writeConn(tmpDir, 'beta.json', { name: 'Beta' })

      const importer = new ConnectionImporter()
      const stats = await importer.importDirectory(tmpDir, null)

      expect(stats.directories).toBe(1)
      expect(stats.items).toBe(2)
      expect(stats.warnings).toEqual([])

      const folder = await ConnectionFolder.findOneBy({ name: path.basename(tmpDir) })
      expect(folder).toBeTruthy()

      const conns = await SavedConnection.find()
      expect(conns).toHaveLength(2)
      for (const conn of conns) {
        expect(conn.connectionFolderId).toBe(folder.id)
      }
    })

    it('recurses into subdirectories, creating nested folders', async () => {
      await writeConn(tmpDir, 'top.json', { name: 'Top' })
      const subDir = path.join(tmpDir, 'nested')
      await fs.mkdir(subDir)
      await writeConn(subDir, 'child.json', { name: 'Child' })

      const importer = new ConnectionImporter()
      const stats = await importer.importDirectory(tmpDir, null)

      expect(stats.directories).toBe(2)
      expect(stats.items).toBe(2)

      const topFolder = await ConnectionFolder.findOneBy({ name: path.basename(tmpDir) })
      const nestedFolder = await ConnectionFolder.findOneBy({ name: 'nested' })
      expect(topFolder).toBeTruthy()
      expect(nestedFolder).toBeTruthy()
      expect(nestedFolder.parentId).toBe(topFolder.id)

      const child = await SavedConnection.findOneBy({ name: 'Child' })
      expect(child.connectionFolderId).toBe(nestedFolder.id)
    })

    it('imports files directly under the parent when importDir is false', async () => {
      await writeConn(tmpDir, 'alpha.json', { name: 'Alpha' })

      const importer = new ConnectionImporter()
      const stats = await importer.importDirectory(tmpDir, null, false)

      expect(stats.directories).toBe(0)
      expect(stats.items).toBe(1)
      expect(await ConnectionFolder.count()).toBe(0)

      const conn = await SavedConnection.findOneBy({ name: 'Alpha' })
      expect(conn.connectionFolderId).toBeNull()
    })

    it('skips .git directories with a warning', async () => {
      await writeConn(tmpDir, 'alpha.json', { name: 'Alpha' })
      const gitDir = path.join(tmpDir, '.git')
      await fs.mkdir(gitDir)
      await writeConn(gitDir, 'ignored.json', { name: 'Ignored' })

      const importer = new ConnectionImporter()
      const stats = await importer.importDirectory(tmpDir, null)

      expect(stats.items).toBe(1)
      expect(stats.warnings).toContain('Skipping folder: .git')
      expect(await SavedConnection.findOneBy({ name: 'Ignored' })).toBeNull()
    })
  })
})
