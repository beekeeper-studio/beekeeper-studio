import path from 'path'

export const CLI_DOCS_URL = 'https://docs.beekeeperstudio.io/user_guide/cli/'

export interface FallbackHelpOptions {
  /** electron's process.resourcesPath for a packaged app */
  resourcesPath: string
  isWindows: boolean
  isMac: boolean
  isDevelopment: boolean
  socketPath: string
}

/** Where the packaged app keeps the bks shim. */
export function bksShimPath(options: Pick<FallbackHelpOptions, 'resourcesPath' | 'isWindows'>): string {
  return path.join(options.resourcesPath, 'bin', options.isWindows ? 'bks.cmd' : 'bks')
}

/**
 * Printed when someone runs `beekeeper-studio cli ...`. The app itself never
 * runs CLI commands: that would boot Chromium for every call. It only points
 * at the bks command that ships next to it.
 */
export function cliFallbackHelp(options: FallbackHelpOptions): string {
  const lines = [
    'The Beekeeper Studio command line interface is the separate `bks` command that ships with the app.',
    'It talks to the running app over a local socket and never starts a second copy of it.',
    '',
  ]

  if (options.isDevelopment) {
    lines.push(
      'Development build: run the client with node, pointed at this build\'s socket:',
      `  BKS_CLI_SOCKET="${options.socketPath}" node apps/studio/dist/cli.js <command>`
    )
  } else {
    const shim = bksShimPath(options)
    lines.push(`This install's copy: ${shim}`)
    if (options.isWindows) {
      lines.push(`  Call it directly, or add ${path.dirname(shim)} to your PATH to use \`bks\`.`)
    } else if (options.isMac) {
      lines.push(`  Put it on your PATH, for example: ln -s "${shim}" /usr/local/bin/bks`)
    } else {
      lines.push(
        '  deb and rpm installs also link it as /usr/bin/bks.',
        '  AppImage: ./Beekeeper-Studio.AppImage cli <command> runs it without starting the app.'
      )
    }
  }

  lines.push(
    '',
    'Usage: bks <command> [options]       (bks --help lists everything)',
    'Commands: connections, list-schemas, list-tables, list-entities, structure <name>, query <sql>',
    '',
    `This app answers CLI requests on ${options.socketPath}`,
    'Set BKS_CLI_SOCKET to that path if bks cannot find it on its own.',
    `Docs: ${CLI_DOCS_URL}`
  )
  return lines.join('\n')
}
