import fs from 'fs'
import os from 'os'
import path from 'path'

// jest.mock factories run before the surrounding module evaluates, so the
// values they reference must be prefixed with `mock` or accessed via globals.
const mockTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-clear-logs-mig-'))
const mockFileClear = jest.fn()

jest.mock('electron', () => ({
  app: { getPath: () => mockTmpDir },
}))

jest.mock('@bksLogger', () => ({
  transports: { file: { getFile: () => ({ clear: mockFileClear }) } },
  scope: () => ({
    warn: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    error: () => undefined,
  }),
}))

// Import after mocks are declared.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const migration = require('@/migration/20260527_clear_log_files').default

function write(file: string, contents = 'sensitive') {
  fs.writeFileSync(path.join(mockTmpDir, file), contents)
}

function exists(file: string) {
  return fs.existsSync(path.join(mockTmpDir, file))
}

function read(file: string) {
  return fs.readFileSync(path.join(mockTmpDir, file), 'utf8')
}

afterEach(() => {
  for (const f of fs.readdirSync(mockTmpDir)) {
    fs.unlinkSync(path.join(mockTmpDir, f))
  }
  mockFileClear.mockClear()
})

afterAll(() => {
  fs.rmSync(mockTmpDir, { recursive: true, force: true })
})

describe('20260527_clear_log_files migration', () => {
  it('has the expected migration shape', () => {
    expect(migration.name).toBe('20260527_clear_log_files')
    expect(typeof migration.run).toBe('function')
  })

  it('calls log.transports.file.getFile().clear() for the main file', async () => {
    await migration.run()
    expect(mockFileClear).toHaveBeenCalledTimes(1)
  })

  it('truncates known log files in the logs directory', async () => {
    write('main.log')
    write('utility.log')
    write('renderer.log')

    await migration.run()

    expect(read('main.log')).toBe('')
    expect(read('utility.log')).toBe('')
    expect(read('renderer.log')).toBe('')
  })

  it('removes rotated *.old.log files', async () => {
    write('main.old.log')
    write('utility.old.log')
    write('renderer.old.log')
    write('keep-me.log')

    await migration.run()

    expect(exists('main.old.log')).toBe(false)
    expect(exists('utility.old.log')).toBe(false)
    expect(exists('renderer.old.log')).toBe(false)
    // Arbitrary .log files outside the known list are left alone.
    expect(exists('keep-me.log')).toBe(true)
    expect(read('keep-me.log')).toBe('sensitive')
  })

  it('does not throw when log files are missing', async () => {
    await expect(migration.run()).resolves.not.toThrow()
  })

  it('keeps going if one truncate fails', async () => {
    write('main.log', 'main contents')
    write('utility.log', 'utility contents')

    const original = fs.writeFileSync
    const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation((file, data, opts) => {
      if (String(file).endsWith('main.log')) {
        throw new Error('locked')
      }
      return original(file as fs.PathOrFileDescriptor, data as string | NodeJS.ArrayBufferView, opts as fs.WriteFileOptions)
    })

    await migration.run()

    expect(read('utility.log')).toBe('')
    spy.mockRestore()
  })

  it('keeps going if one *.old.log deletion fails', async () => {
    write('one.old.log', 'a')
    write('two.old.log', 'b')

    const original = fs.unlinkSync
    const spy = jest.spyOn(fs, 'unlinkSync').mockImplementation((file) => {
      if (String(file).endsWith('one.old.log')) {
        throw new Error('locked')
      }
      return original(file as fs.PathLike)
    })

    await migration.run()

    expect(exists('two.old.log')).toBe(false)
    spy.mockRestore()
  })

  it('does not throw if logs directory is unreadable', async () => {
    const spy = jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('boom')
    })
    await expect(migration.run()).resolves.not.toThrow()
    spy.mockRestore()
  })
})
