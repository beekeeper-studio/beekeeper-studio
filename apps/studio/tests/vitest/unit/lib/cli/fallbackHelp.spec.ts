import { describe, it, expect } from 'vitest'
import path from 'path'
import { bksShimPath, cliFallbackHelp, CLI_DOCS_URL } from '@/lib/cli/fallbackHelp'

const base = { isWindows: false, isMac: false, isDevelopment: false, socketPath: '/home/me/.config/beekeeper-studio/cli.sock' }

describe('cliFallbackHelp', () => {
  it('points linux users at the bundled shim and the launcher dispatch', () => {
    const text = cliFallbackHelp({ ...base, resourcesPath: '/opt/Beekeeper Studio/resources' })
    expect(text).toContain(path.join('/opt/Beekeeper Studio/resources', 'bin', 'bks'))
    expect(text).toContain('/usr/bin/bks')
    expect(text).toContain('AppImage')
    expect(text).toContain('bks --help')
    expect(text).toContain(base.socketPath)
    expect(text).toContain('BKS_CLI_SOCKET')
    expect(text).toContain(CLI_DOCS_URL)
    expect(text).toContain('connections, list-schemas, list-tables, list-entities, structure <name>, query <sql>')
  })

  it('suggests a PATH symlink on macOS', () => {
    const resources = '/Applications/Beekeeper Studio.app/Contents/Resources'
    const text = cliFallbackHelp({ ...base, isMac: true, resourcesPath: resources })
    expect(text).toContain(`ln -s "${path.join(resources, 'bin', 'bks')}" /usr/local/bin/bks`)
    expect(text).not.toContain('AppImage')
  })

  it('names the .cmd shim on windows', () => {
    const resources = 'C:\\Program Files\\beekeeper-studio\\resources'
    const text = cliFallbackHelp({ ...base, isWindows: true, resourcesPath: resources, socketPath: '\\\\.\\pipe\\beekeeper-studio-cli-abc' })
    expect(bksShimPath({ resourcesPath: resources, isWindows: true })).toBe(path.join(resources, 'bin', 'bks.cmd'))
    expect(text).toContain(path.join(resources, 'bin', 'bks.cmd'))
    expect(text).toContain('PATH')
  })

  it('tells developers how to run the client from the repo', () => {
    const text = cliFallbackHelp({ ...base, isDevelopment: true, resourcesPath: '/repo/apps/studio/extra_resources', socketPath: '/home/me/.config/beekeeper-studio/cli-dev.sock' })
    expect(text).toContain('BKS_CLI_SOCKET="/home/me/.config/beekeeper-studio/cli-dev.sock" node apps/studio/dist/cli.js')
    expect(text).not.toContain('extra_resources')
  })
})
