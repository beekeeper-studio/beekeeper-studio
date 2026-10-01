// "Director" API for scripting a readable screen recording with Playwright:
// eased cursor movement, human-ish typing, captions, cards, spotlights,
// circled click targets, keyboard badges, scene marks and an SRT transcript.
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class Director {
  // marks: what click() draws around its target by default: 'auto' (circle,
  // or a box for wide targets), 'circle', 'box' or false.
  constructor(page, { overlayFile = path.join(HERE, 'overlay.js'), log = () => {}, marks = 'auto' } = {}) {
    this.page = page
    this.overlaySrc = fs.readFileSync(overlayFile, 'utf8')
    this.mouse = { x: 760, y: 470 }
    this.log = log
    this.marksDefault = marks
    this.t0 = null
    this.marks = []
    this.subs = [] // { start, end, text }
  }

  wait(ms) { return wait(ms) }

  async inject() {
    await this.page.evaluate(this.overlaySrc)
    await this.page.mouse.move(this.mouse.x, this.mouse.y)
  }

  // Scene marks become chapters (see finalize.mjs); times are seconds from t0.
  mark(label) {
    const t = this.now()
    this.marks.push({ t, label })
    this.log(`[${t.toFixed(1)}s] ${label}`)
  }

  // ---- cursor ------------------------------------------------------------
  async moveTo(x, y, ms) {
    const dist = Math.hypot(x - this.mouse.x, y - this.mouse.y)
    const duration = ms ?? Math.min(900, Math.max(320, dist * 0.9))
    const steps = Math.max(10, Math.round(duration / 16))
    const { x: sx, y: sy } = this.mouse
    for (let i = 1; i <= steps; i++) {
      const e = ease(i / steps)
      await this.page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e)
      await wait(duration / steps)
    }
    this.mouse = { x, y }
  }

  async box(target) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target
    await loc.waitFor({ state: 'visible', timeout: 15000 })
    const b = await loc.boundingBox()
    if (!b) throw new Error(`no bounding box for ${target}`)
    return b
  }

  async hover(target, { dx = 0, dy = 0, ms } = {}) {
    const b = await this.box(target)
    await this.moveTo(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, ms)
    return b
  }

  // The mark around the target draws while the cursor travels, so it costs no extra time.
  async click(target, { dbl = false, right = false, dx = 0, dy = 0, ms, pause = 140, mark = this.marksDefault, markHold = 700 } = {}) {
    const b = await this.box(target)
    const id = mark ? await this.drawMark(b, mark) : null
    await this.moveTo(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, ms)
    await wait(pause)
    const { x, y } = this.mouse
    if (dbl) await this.page.mouse.dblclick(x, y)
    else await this.page.mouse.click(x, y, { button: right ? 'right' : 'left' })
    await wait(220)
    this.unmarkLater(id, markHold)
  }

  // ---- marks -------------------------------------------------------------
  drawMark(b, shape = 'auto') {
    return this.page.evaluate(([b, s]) => window.__demo.mark(b, { shape: s }), [b, shape])
  }
  // Mark something before acting on it, e.g. while a caption explains it.
  async markOn(target, shape = 'auto') {
    return this.drawMark(await this.box(target), shape)
  }
  async unmark(id) {
    if (id) await this.page.evaluate((i) => window.__demo.unmark(i), id)
  }
  unmarkLater(id, ms = 700) {
    if (id) setTimeout(() => this.unmark(id).catch(() => {}), ms)
  }

  // ---- keyboard ----------------------------------------------------------
  async type(text, { min = 38, max = 85 } = {}) {
    for (const ch of text) {
      if (ch === '\n') {
        await this.page.keyboard.press('Escape') // close any autocomplete first
        await this.page.keyboard.press('Enter')
      } else {
        await this.page.keyboard.type(ch)
      }
      const slow = ch === ' ' || ch === ',' ? 25 : 0
      await wait(min + Math.random() * (max - min) + slow)
    }
  }

  // Click a field, box it while typing, then remove the box.
  async typeInto(target, text, opts = {}) {
    const id = this.marksDefault ? await this.markOn(target, 'box') : null
    await this.click(target, { mark: false })
    await this.type(text, opts)
    await this.unmark(id)
  }

  // Press a key combo; shortcuts get an on-screen keycap badge near the cursor.
  async press(combo, { badge = true, at } = {}) {
    if (badge) {
      const label = combo.replace('Control', 'Ctrl')
      const pos = at || { x: this.mouse.x + 24, y: this.mouse.y + 26 }
      await this.page.evaluate(([l, x, y]) => window.__demo.keys(l, x, y), [label, pos.x, pos.y])
      await wait(380)
    }
    await this.page.keyboard.press(combo)
  }

  // ---- subtitles ---------------------------------------------------------
  now() { return this.t0 ? (Date.now() - this.t0) / 1000 : 0 }
  openSub(html) {
    this.closeSub()
    const text = html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').replace(/\s+\./g, '.').trim()
    if (this.t0) this.subs.push({ start: this.now(), end: null, text })
  }
  closeSub() {
    const last = this.subs[this.subs.length - 1]
    if (last && last.end === null) last.end = this.now()
  }
  writeSrt(file) {
    this.closeSub()
    const fmt = (t) => {
      const ms = Math.max(0, Math.round(t * 1000))
      const h = String(Math.floor(ms / 3600000)).padStart(2, '0')
      const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0')
      const sec = String(Math.floor(ms / 1000) % 60).padStart(2, '0')
      return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`
    }
    const body = this.subs.filter((x) => x.text && x.end - x.start > 0.3)
      .map((x, i) => `${i + 1}\n${fmt(x.start)} --> ${fmt(x.end)}\n${x.text}\n`).join('\n')
    fs.writeFileSync(file, body)
  }

  // ---- overlays ----------------------------------------------------------
  async caption(html, kicker, holdMs = 0) {
    this.openSub(html)
    await this.page.evaluate(([h, k]) => window.__demo.caption(h, k), [html, kicker || ''])
    if (holdMs) await wait(holdMs)
  }
  async hideCaption(ms = 350) {
    this.closeSub()
    await this.page.evaluate(() => window.__demo.hideCaption())
    await wait(ms)
  }
  async card(html, holdMs) {
    this.openSub(html.replace(/<img[^>]*>/g, '').replace(/<\/(div|h1|p|li)>/g, '$&. '))
    await this.page.evaluate((h) => window.__demo.card(h), html)
    await wait(650 + holdMs)
  }
  async hideCard() {
    this.closeSub()
    await this.page.evaluate(() => window.__demo.hideCard())
    await wait(650)
  }
  // Pulsing outline around one target, or around the union of several.
  async spotlight(targets, pad = 6, { dim = false } = {}) {
    const list = Array.isArray(targets) ? targets : [targets]
    const boxes = []
    for (const t of list) boxes.push(await this.box(t))
    const x = Math.min(...boxes.map((b) => b.x))
    const y = Math.min(...boxes.map((b) => b.y))
    const r = Math.max(...boxes.map((b) => b.x + b.width))
    const btm = Math.max(...boxes.map((b) => b.y + b.height))
    await this.page.evaluate(([b, p, dm]) => window.__demo.spotlight(b, p, dm), [{ x, y, width: r - x, height: btm - y }, pad, dim])
  }
  // Spotlight just the rendered text of an element (e.g. one CodeMirror line).
  async spotlightText(target, pad = 6, { dim = false } = {}) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target
    await loc.waitFor({ state: 'visible', timeout: 15000 })
    const b = await loc.evaluate((el) => {
      const r = document.createRange()
      r.selectNodeContents(el)
      const rect = r.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
    await this.page.evaluate(([b, p, dm]) => window.__demo.spotlight(b, p, dm), [b, pad, dim])
  }
  async clearSpotlights() {
    await this.page.evaluate(() => window.__demo.clearSpotlights())
  }

  writeMarks(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(this.marks, null, 2))
  }
}
