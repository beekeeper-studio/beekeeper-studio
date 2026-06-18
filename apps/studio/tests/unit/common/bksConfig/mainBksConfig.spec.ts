import fs from 'fs'
import os from 'os'
import path from 'path'

// jest.mock factories run before the surrounding module evaluates, so the
// values they reference must be prefixed with `mock`.
const mockUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-mainconfig-'))

// Simulate a production build: not dev, not test mode. resolveConfigDir() then
// resolves config files inside platformInfo.userDirectory.
jest.mock('@/common/platform_info', () => ({
  __esModule: true,
  default: {
    isDevelopment: false,
    testMode: false,
    platform: 'linux',
    userDirectory: mockUserDir,
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
const { loadConfig } = require('@/common/bksConfig/mainBksConfig')

afterEach(() => {
  for (const f of fs.readdirSync(mockUserDir)) {
    fs.rmSync(path.join(mockUserDir, f), { recursive: true, force: true })
  }
})

afterAll(() => {
  fs.rmSync(mockUserDir, { recursive: true, force: true })
})

describe('loadConfig (production) is side-effect free', () => {
  it('returns an empty config when user.config.ini is absent, without writing anything', () => {
    const copySpy = jest.spyOn(fs, 'copyFileSync')

    const result = loadConfig('user.config.ini')

    expect(result).toEqual({})
    // The bug (#4405): config load used to try to copy the file and threw
    // ENOENT. It must not touch the filesystem during read.
    expect(copySpy).not.toHaveBeenCalled()
    expect(fs.existsSync(path.join(mockUserDir, 'user.config.ini'))).toBe(false)

    copySpy.mockRestore()
  })

  it('reads user.config.ini when it exists', () => {
    fs.writeFileSync(path.join(mockUserDir, 'user.config.ini'), '[general]\ndataSyncInterval = 12345\n')

    const result = loadConfig('user.config.ini')

    expect(result.general.dataSyncInterval).toBe(12345)
  })
})
