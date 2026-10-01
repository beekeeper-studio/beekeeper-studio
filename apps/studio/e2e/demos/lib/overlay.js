// Injected into the Beekeeper renderer to make a recorded demo readable:
// a visible cursor that follows Playwright's synthetic mouse, click ripples,
// hand-drawn circles around click targets, lower-third captions, full-screen
// cards, keyboard badges and element spotlights (optionally dimming the rest).
// Exposes window.__demo; everything sits above the app and ignores the pointer.
(() => {
  if (window.__demo) return

  const Z = 2147483000
  const style = document.createElement('style')
  style.textContent = `
    #demo-cursor {
      position: fixed; left: 0; top: 0; width: 26px; height: 26px;
      pointer-events: none; z-index: ${Z + 10};
      transform: translate(-100px, -100px);
      filter: drop-shadow(0 2px 3px rgba(0,0,0,.45));
      transition: opacity .2s;
    }
    .demo-ripple {
      position: fixed; width: 36px; height: 36px; margin: -18px 0 0 -18px;
      border-radius: 50%; border: 3px solid #fbbf24; pointer-events: none;
      z-index: ${Z + 9}; animation: demo-ripple .55s ease-out forwards;
    }
    @keyframes demo-ripple {
      from { transform: scale(.3); opacity: 1 }
      to   { transform: scale(1.6); opacity: 0 }
    }
    #demo-caption {
      position: fixed; left: 50%; bottom: 46px; z-index: ${Z + 5};
      transform: translate(-50%, 16px); opacity: 0;
      max-width: 84vw; padding: 14px 26px 15px; border-radius: 12px;
      background: rgba(17, 17, 21, .92); color: #f5f5f4;
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 12px 40px rgba(0,0,0,.45);
      font: 500 21px/1.4 "Inter", "Segoe UI", system-ui, sans-serif;
      letter-spacing: .1px; text-align: center; pointer-events: none;
      transition: opacity .35s ease, transform .35s ease;
    }
    #demo-caption.show { opacity: 1; transform: translate(-50%, 0) }
    #demo-caption .kicker {
      display: block; margin-bottom: 4px;
      font-size: 13px; font-weight: 700; letter-spacing: 1.6px;
      text-transform: uppercase; color: #fbbf24;
    }
    #demo-caption code, #demo-card code {
      font: 600 .92em "JetBrains Mono", "Fira Code", monospace;
      background: rgba(255,255,255,.1); padding: 1px 6px; border-radius: 5px;
    }
    #demo-card {
      position: fixed; inset: 0; z-index: ${Z + 20};
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at 30% 20%, #2a2418 0%, #141416 55%, #0d0d0f 100%);
      color: #f5f5f4; opacity: 0; pointer-events: none;
      transition: opacity .6s ease;
      font-family: "Inter", "Segoe UI", system-ui, sans-serif; text-align: center;
    }
    #demo-card.show { opacity: 1 }
    #demo-card .logo { width: 92px; height: 92px; margin-bottom: 20px; filter: drop-shadow(0 6px 18px rgba(251,191,36,.25)) }
    #demo-card .eyebrow {
      font-size: 17px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
      color: #fbbf24; margin-bottom: 18px;
    }
    #demo-card h1 {
      font-size: 54px; font-weight: 800; margin: 0 0 18px; letter-spacing: -1px;
      max-width: 80vw; line-height: 1.12;
    }
    #demo-card p {
      font-size: 24px; font-weight: 400; margin: 0; color: #c9c5bd; max-width: 62vw; line-height: 1.45;
    }
    #demo-card ul {
      list-style: none; padding: 0; margin: 26px 0 0; text-align: left;
      font-size: 24px; line-height: 1.5; color: #e7e5e4;
    }
    #demo-card li { margin: 10px 0; padding-left: 38px; position: relative }
    #demo-card li::before {
      content: "✓"; position: absolute; left: 4px; top: 0;
      color: #fbbf24; font-weight: 800;
    }
    #demo-card .footer { margin-top: 40px; font-size: 18px; color: #a8a29e }
    #demo-card .ticket {
      margin-top: 28px; padding: 18px 26px; border-radius: 12px; text-align: left;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
      font-size: 21px; line-height: 1.5; color: #e7e5e4; max-width: 60vw;
    }
    #demo-card .ticket b { color: #fbbf24; font-weight: 700 }
    #demo-keys {
      position: fixed; z-index: ${Z + 6}; pointer-events: none;
      display: flex; gap: 8px; align-items: center; opacity: 0;
      transform: translateY(6px); transition: opacity .2s ease, transform .2s ease;
      padding: 10px 14px; border-radius: 12px; background: rgba(17,17,21,.9);
      box-shadow: 0 8px 28px rgba(0,0,0,.35);
      font: 600 18px/1 "Inter", "Segoe UI", system-ui, sans-serif; color: #f5f5f4;
    }
    #demo-keys.show { opacity: 1; transform: translateY(0) }
    #demo-keys kbd {
      display: inline-block; min-width: 18px; padding: 7px 11px 8px; border-radius: 7px;
      background: #2b2b31; border: 1px solid #4a4a52; border-bottom-width: 3px;
      font: 700 17px/1 "Inter", "Segoe UI", system-ui, sans-serif; color: #fff; text-align: center;
    }
    #demo-keys .plus { color: #a8a29e; font-weight: 500 }
    .demo-mark {
      position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
      pointer-events: none; z-index: ${Z + 8}; overflow: visible;
      transition: opacity .35s ease;
    }
    .demo-mark.fade { opacity: 0 }
    .demo-mark path {
      fill: none; stroke: #f59e0b; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round;
      filter: drop-shadow(0 0 5px rgba(245,158,11,.55));
    }
    .demo-dim {
      position: fixed; pointer-events: none; z-index: ${Z + 3}; border-radius: 8px;
      box-shadow: 0 0 0 200vmax rgba(12,12,16,.42);
      animation: demo-fade-in .35s ease-out;
    }
    @keyframes demo-fade-in { from { opacity: 0 } to { opacity: 1 } }
    .demo-spot {
      position: fixed; pointer-events: none; z-index: ${Z + 4};
      border: 3px solid #fbbf24; border-radius: 8px;
      box-shadow: 0 0 0 4px rgba(251,191,36,.25), 0 0 24px rgba(251,191,36,.45);
      animation: demo-pulse 1.2s ease-in-out infinite; transition: opacity .3s;
    }
    @keyframes demo-pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(251,191,36,.25), 0 0 18px rgba(251,191,36,.35) }
      50%      { box-shadow: 0 0 0 8px rgba(251,191,36,.15), 0 0 30px rgba(251,191,36,.6) }
    }
  `
  document.head.appendChild(style)

  const cursor = document.createElement('div')
  cursor.id = 'demo-cursor'
  cursor.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26">
    <path d="M4 2.5 L4 19.5 L8.6 15.4 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z"
      fill="#ffffff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`
  document.body.appendChild(cursor)

  const ripple = (x, y) => {
    const r = document.createElement('div')
    r.className = 'demo-ripple'
    r.style.left = x + 'px'
    r.style.top = y + 'px'
    document.body.appendChild(r)
    setTimeout(() => r.remove(), 600)
  }
  const move = (x, y) => { cursor.style.transform = `translate(${x - 4}px, ${y - 2}px)` }
  document.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true)
  document.addEventListener('mousedown', (e) => ripple(e.clientX, e.clientY), true)

  const caption = document.createElement('div')
  caption.id = 'demo-caption'
  document.body.appendChild(caption)

  const card = document.createElement('div')
  card.id = 'demo-card'
  document.body.appendChild(card)

  const keys = document.createElement('div')
  keys.id = 'demo-keys'
  document.body.appendChild(keys)
  let keysTimer = null

  const spots = []
  const marks = new Map()
  let markSeq = 0
  const SVG = 'http://www.w3.org/2000/svg'

  // A slightly wobbly ellipse drawn a bit past a full turn, like circling with a marker.
  const circlePath = (r, pad) => {
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2
    // Narrower than a circumscribed ellipse so it doesn't spill onto neighbouring buttons.
    const rx = 1.18 * r.width / 2 + pad, ry = 1.5 * r.height / 2 + pad
    const tilt = -0.07, start = -2.2, sweep = Math.PI * 2 + 0.55, steps = 72
    let d = ''
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const a = start + sweep * t
      const k = 1.03 - 0.05 * t + 0.02 * Math.sin(3 * a + 1)
      const x = rx * k * Math.cos(a), y = ry * k * Math.sin(a)
      const px = cx + x * Math.cos(tilt) - y * Math.sin(tilt)
      const py = cy + x * Math.sin(tilt) + y * Math.cos(tilt)
      d += (i ? ' L ' : 'M ') + px.toFixed(1) + ' ' + py.toFixed(1)
    }
    return d
  }
  // Rounded rectangle traced clockwise from the top-left, overshooting the start a little.
  const boxPath = (r, pad) => {
    const x = r.x - pad, y = r.y - pad, w = r.width + pad * 2, h = r.height + pad * 2
    const c = Math.min(10, h / 2, w / 2)
    return `M ${x + c} ${y} H ${x + w - c} Q ${x + w} ${y} ${x + w} ${y + c} V ${y + h - c} ` +
      `Q ${x + w} ${y + h} ${x + w - c} ${y + h} H ${x + c} Q ${x} ${y + h} ${x} ${y + h - c} ` +
      `V ${y + c} Q ${x} ${y} ${x + c} ${y} H ${x + c + Math.min(24, w / 3)}`
  }
  const place = (el, rect, pad) => Object.assign(el.style, {
    left: (rect.x - pad) + 'px', top: (rect.y - pad) + 'px',
    width: (rect.width + pad * 2) + 'px', height: (rect.height + pad * 2) + 'px',
  })

  window.__demo = {
    caption(html, kicker) {
      caption.innerHTML = (kicker ? `<span class="kicker">${kicker}</span>` : '') + html
      caption.classList.add('show')
    },
    hideCaption() { caption.classList.remove('show') },
    card(html) { card.innerHTML = html; card.classList.add('show') },
    hideCard() { card.classList.remove('show') },
    // Pulsing outline around a rect; `dim` also darkens everything outside it.
    spotlight(rect, pad = 6, dim = false) {
      if (dim) {
        const m = document.createElement('div')
        m.className = 'demo-dim'
        place(m, rect, pad)
        document.body.appendChild(m)
        spots.push(m)
      }
      const s = document.createElement('div')
      s.className = 'demo-spot'
      place(s, rect, pad)
      document.body.appendChild(s)
      spots.push(s)
    },
    clearSpotlights() { spots.splice(0).forEach((s) => s.remove()) },
    // Draw a circle (or a box, for wide targets) around a rect; returns an id for unmark().
    mark(rect, { shape = 'auto', pad = 6, ms = 420 } = {}) {
      const kind = shape === 'auto' ? (rect.width / Math.max(rect.height, 1) > 3.2 ? 'box' : 'circle') : shape
      const svg = document.createElementNS(SVG, 'svg')
      svg.setAttribute('class', 'demo-mark')
      const path = document.createElementNS(SVG, 'path')
      path.setAttribute('d', kind === 'circle' ? circlePath(rect, pad) : boxPath(rect, pad))
      svg.appendChild(path)
      document.body.appendChild(svg)
      const len = path.getTotalLength()
      path.style.strokeDasharray = `${len}`
      path.style.strokeDashoffset = `${len}`
      path.getBoundingClientRect() // commit the start state before animating
      path.style.transition = `stroke-dashoffset ${ms}ms ease-out`
      path.style.strokeDashoffset = '0'
      const id = ++markSeq
      marks.set(id, svg)
      return id
    },
    unmark(id) {
      const svg = marks.get(id)
      if (!svg) return
      marks.delete(id)
      svg.classList.add('fade')
      setTimeout(() => svg.remove(), 400)
    },
    clearMarks() { Array.from(marks.keys()).forEach((id) => window.__demo.unmark(id)) },
    ripple,
    keys(combo, x, y, ms = 1400) {
      keys.innerHTML = combo.split('+').map((k) => `<kbd>${k.trim()}</kbd>`).join('<span class="plus">+</span>')
      keys.style.left = x + 'px'
      keys.style.top = y + 'px'
      keys.classList.add('show')
      clearTimeout(keysTimer)
      keysTimer = setTimeout(() => keys.classList.remove('show'), ms)
    },
  }
})()
