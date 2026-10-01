// runDemo(): the whole pipeline for one demo video.
//
//   fresh profile -> launch app on Xvfb -> prepare -> inject overlay
//   -> title card -> record scenes -> stop -> encode + poster + chapters + zip
//
// Environment flags: NO_RECORD=1 (no capture), SHOTS=1 (screenshot after every
// caption and click, for review), DEMO_DISPLAY (default :99), DEMO_ZOOM, OUT_DIR.
import fs from 'node:fs'
import path from 'node:path'
import { startDisplay, startRecording, SCREEN } from './recorder.mjs'
import { launchApp } from './app.mjs'
import { Director } from './director.mjs'
import { finalize } from './finalize.mjs'

export async function runDemo({
  name,                 // output basename, e.g. "beekeeper-production-safety-demo"
  outDir,               // default: ./out next to the calling script (pass import.meta.url's dir)
  setup,                // async () => {}: reset databases etc., before the app starts
  prepare,              // async ({ page, app }) => {}: profile setup, before recording
  title,                // card HTML shown on the very first frame (optional)
  titleText,            // transcript text for the title card (optional)
  scenes,               // [async ({ d, page, app }) => {}], recorded in order
  chapters = {},        // { markLabel: 'Chapter name' } for chapters.txt
  director = {},        // Director options, e.g. { marks: false }
  zoom = Number(process.env.DEMO_ZOOM || 1.25),
  size = SCREEN,
  posterAt = 2,
}) {
  const OUT = process.env.OUT_DIR || outDir
  const RECORD = !process.env.NO_RECORD
  const SHOTS = !!process.env.SHOTS
  fs.mkdirSync(OUT, { recursive: true })

  const x = await startDisplay(process.env.DEMO_DISPLAY || ':99', size)
  let app, rec, d, ok = false
  try {
    if (setup) await setup()
    const launched = await launchApp({ display: x.display, freshProfile: true, zoom, ...size })
    app = launched.app
    const page = launched.page
    page.on('pageerror', (e) => console.log('[pageerror]', e.message))
    if (prepare) await prepare({ page, app })

    d = new Director(page, { log: console.log, ...director })
    await d.inject()
    if (SHOTS) {
      let i = 0
      const shot = (tag) => page.screenshot({ path: path.join(OUT, `shot-${String(++i).padStart(3, '0')}-${tag}.png`) }).catch(() => {})
      const caption = d.caption.bind(d)
      const click = d.click.bind(d)
      d.caption = async (h, k, ms) => { await caption(h, k); await d.wait(500); await shot('caption'); if (ms) await d.wait(Math.max(0, ms - 500)) }
      d.click = async (t, o) => { await click(t, o); await shot('click') }
    }

    if (title) await d.card(title, 0)
    if (RECORD) rec = startRecording(x.display, path.join(OUT, 'raw.mp4'), { size })
    d.t0 = Date.now()
    if (title) d.openSub(titleText || title.replace(/<img[^>]*>/g, '').replace(/<\/(div|h1|p|li)>/g, '$&. '))

    for (const scene of scenes) await scene({ d, page, app })
    d.mark('end')
    ok = true
  } catch (e) {
    console.error('RECORDING FAILED:', e)
    if (app) await (await app.firstWindow()).screenshot({ path: path.join(OUT, 'failure.png') }).catch(() => {})
    process.exitCode = 1
  } finally {
    if (rec) await rec.stop()
    if (d) {
      d.writeMarks(path.join(OUT, 'marks.json'))
      d.writeSrt(path.join(OUT, 'captions.srt'))
    }
    if (app) await app.close().catch(() => {})
    x.stop()
  }
  if (rec && ok) {
    const video = finalize({ outDir: OUT, name, marks: d.marks, chapters, posterAt })
    console.log(`wrote ${video}`)
  }
}

// Directory of the calling module, for outDir: here(import.meta.url, 'out').
export const here = (metaUrl, ...parts) => path.join(path.dirname(new URL(metaUrl).pathname), ...parts)
