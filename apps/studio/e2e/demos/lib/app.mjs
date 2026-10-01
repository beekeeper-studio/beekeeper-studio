// Launch the built Beekeeper Studio app (TEST_MODE, dist/) under a virtual display.
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const HERE = path.dirname(new URL(import.meta.url).pathname)
export const STUDIO = path.resolve(HERE, '../../..')
const require = createRequire(path.join(STUDIO, 'package.json'))
const { _electron: electron } = require('playwright')

export async function launchApp({ display, width = 1920, height = 1080, zoom = 1.25, freshProfile = false, extraArgs = [], env = {} } = {}) {
  // TEST_MODE keeps all app data in apps/studio/tmp.
  const userDir = path.join(STUDIO, 'tmp')
  if (freshProfile) fs.rmSync(userDir, { recursive: true, force: true })
  fs.mkdirSync(userDir, { recursive: true })

  const app = await electron.launch({
    executablePath: require('electron'),
    // "--bks-demo" swallows the app path so Beekeeper doesn't try to open it as a URL.
    args: ['--no-sandbox', `--force-device-scale-factor=${zoom}`, ...extraArgs, '--bks-demo', 'dist/main.js'],
    cwd: STUDIO,
    env: { ...process.env, DISPLAY: display, TEST_MODE: '1', BEEKEEPER_DISABLE_UPDATES: '1', ...env },
    timeout: 60000,
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  // Fill the virtual screen exactly so the recording has no dead space.
  // Window bounds are in DIPs, so divide the physical screen size by the zoom.
  await app.evaluate(({ BrowserWindow }, { width, height }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.setBounds({ x: 0, y: 0, width, height })
    win.show()
    win.focus()
  }, { width: Math.round(width / zoom), height: Math.round(height / zoom) })
  await sleep(1500)
  return { app, page }
}
