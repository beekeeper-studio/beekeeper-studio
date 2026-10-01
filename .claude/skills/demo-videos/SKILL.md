---
name: demo-videos
description: Record silent, captioned demo videos of the real Beekeeper Studio app for the website, using the Playwright + Xvfb + ffmpeg toolkit in apps/studio/e2e/demos. Use when asked for a demo, product, marketing, tutorial or feature video, a screen recording or a walkthrough of Beekeeper Studio.
---

# Recording Beekeeper Studio demo videos

The toolkit lives in `apps/studio/e2e/demos/` (read its `README.md`):

- `lib/` is the toolkit
- `_template/` is the starter demo; copy it to begin
- `production-safety/` is a complete 3-minute example to copy patterns from

A demo is one `runDemo()` call: setup, then profile preparation, then
scenes. One command records the video and produces a web MP4, zip,
poster, SRT and chapters.

## Ground rules

- **Record the real app against a real database.** Every behaviour on
  screen must actually happen. No mockups and no faked UI states.
- **Show only features that exist.** Before scripting a claim, verify it
  in code: find the component, the exact label, and any license gate such
  as `isUltimate` or `checkAllowReadOnly()`. For example, Beekeeper has
  no warning for `DELETE`/`UPDATE` without `WHERE`. The production demo
  shows Manual commit + Rollback instead. Don't caption features into
  existence.
- **Make it silent and text-driven.** There is no audio track. A title
  card, chapter cards (e.g. a support ticket), captions with a kicker and
  a recap card carry the story. Keep captions to about 15 words, held
  3.5–5 s.
- **Show every action.** Clicks are circled automatically, fields get a
  box while typing (`typeInto`), and shortcuts show a keycap badge
  (`press`). Use `spotlight(..., { dim: true })` for the one thing each
  beat is about.
- **Use fictional data and companies** (Acme …). No real people, brands
  or credentials.
- **Aim for 2–3 minutes**, about three chapters of roughly 50 s each.

## Workflow

1. **Research the feature.** Use an Explore agent on `apps/studio/src`
   (and `src-commercial`). Map exact UI labels, selectors, license
   gating and config flags.
2. **Storyboard.** For each chapter: the persona, a ticket, the mistake
   or task, the guardrail, the payoff. Write the captions first.
3. **Seed data** (`seed.sql`). Make it realistic and shape it to the
   story: look-alike rows, a big table for a scary row count. Make grid
   columns you will edit `varchar`. `text` columns open a textarea
   editor, where Enter inserts a newline instead of committing.
4. **Script.** Copy `_template/`, fill `setup`/`prepare`/`scenes`, and
   use the Director API (table in the toolkit README).
5. **Dry run.** Run `NO_RECORD=1 SHOTS=1 node e2e/demos/<demo>/record.mjs`
   from `apps/studio`, then read `out/shot-*.png`. There is one per
   caption and one per click. Fix selectors, timing and caption overlaps.
6. **Record** with `node e2e/demos/<demo>/record.mjs`.
7. **QA.**
   - Make a contact sheet:
     `ffmpeg -i out/<name>.mp4 -vf "fps=1/6,scale=480:-1,tile=4x8" -frames:v 1 contact.png`.
     Read it, then crop key frames at full resolution.
   - Check the database end state with `psql`.
   - Skim `captions.srt`.
8. **Deliver.** Send `out/<name>.zip` with `SendUserFile` (display:
   attach). The Claude app shows an `.mp4` card as a player with no
   download button, so always send the zip. Also send the poster, SRT and
   chapters when they're useful.
9. **Commit** the scripts and seed only, never videos (`out/` is
   gitignored).

## Environment setup (Claude Code on the web)

- **Proxy.** If `HTTPS_PROXY` is set, run
  `yarn config set proxy $HTTPS_PROXY`,
  `yarn config set https-proxy $HTTPS_PROXY` and
  `yarn config set cafile /root/.ccr/ca-bundle.crt`.
- **`yarn install` 403 on codeload.github.com.** This hits
  `@vue/web-component-wrapper` in `apps/ui-kit/package.json`.
  Temporarily change it to
  `git+https://github.com/beekeeper-studio/vue-web-component-wrapper.git#<same sha>`,
  install, then run `git checkout -- apps/ui-kit/package.json yarn.lock`.
  Never run two installs at once, because that corrupts the yarn cache.
- **Electron download fails** (an undici assert in `@electron/get`):
  1. `curl -L` `electron-v<version>-linux-x64.zip` from the GitHub
     releases page.
  2. Check its sha256 against `node_modules/electron/checksums.json`.
  3. Unzip it into `node_modules/electron/dist`.
  4. Write `electron` into `node_modules/electron/path.txt`.
  5. Re-run `yarn install`.
- **Build.** Run `yarn lib:build && yarn workspace beekeeper-studio build`.
  TEST_MODE loads `dist/`, not the Vite dev server.
- **Docker.** If `docker info` fails, start `dockerd` yourself. Docker Hub
  may return 429; use `mirror.gcr.io/library/postgres:16-alpine`.
- **After a container restart** the disk survives, but `dockerd` and the
  containers stop. Restart `dockerd`, then `docker start <name>`.
- **Don't `pkill -f`** with a pattern that appears in your own command
  line, because it kills your shell. Kill by `ps -eo pid,comm` instead.

## How the toolkit handles the app (for when something breaks)

- The app runs from `dist/main.js` with `TEST_MODE=1`. Its data lives in
  `apps/studio/tmp`, which is wiped every run.
- Positional argv entries are opened as connection URLs. The app path
  therefore follows a dummy `--bks-demo` flag that swallows it.
- Window bounds are in DIPs. To fill the 1920×1080 Xvfb screen, the
  window is set to `1920/zoom × 1080/zoom`.
- A fresh profile is the free edition. `prepareProfile` starts the
  14-day trial (the title bar then reads "Free Trial (14 days left)"),
  dismisses "Don't show again", sets the `hasUsedTransactions` tip flag
  and waits out toasts. It creates saved connections through
  `document.querySelector('.style-wrapper').__vue__.$root`, calling
  `$util.send('appdb/saved/new')` and then
  `$store.dispatch('data/connections/save')`.
- Playwright input never moves the X cursor. The overlay draws a cursor
  that follows `mousemove`, and ffmpeg records with `-draw_mouse 0`.
- These page errors are harmless: Tabulator's `verticalFillMode`, and
  "No database connection found" while reconnecting.

## Selector cheat sheet

| UI | Selector / approach |
| --- | --- |
| Saved connection | `.list-item` with `hasText: <name>`; a click opens its form |
| Connect / Test | `getByRole('button', { name: 'Connect', exact: true })` |
| Read Only Mode | `label[for="readOnlyMode"]` (input `#readOnlyMode`) |
| Connection color radios | `.save-connection input[type=radio][value=red]` |
| Sidebar table | `#tab-tables span.table-name`: double-click to open; right-click for `.BksContextMenu-item` (Drop, Truncate…) |
| Drop/Truncate modal | `[data-modal="dropTruncateModal"]`; Cancel has focus by default |
| Tab header | `.nav-item` with `hasText: <title>` |
| Grid row / cell | `.tabulator-row`, `.tabulator-cell[tabulator-field="<col>"]`; double-click, `Control+A`, type, Enter |
| Raw WHERE filter | `.table-filter button[title="Toggle Filter Type"]`, then `.table-filter input:visible`, then Enter |
| Status bar (portaled) | `.global-status-bar`; `.statusbar.red` (color), `.item-notice` ("Editing Disabled"), `getByText(/affected/)` |
| Pending edits | Reset: `getByRole('button', { name: 'Reset' })`; Apply: `x-buttons.pending-changes > x-button` (first); dropdown: `> x-button[menu]`, then `x-menuitem` "Copy to SQL" |
| Query editor | Click a `.cm-line:visible` to focus; the content box is only as tall as its text. Ctrl+Enter runs all, or the selection |
| Commit mode | `#commit-mode:visible` with `getByText('Manual' / 'Auto', { exact: true })`; `.btn-group:visible` with Commit / Rollback; `.transaction-indicator:visible` |
| Query errors / results | `.error-alert:visible`, `.result-table` |
| Connection menu | Open with `.connection-button x-button` (a xel menu that toggles); items are `.connection-button x-menuitem` (Disconnect, Edit Connection) |

## Output settings

`lib/finalize.mjs` encodes libx264 `-preset slow -crf 20 -profile:v high`,
`yuv420p`, `+faststart` and `-an`, with a 0.6 s fade in and a 1 s fade
out. Three minutes at 1080p comes to about 7 MB. Set `DEMO_ZOOM=1.35` or
higher when the video will be embedded small.
