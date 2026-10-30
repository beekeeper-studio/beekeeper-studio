import { createHash } from 'crypto'
import os from 'os'
import path from 'path'

export interface CliSocketPathOptions {
  /** Where the app keeps its data (electron's userData). The socket lives next to app.db. */
  userDirectory: string
  isWindows: boolean
  /** Dev builds use a different socket so they never answer for an installed app, or vice versa. */
  isDevelopment: boolean
  /** Override for tests; defaults to os.tmpdir(). */
  tmpDir?: string
}

// sun_path is 108 bytes on Linux and 104 on macOS. Stay comfortably below.
export const UNIX_SOCKET_PATH_LIMIT = 100

export function isWindowsPipePath(socketPath: string): boolean {
  return /^\\\\[.?]\\pipe\\/.test(socketPath)
}

/**
 * Where the running app listens for `beekeeper-studio cli` requests. Both the
 * app and the CLI client derive it from the same inputs, so there is nothing
 * to discover or configure.
 *
 * Windows gets a named pipe. Everything else gets a unix socket in the user
 * data directory, falling back to the temp directory when that path would be
 * too long for the kernel.
 */
export function resolveCliSocketPath(options: CliSocketPathOptions): string {
  const suffix = options.isDevelopment ? '-dev' : ''
  const hash = createHash('sha1')
    .update(path.resolve(options.userDirectory))
    .digest('hex')
    .slice(0, 12)

  if (options.isWindows) {
    return `\\\\.\\pipe\\beekeeper-studio-cli${suffix}-${hash}`
  }

  const preferred = path.join(options.userDirectory, `cli${suffix}.sock`)
  if (preferred.length < UNIX_SOCKET_PATH_LIMIT) {
    return preferred
  }

  return path.join(options.tmpDir ?? os.tmpdir(), `beekeeper-studio-cli${suffix}-${hash}.sock`)
}
