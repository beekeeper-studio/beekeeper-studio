import { describe, it, expect } from 'vitest'
import path from 'path'
import { isWindowsPipePath, resolveCliSocketPath, defaultCliSocketPath, defaultUserDirectory } from '@beekeeperstudio/rpc'

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
