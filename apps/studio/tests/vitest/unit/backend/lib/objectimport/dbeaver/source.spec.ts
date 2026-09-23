/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { DBEAVER_CREDENTIALS_KEY } from '@/backend/lib/objectimport/dbeaver/crypto'
import { defaultDBeaverWorkspacePaths, findDBeaverWorkspaces, readDBeaverSource } from '@/backend/lib/objectimport/dbeaver/source'
import { DBeaverSource } from '@/backend/lib/objectimport/dbeaver/types'
import {
  DBEAVER_CONFIG_DIR, DBEAVER_EXPORT, DBEAVER_PROJECT, DBEAVER_WORKSPACE, FIXTURE_CONNECTION_COUNT,
} from '@tests/vitest/lib/dbeaverFixtures'

function connectionCount(source: DBeaverSource) {
  return source.projects.flatMap((p) => p.storages).reduce((n, s) => n + Object.keys(s.dataSources.connections).length, 0)
}

function expectGeneralProject(source: DBeaverSource) {
  expect(source.projects).toHaveLength(1)
  const [project] = source.projects
  expect(project.name).toBe('General')
  // default storage first: it carries the folders, connection types and network profiles
  expect(project.storages.map((s) => s.fileName)).toEqual(['data-sources.json', 'data-sources-team.json'])
  expect(connectionCount(source)).toBe(FIXTURE_CONNECTION_COUNT)
  expect(project.storages[0].credentials['postgres-jdbc-1a0cc4aa8c1-4a433466ab963944']['#connection'].password).toBe('pg-secret')
  expect(project.storages[1].credentials['postgres-jdbc-1a0cc4f0000-1111111111111111']['#connection'].password).toBe('team-secret')
  expect(source.warnings).toEqual([])
}

describe('readDBeaverSource', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'dbeaver-source-'))
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('reads every project of a workspace', async () => {
    expectGeneralProject(await readDBeaverSource(DBEAVER_WORKSPACE))
  })

  it('reads a project directory, its .dbeaver directory or one of its data-sources files', async () => {
    expectGeneralProject(await readDBeaverSource(DBEAVER_PROJECT))
    expectGeneralProject(await readDBeaverSource(DBEAVER_CONFIG_DIR))
    expectGeneralProject(await readDBeaverSource(path.join(DBEAVER_CONFIG_DIR, 'data-sources.json')))
  })

  it('reads a DBeaver project export (.dbp) and ignores the .bak files inside it', async () => {
    const source = await readDBeaverSource(DBEAVER_EXPORT)
    expectGeneralProject(source)
    expect(source.projects[0].path).toBe(DBEAVER_EXPORT)
  })

  it('reads the DBeaverData directory above the workspace', async () => {
    const dataDir = path.join(tmp, 'DBeaverData')
    await fs.cp(DBEAVER_WORKSPACE, path.join(dataDir, 'workspace6'), { recursive: true })
    expectGeneralProject(await readDBeaverSource(dataDir))
  })

  it('reads several projects and skips workspace metadata', async () => {
    await fs.cp(DBEAVER_PROJECT, path.join(tmp, 'General'), { recursive: true })
    await fs.cp(DBEAVER_PROJECT, path.join(tmp, 'Client Work'), { recursive: true })
    await fs.mkdir(path.join(tmp, '.metadata', '.dbeaver'), { recursive: true })

    const source = await readDBeaverSource(tmp)
    expect(source.projects.map((p) => p.name)).toEqual(['Client Work', 'General'])
    expect(connectionCount(source)).toBe(FIXTURE_CONNECTION_COUNT * 2)
  })

  it('skips decryption when credentials are not requested', async () => {
    const source = await readDBeaverSource(DBEAVER_WORKSPACE, { credentials: false })
    expect(source.projects[0].storages.every((s) => Object.keys(s.credentials).length === 0)).toBe(true)
  })

  it('warns and keeps the connections when credentials cannot be decrypted', async () => {
    const configDir = path.join(tmp, 'General', '.dbeaver')
    await fs.cp(DBEAVER_CONFIG_DIR, configDir, { recursive: true })
    // e.g. a project protected by a DBeaver master password
    const credentials = await fs.readFile(path.join(configDir, 'credentials-config.json'))
    credentials[credentials.length - 1] ^= 0xff
    await fs.writeFile(path.join(configDir, 'credentials-config.json'), credentials)

    const source = await readDBeaverSource(tmp)
    expect(connectionCount(source)).toBe(FIXTURE_CONNECTION_COUNT)
    expect(source.projects[0].storages[0].credentials).toEqual({})
    expect(source.projects[0].storages[1].credentials).not.toEqual({})
    expect(source.warnings).toHaveLength(1)
    expect(source.warnings[0]).toContain('General/credentials-config.json could not be decrypted')
  })

  it('reads projects without a credentials file', async () => {
    const configDir = path.join(tmp, 'Plain', '.dbeaver')
    await fs.mkdir(configDir, { recursive: true })
    await fs.copyFile(path.join(DBEAVER_CONFIG_DIR, 'data-sources.json'), path.join(configDir, 'data-sources.json'))

    const source = await readDBeaverSource(tmp)
    expect(source.warnings).toEqual([])
    expect(source.projects[0].storages[0].credentials).toEqual({})
  })

  it('warns about unreadable data-sources files', async () => {
    const configDir = path.join(tmp, 'Broken', '.dbeaver')
    await fs.mkdir(configDir, { recursive: true })
    await fs.writeFile(path.join(configDir, 'data-sources.json'), '{ not json')
    await fs.writeFile(path.join(configDir, 'data-sources-null.json'), 'null')

    const source = await readDBeaverSource(tmp)
    expect(source.projects[0].storages).toEqual([])
    expect(source.warnings).toEqual([
      'Skipped Broken/data-sources.json: the file is encrypted or is not valid JSON',
      'Skipped Broken/data-sources-null.json: the file is encrypted or is not valid JSON',
    ])
  })

  it('reads project configuration encrypted with the DBeaver key', async () => {
    const configDir = path.join(tmp, 'Secure', '.dbeaver')
    await fs.mkdir(configDir, { recursive: true })
    const plain = await fs.readFile(path.join(DBEAVER_CONFIG_DIR, 'data-sources.json'))
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-128-cbc', DBEAVER_CREDENTIALS_KEY, iv)
    await fs.writeFile(path.join(configDir, 'data-sources.json'), Buffer.concat([iv, cipher.update(plain), cipher.final()]))
    await fs.copyFile(path.join(DBEAVER_CONFIG_DIR, 'credentials-config.json'), path.join(configDir, 'credentials-config.json'))

    const source = await readDBeaverSource(tmp)
    expect(source.warnings).toEqual([])
    expect(connectionCount(source)).toBe(FIXTURE_CONNECTION_COUNT - 1)
  })

  it('warns about pre-6.1.3 XML projects', async () => {
    await fs.mkdir(path.join(tmp, 'Old'))
    await fs.writeFile(path.join(tmp, 'Old', '.dbeaver-data-sources.xml'), '<data-sources/>')
    await fs.cp(DBEAVER_PROJECT, path.join(tmp, 'General'), { recursive: true })

    const source = await readDBeaverSource(tmp)
    expect(source.projects.map((p) => p.name)).toEqual(['General'])
    expect(source.warnings).toHaveLength(1)
    expect(source.warnings[0]).toContain('Skipped Old: it uses the DBeaver 6.1 (and earlier) XML format')

    // pointing straight at a legacy project explains why nothing can be read
    await expect(readDBeaverSource(path.join(tmp, 'Old'))).rejects.toThrow('Skipped Old: it uses the DBeaver 6.1 (and earlier) XML format')
  })

  it('rejects paths without DBeaver projects', async () => {
    await expect(readDBeaverSource(tmp)).rejects.toThrow('No DBeaver projects found')
    await expect(readDBeaverSource(path.join(tmp, 'missing'))).rejects.toThrow()

    const notes = path.join(tmp, 'notes.txt')
    await fs.writeFile(notes, 'hello')
    await expect(readDBeaverSource(notes)).rejects.toThrow('is not a DBeaver data-sources.json file or project export')
  })
})

describe('DBeaver workspace discovery', () => {
  it('knows the default workspace locations', () => {
    expect(defaultDBeaverWorkspacePaths('darwin', {}, '/Users/me')).toEqual(['/Users/me/Library/DBeaverData/workspace6'])
    expect(defaultDBeaverWorkspacePaths('win32', { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }, 'C:\\Users\\me'))
      .toEqual(['C:\\Users\\me\\AppData\\Roaming\\DBeaverData\\workspace6'])
    expect(defaultDBeaverWorkspacePaths('linux', {}, '/home/me')).toEqual([
      '/home/me/.local/share/DBeaverData/workspace6',
      '/home/me/snap/dbeaver-ce/current/.local/share/DBeaverData/workspace6',
      '/home/me/.var/app/io.dbeaver.DBeaverCommunity/data/DBeaverData/workspace6',
    ])
    expect(defaultDBeaverWorkspacePaths('linux', { XDG_DATA_HOME: '/data' }, '/home/me')[0]).toBe('/data/DBeaverData/workspace6')
  })

  it('summarizes the workspaces that exist', async () => {
    const found = await findDBeaverWorkspaces([path.join(os.tmpdir(), 'no-such-dbeaver-workspace'), DBEAVER_WORKSPACE])
    expect(found).toEqual([{ path: DBEAVER_WORKSPACE, projects: [{ name: 'General', connections: FIXTURE_CONNECTION_COUNT }] }])
  })
})
