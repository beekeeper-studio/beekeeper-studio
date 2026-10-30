import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execFileSync, spawnSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

// The bks shim and the launcher's `cli` dispatch are shell scripts that find
// the app binary relative to themselves. Fake the packaged layouts with a
// stand-in binary (this process's node-mode executable) and a cli.js that
// echoes its arguments.
const shimSource = path.resolve(__dirname, '../../../../build/bks')
const launcherSource = path.resolve(__dirname, '../../../../build/launcher-script.sh')
const unixOnly = process.platform === 'win32' ? describe.skip : describe

const FAKE_CLI = `
process.stdout.write(JSON.stringify({ args: process.argv.slice(2), runAsNode: process.env.ELECTRON_RUN_AS_NODE }))
`

function fakeBinary(target: string) {
  // a real executable file: a script that re-executes this process's node
  fs.writeFileSync(target, `#!/usr/bin/env bash\nexec "${process.execPath}" "$@"\n`)
  fs.chmodSync(target, 0o755)
}

unixOnly('bks shim', () => {
  let root: string

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-shim-'))
  })

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  function linuxLayout(name: string) {
    const app = path.join(root, name)
    fs.mkdirSync(path.join(app, 'resources', 'bin'), { recursive: true })
    fs.copyFileSync(shimSource, path.join(app, 'resources', 'bin', 'bks'))
    fs.chmodSync(path.join(app, 'resources', 'bin', 'bks'), 0o755)
    fs.writeFileSync(path.join(app, 'resources', 'bin', 'cli.js'), FAKE_CLI)
    fakeBinary(path.join(app, 'beekeeper-studio-bin'))
    fs.copyFileSync(launcherSource, path.join(app, 'beekeeper-studio'))
    fs.chmodSync(path.join(app, 'beekeeper-studio'), 0o755)
    return app
  }

  it('runs cli.js with the linux app binary in node mode', () => {
    const app = linuxLayout('linux')
    const out = execFileSync(path.join(app, 'resources', 'bin', 'bks'), ['list-tables', '--schema', 'public'], { encoding: 'utf8' })
    expect(JSON.parse(out)).toEqual({ args: ['list-tables', '--schema', 'public'], runAsNode: '1' })
  })

  it('works through a /usr/bin style symlink', () => {
    const app = linuxLayout('linux-symlink')
    const link = path.join(root, 'bks-link')
    fs.symlinkSync(path.join(app, 'resources', 'bin', 'bks'), link)
    const out = execFileSync(link, ['connections'], { encoding: 'utf8' })
    expect(JSON.parse(out).args).toEqual(['connections'])
  })

  it('is reached from the launcher script via the cli argument', () => {
    const app = linuxLayout('linux-launcher')
    const out = execFileSync(path.join(app, 'beekeeper-studio'), ['cli', 'query', 'select 1'], { encoding: 'utf8', env: { ...process.env, XDG_CONFIG_HOME: root } })
    expect(JSON.parse(out).args).toEqual(['query', 'select 1'])
  })

  it('finds the macOS binary inside the bundle', () => {
    const contents = path.join(root, 'Beekeeper Studio.app', 'Contents')
    fs.mkdirSync(path.join(contents, 'Resources', 'bin'), { recursive: true })
    fs.mkdirSync(path.join(contents, 'MacOS'), { recursive: true })
    fs.copyFileSync(shimSource, path.join(contents, 'Resources', 'bin', 'bks'))
    fs.chmodSync(path.join(contents, 'Resources', 'bin', 'bks'), 0o755)
    fs.writeFileSync(path.join(contents, 'Resources', 'bin', 'cli.js'), FAKE_CLI)
    fakeBinary(path.join(contents, 'MacOS', 'Beekeeper Studio'))
    const out = execFileSync(path.join(contents, 'Resources', 'bin', 'bks'), ['structure', 'users'], { encoding: 'utf8' })
    expect(JSON.parse(out).args).toEqual(['structure', 'users'])
  })

  it('fails clearly when no binary is next to it', () => {
    const app = path.join(root, 'broken')
    fs.mkdirSync(path.join(app, 'resources', 'bin'), { recursive: true })
    fs.copyFileSync(shimSource, path.join(app, 'resources', 'bin', 'bks'))
    fs.chmodSync(path.join(app, 'resources', 'bin', 'bks'), 0o755)
    const result = spawnSync(path.join(app, 'resources', 'bin', 'bks'), ['connections'], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('could not find the Beekeeper Studio executable')
    expect(result.stderr).toContain('BKS_ELECTRON_BINARY')
  })
})
