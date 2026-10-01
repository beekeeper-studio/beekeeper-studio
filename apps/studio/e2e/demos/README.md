# Demo videos

Scripted, reproducible screen recordings of the real Beekeeper Studio app,
for the website and docs. A demo script drives the built app with
Playwright on a virtual display (Xvfb). ffmpeg records the screen and
encodes a silent, web-ready MP4. An overlay injected into the app window
draws the cursor, captions, cards, spotlights and circled clicks; the app
itself is unchanged.

| Folder | What it is |
| --- | --- |
| `lib/` | The toolkit, shared by all demos |
| `_template/` | A starter demo that needs no database. Copy it to begin a new demo |
| `production-safety/` | Full example: three production mistakes and the guardrails that stop them, about 3 minutes |

Playwright's test runner ignores this folder (none of the files are named
`*.test.*`/`*.spec.*`).

## Requirements

- Linux with `Xvfb`, `ffmpeg` and `psql` on the `PATH` (`psql` only for
  demos with a database)
- A built app: from the repo root, `yarn install`, `yarn lib:build`, then
  `yarn workspace beekeeper-studio build`
- Docker (or another Postgres) for demos with data

## Run a demo

```bash
cd apps/studio
node e2e/demos/_template/record.mjs
```

Each run writes to that demo's `out/` folder (gitignored):

- `<name>.mp4` is the final video: H.264, faststart, no audio track
- `<name>.zip` holds the same MP4; use it to hand the file to someone
  whose viewer only plays MP4s inline
- `<name>-poster.png` is a poster frame for `<video poster>`
- `captions.srt` holds every caption with timings; it also works as a
  voiceover script
- `chapters.txt` holds YouTube chapter markers
- `raw.mp4` is the unedited capture, and `marks.json` the scene timestamps

| Variable | Default | Purpose |
| --- | --- | --- |
| `NO_RECORD=1` | off | Skip the screen capture |
| `SHOTS=1` | off | Screenshot after every caption and click, for review |
| `DEMO_ZOOM` | `1.25` | UI scale; larger keeps text readable when the video plays small |
| `DEMO_DISPLAY` | `:99` | X display that Xvfb starts on |
| `OUT_DIR` | `<demo>/out` | Output folder |

Every run wipes `apps/studio/tmp`, the `TEST_MODE` profile, so each take
starts identically.

## Write a demo

Copy `_template/` and edit `record.mjs`. A demo is one `runDemo()` call:

```js
import { runDemo, here, card, prepareProfile, postgresConnection, pgFromEnv, reseed } from '../lib/index.mjs'

const pg = pgFromEnv({ user: 'app_admin', password: 'demo_password' })

await runDemo({
  name: 'beekeeper-my-feature-demo',
  outDir: here(import.meta.url, 'out'),
  setup: () => reseed(pg, { databases: ['shop'], seedFile: here(import.meta.url, 'seed.sql') }),
  prepare: ({ page }) => prepareProfile(page, {
    connections: [postgresConnection({ name: 'Shop — PRODUCTION', database: 'shop', color: 'red', user: pg.user, password: pg.password })],
  }),
  title: card({ logo: true, eyebrow: 'Beekeeper Studio', title: 'My feature', text: 'What the viewer will learn.' }),
  scenes: [
    async ({ d }) => { d.mark('intro'); await d.wait(3000) },
    async ({ d, page }) => {
      d.mark('main')
      await d.hideCard()
      await d.caption('Captions carry the story.', 'Kicker')
      await d.click(page.getByRole('button', { name: 'Connect', exact: true }))
    },
  ],
  chapters: { intro: 'Intro', main: 'The feature' },
})
```

### Director API (`d`)

| Call | Effect |
| --- | --- |
| `click(target, { dbl, right, dx, dy, mark })` | Eased cursor move and click. The target is circled while the cursor travels (`mark: 'auto'`, `'circle'`, `'box'` or `false`) |
| `hover(target)` / `moveTo(x, y)` | Move without clicking |
| `markOn(target, shape)` / `unmark(id)` | Circle something without clicking it, e.g. while a caption explains it |
| `type(text)` | Human-paced typing; `\n` presses Escape (closing autocomplete) and then Enter |
| `typeInto(target, text)` | Click a field and draw a box around it while typing |
| `press(combo, { badge })` | Key press, with an on-screen keycap badge for shortcuts |
| `caption(html, kicker, holdMs)` / `hideCaption()` | Lower-third caption |
| `card(html, holdMs)` / `hideCard()` | Full-screen card; build its HTML with `card({...})` from `lib/cards.mjs` |
| `spotlight(targets, pad, { dim })` | Pulsing outline around one target or the union of several. `dim` darkens everything else |
| `spotlightText(target)` | Spotlight only the rendered text, e.g. one CodeMirror line |
| `clearSpotlights()` | Remove all spotlights |
| `mark(label)` | Scene timestamp; feeds `chapters.txt` |
| `wait(ms)` | Pause |

Targets are Playwright locators or CSS selector strings. Coordinates are
CSS pixels of the app window.
