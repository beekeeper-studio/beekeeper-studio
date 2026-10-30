import { describe, it, expect } from 'vitest'
import path from 'path'
import { defaultCliSocketPath, defaultUserDirectory, isWindowsPipePath, resolveCliSocketPath, UNIX_SOCKET_PATH_LIMIT } from '@/cli/socketPath'

describe('resolveCliSocketPath', () => {
  it('puts the socket in the user directory', () => {
    const result = resolveCliSocketPath({ userDirectory: '/home/me/.config/beekeeper-studio', isWindows: false, isDevelopment: false })
    expect(result).toBe(path.join('/home/me/.config/beekeeper-studio', 'cli.sock'))
    expect(isWindowsPipePath(result)).toBe(false)
  })

  it('keeps dev and production sockets apart', () => {
    const prod = resolveCliSocketPath({ userDirectory: '/data', isWindows: false, isDevelopment: false })
    const dev = resolveCliSocketPath({ userDirectory: '/data', isWindows: false, isDevelopment: true })
    expect(dev).not.toBe(prod)
    expect(dev).toContain('cli-dev.sock')
  })

  it('falls back to the temp directory when the path would be too long', () => {
    const userDirectory = '/' + 'x'.repeat(UNIX_SOCKET_PATH_LIMIT)
    const result = resolveCliSocketPath({ userDirectory, isWindows: false, isDevelopment: false, tmpDir: '/tmp' })
    expect(result.startsWith('/tmp/beekeeper-studio-cli-')).toBe(true)
    expect(result.length).toBeLessThan(UNIX_SOCKET_PATH_LIMIT)
    // the same user directory always maps to the same socket
    expect(resolveCliSocketPath({ userDirectory, isWindows: false, isDevelopment: false, tmpDir: '/tmp' })).toBe(result)
  })

  it('uses a named pipe on windows', () => {
    const result = resolveCliSocketPath({ userDirectory: 'C:\\Users\\me\\AppData\\Roaming\\beekeeper-studio', isWindows: true, isDevelopment: false })
    expect(result.startsWith('\\\\.\\pipe\\beekeeper-studio-cli-')).toBe(true)
    expect(isWindowsPipePath(result)).toBe(true)
  })

  it('ignores path casing on windows', () => {
    const lower = resolveCliSocketPath({ userDirectory: 'c:\\users\\me\\appdata\\roaming\\beekeeper-studio', isWindows: true, isDevelopment: false })
    const mixed = resolveCliSocketPath({ userDirectory: 'C:\\Users\\Me\\AppData\\Roaming\\beekeeper-studio', isWindows: true, isDevelopment: false })
    expect(lower).toBe(mixed)
    // elsewhere paths are case sensitive, so the hash must stay case sensitive too
    const a = resolveCliSocketPath({ userDirectory: '/' + 'A'.repeat(UNIX_SOCKET_PATH_LIMIT), isWindows: false, isDevelopment: false, tmpDir: '/tmp' })
    const b = resolveCliSocketPath({ userDirectory: '/' + 'a'.repeat(UNIX_SOCKET_PATH_LIMIT), isWindows: false, isDevelopment: false, tmpDir: '/tmp' })
    expect(a).not.toBe(b)
  })
})

describe('defaultUserDirectory', () => {
  it("matches electron's userData on each platform", () => {
    expect(defaultUserDirectory({ platform: 'linux', homedir: '/home/me', env: {} })).toBe('/home/me/.config/beekeeper-studio')
    expect(defaultUserDirectory({ platform: 'linux', homedir: '/home/me', env: { XDG_CONFIG_HOME: '/xdg' } })).toBe('/xdg/beekeeper-studio')
    expect(defaultUserDirectory({ platform: 'darwin', homedir: '/Users/me', env: {} })).toBe('/Users/me/Library/Application Support/beekeeper-studio')
    expect(defaultUserDirectory({ platform: 'win32', homedir: 'C:\\Users\\me', env: { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' } })).toBe(
      path.join('C:\\Users\\me\\AppData\\Roaming', 'beekeeper-studio')
    )
    expect(defaultUserDirectory({ platform: 'win32', homedir: 'C:\\Users\\me', env: {} })).toBe(
      path.join('C:\\Users\\me', 'AppData', 'Roaming', 'beekeeper-studio')
    )
  })
})

describe('defaultCliSocketPath', () => {
  it('derives the production socket from the user directory', () => {
    const socket = defaultCliSocketPath({ platform: 'linux', homedir: '/home/me', env: {} })
    expect(socket).toBe(resolveCliSocketPath({ userDirectory: '/home/me/.config/beekeeper-studio', isWindows: false, isDevelopment: false }))
    expect(socket.endsWith('cli.sock')).toBe(true)
  })

  it('targets the development socket with BKS_CLI_DEV', () => {
    expect(defaultCliSocketPath({ platform: 'linux', homedir: '/home/me', env: { BKS_CLI_DEV: '1' } }).endsWith('cli-dev.sock')).toBe(true)
    expect(defaultCliSocketPath({ platform: 'linux', homedir: '/home/me', env: { BKS_CLI_DEV: 'false' } }).endsWith('cli.sock')).toBe(true)
  })

  it('lets BKS_CLI_SOCKET override everything', () => {
    expect(defaultCliSocketPath({ platform: 'linux', homedir: '/home/me', env: { BKS_CLI_SOCKET: ' /tmp/custom.sock ', BKS_CLI_DEV: '1' } })).toBe('/tmp/custom.sock')
    expect(defaultCliSocketPath({ platform: 'linux', homedir: '/home/me', env: { BKS_CLI_SOCKET: '   ' } }).endsWith('cli.sock')).toBe(true)
  })

  it('uses a named pipe on windows', () => {
    expect(isWindowsPipePath(defaultCliSocketPath({ platform: 'win32', homedir: 'C:\\Users\\me', env: {} }))).toBe(true)
  })
})
