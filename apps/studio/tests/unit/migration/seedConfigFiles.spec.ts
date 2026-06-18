import fs from 'fs'
import os from 'os'
import path from 'path'

// jest.mock factories run before the surrounding module evaluates, so the
// values they reference must be prefixed with `mock`.
const mockResourcesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-seed-cfg-src-'))
const mockUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-seed-cfg-dest-'))

jest.mock('@/common/platform_info', () => ({
  __esModule: true,
  default: {
    get resourcesPath() {
      return mockResourcesDir
    },
    get userDirectory() {
      return mockUserDir
    },
  },
}))

jest.mock('@bksLogger', () => ({
  __esModule: true,
  default: {
    scope: () => ({
      warn: () => undefined,
      debug: () => undefined,
      info: () => undefined,
      error: () => undefined,
    }),
  },
}))

// Import after mocks are declared.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const migration = require('@/migration/20260618_seed_config_files').default

const CONFIG_FILES = ['default.config.ini', 'user.config.ini']

function writeSource(file: string, contents: string) {
  fs.writeFileSync(path.join(mockResourcesDir, file), contents)
}

function destPath(file: string) {
  return path.join(mockUserDir, file)
}

afterEach(() => {
  for (const dir of [mockResourcesDir, mockUserDir]) {
    for (const f of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, f), { recursive: true, force: true })
    }
  }
})

afterAll(() => {
  fs.rmSync(mockResourcesDir, { recursive: true, force: true })
  fs.rmSync(mockUserDir, { recursive: true, force: true })
})

describe('20260618_seed_config_files migration', () => {
  it('has the expected migration shape', () => {
    expect(migration.name).toBe('20260618_seed_config_files')
    expect(typeof migration.run).toBe('function')
  })

  it('copies bundled config files into the user directory when missing', async () => {
    writeSource('default.config.ini', '; bundled default')
    writeSource('user.config.ini', '; user template')

    await migration.run()

    expect(fs.readFileSync(destPath('default.config.ini'), 'utf8')).toBe('; bundled default')
    expect(fs.readFileSync(destPath('user.config.ini'), 'utf8')).toBe('; user template')
  })

  it('creates the user directory if it does not exist', async () => {
    const nested = path.join(mockUserDir, 'nested', 'config')
    fs.rmSync(nested, { recursive: true, force: true })
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const platformInfo = require('@/common/platform_info').default
    const spy = jest
      .spyOn(platformInfo, 'userDirectory', 'get')
      .mockReturnValue(nested)

    writeSource('user.config.ini', '; user template')

    await migration.run()

    expect(fs.existsSync(nested)).toBe(true)
    expect(fs.readFileSync(path.join(nested, 'user.config.ini'), 'utf8')).toBe('; user template')

    spy.mockRestore()
    fs.rmSync(path.join(mockUserDir, 'nested'), { recursive: true, force: true })
  })

  it('does not overwrite an existing destination file', async () => {
    writeSource('user.config.ini', '; bundled template')
    fs.writeFileSync(destPath('user.config.ini'), '; user edits')

    await migration.run()

    expect(fs.readFileSync(destPath('user.config.ini'), 'utf8')).toBe('; user edits')
  })

  it('skips files whose bundled source is absent (e.g. dev)', async () => {
    // No source files written.
    await migration.run()

    for (const file of CONFIG_FILES) {
      expect(fs.existsSync(destPath(file))).toBe(false)
    }
  })

  it('does not throw when copying one file fails', async () => {
    writeSource('default.config.ini', '; bundled default')
    writeSource('user.config.ini', '; user template')

    const original = fs.copyFileSync
    const spy = jest.spyOn(fs, 'copyFileSync').mockImplementation((src, dest, mode) => {
      if (String(dest).endsWith('default.config.ini')) {
        throw new Error('permission denied')
      }
      return original(src as fs.PathLike, dest as fs.PathLike, mode as number)
    })

    await expect(migration.run()).resolves.not.toThrow()
    // The other file is still seeded.
    expect(fs.readFileSync(destPath('user.config.ini'), 'utf8')).toBe('; user template')

    spy.mockRestore()
  })
})
