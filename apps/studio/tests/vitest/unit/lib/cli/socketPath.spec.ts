import { describe, it, expect } from 'vitest'
import path from 'path'
import { isWindowsPipePath, resolveCliSocketPath, UNIX_SOCKET_PATH_LIMIT } from '@/lib/cli/socketPath'

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
})
