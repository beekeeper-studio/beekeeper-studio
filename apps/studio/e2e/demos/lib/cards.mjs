// HTML for the full-screen cards (title, chapter, recap) shown by Director.card().
import fs from 'node:fs'
import path from 'node:path'
import { STUDIO } from './app.mjs'

let logoCache = null
export function logoImg() {
  logoCache ??= fs.readFileSync(path.join(STUDIO, 'public/icons/png/256x256.png')).toString('base64')
  return `<img class="logo" src="data:image/png;base64,${logoCache}">`
}

// Every part is optional; HTML is allowed in all of them (<b> renders in amber
// inside a ticket).
export function card({ logo = false, eyebrow, title, text, ticket, bullets, footer } = {}) {
  return [
    logo ? logoImg() : '',
    eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : '',
    title ? `<h1>${title}</h1>` : '',
    text ? `<p>${text}</p>` : '',
    ticket ? `<div class="ticket">${ticket}</div>` : '',
    bullets ? `<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : '',
    footer ? `<div class="footer">${footer}</div>` : '',
  ].filter(Boolean).join('\n')
}
