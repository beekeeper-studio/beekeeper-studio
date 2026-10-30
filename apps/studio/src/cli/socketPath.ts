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
  const resolved = path.resolve(options.userDirectory)
  // Windows paths are case-insensitive, and the app (SHGetKnownFolderPath) and
  // the CLI (%APPDATA%) can spell the same directory differently. Both must
  // land on the same pipe name.
  const hash = createHash('sha1')
    .update(options.isWindows ? resolved.toLowerCase() : resolved)
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

/** The directory name electron derives from package.json `name`: appData/<name>. */
export const APP_DATA_DIR_NAME = 'beekeeper-studio'

export interface HostEnvironment {
  platform: NodeJS.Platform
  homedir: string
  env: NodeJS.ProcessEnv
}

function hostEnvironment(overrides: Partial<HostEnvironment>): HostEnvironment {
  return {
    platform: overrides.platform ?? process.platform,
    homedir: overrides.homedir ?? os.homedir(),
    env: overrides.env ?? process.env,
  }
}

/**
 * Where electron's app.getPath('userData') points for this app, computed
 * without electron so the CLI can find the socket from a plain node process.
 */
export function defaultUserDirectory(overrides: Partial<HostEnvironment> = {}): string {
  const { platform, homedir, env } = hostEnvironment(overrides)
  if (platform === 'win32') {
    return path.join(env.APPDATA || path.join(homedir, 'AppData', 'Roaming'), APP_DATA_DIR_NAME)
  }
  if (platform === 'darwin') {
    return path.join(homedir, 'Library', 'Application Support', APP_DATA_DIR_NAME)
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(homedir, '.config'), APP_DATA_DIR_NAME)
}

function envFlag(value: string | undefined): boolean {
  return !!value && !['0', 'false', 'no', ''].includes(value.trim().toLowerCase())
}

/**
 * The socket the CLI connects to. BKS_CLI_SOCKET overrides everything (odd
 * data directories, portable installs); BKS_CLI_DEV targets a development
 * build of the app.
 */
export function defaultCliSocketPath(overrides: Partial<HostEnvironment> = {}): string {
  const host = hostEnvironment(overrides)
  const override = host.env.BKS_CLI_SOCKET?.trim()
  if (override) return override
  return resolveCliSocketPath({
    userDirectory: defaultUserDirectory(host),
    isWindows: host.platform === 'win32',
    isDevelopment: envFlag(host.env.BKS_CLI_DEV),
  })
}
