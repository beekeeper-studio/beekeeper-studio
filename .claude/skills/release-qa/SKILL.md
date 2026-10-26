---
name: release-qa
description: Release-test a Beekeeper Studio build end to end. Downloads a beta/release AppImage from GitHub Releases, runs it headless under Xvfb, drives the real UI over CDP (Playwright) plus xdotool for native file dialogs, records screenshots/video, and compares against the previous release to separate regressions from old bugs. Use when asked to QA, smoke-test, regression-test or "run the release script" against a built app (not for unit tests).
---

# Release QA for Beekeeper Studio (Linux, headless)

Drive the **shipped** app (the AppImage from GitHub Releases), not a dev build. Everything below was proven on
`v6.2.0-beta.3`; scripts live in `scripts/` next to this file and are parameterised by env vars, not hard-coded paths.

## 0. Tools you need

| Tool | Notes |
|---|---|
| `Xvfb`, `ffmpeg`, `node`, `python3` | preinstalled in the cloud sandbox |
| Playwright | `require('/opt/node-tools/node_modules/playwright')` (set `PLAYWRIGHT_PATH` to override). Do **not** `playwright install`. |
| `xdotool`, `xwininfo` | NOT preinstalled: `apt-get update && apt-get install -y xdotool x11-utils` (the `update` is required) |
| `gh api` | only the REST API works (GraphQL is blocked): `gh api repos/beekeeper-studio/beekeeper-studio/releases/tags/<tag> --jq '.assets[]\|"\(.id) \(.name)"'` |

Scratch layout used below (keep it all in the scratchpad dir): `$W/release/` (download+extract), `$W/qa-out/{shots,video}`, `$W/data/`.
Download each release into its **own empty directory**; keep your scripts elsewhere.

## 1. Get the build and start it

```bash
S=.claude/skills/release-qa/scripts; W=<scratchpad>; export QA_DIR=$W/qa-out
mkdir -p $W/release && cd $W/release
gh api -H "Accept: application/octet-stream" repos/beekeeper-studio/beekeeper-studio/releases/assets/<asset-id> > bks.AppImage   # x86_64 .AppImage, ~360MB, ~5s
chmod +x bks.AppImage && ./bks.AppImage --appimage-extract >/dev/null      # no FUSE needed -> ./squashfs-root
$S/start_display.sh                                                          # Xvfb :99 1600x1000
python3 $S/make_fixtures.py $W/data                                          # qa.db + CSVs
$S/launch.sh $W/release/squashfs-root $W/profile 9222                        # --no-sandbox --disable-gpu --remote-debugging-port
cd $S && node connect.js $W/data/qa.db                                       # SQLite connect (Database field is editable)
```
The window is 1200x800 at screen (196,100). Free edition is the default; see "Licensing" below.

## 2. Driving the app

* `scripts/lib.js` -> `attach()` (CDP), `shot()`, `visibleRows()`, `editCell()`, `setEditorText()`, `tabTitles()`, `modalUp()`, `clickNonBlocking()`.
  Scripts call `browser.close()` at the end: that only disconnects, the app keeps running. Chain many small scripts.
* `QA_DIR` = output root, `BKS_PORT` = which instance to attach to (default 9222).
* `scripts/rec.sh start|stop <name>` records the whole X display (shows native dialogs too). Record **one clip per issue**
  (a few seconds) and keep a clean repro script so the clip is short. `scripts/xshot.sh <name>` = X-level screenshot.
* Verify outcomes in the DB, not just the UI: `python3 -I -c "import sqlite3; c=sqlite3.connect('file:<db>?mode=ro',uri=True); print(c.execute('select ...').fetchall())"`.

### Native file dialogs (import / export / "Choose File")
They are synchronous: the renderer freezes until the dialog closes, so an awaited click or `page.screenshot` **hangs**.
1. Fire the click without awaiting: `clickNonBlocking(page, 'a.btn', /^Choose File$/)` and disconnect.
2. `sleep 2; scripts/gtkdialog.sh /abs/path` (Ctrl+L, type path, **click** the Open/Select/Save button).
   **Never press Return** in the GTK location bar - it closes the dialog as *cancelled* (returns `undefined`, nothing happens).
3. Works for files and for "Select Folder". `window.main.*` is a contextBridge proxy: dialog APIs cannot be monkey-patched.

### Selector cheat sheet (6.2)
* Tabs `.nav-tabs .nav-item` (text contains the icon ligature, e.g. `code\nQuery #1`). Close = Ctrl+W (unsaved tabs show a dot instead of X).
* Entity list `.table-name`; dbl-click opens the data tab; right-click gives View Data / View Structure / Export To File / Import from File / Duplicate / ...
* Footer buttons are `x-button` / `x-menuitem` and their text includes the icon name, so `getByText(..., {exact:true})` fails -> use `locator('x-menuitem').filter({hasText})`.
  An open `x-menu` puts an `x-backdrop` over the page: click the item by bounding box or open+click in the **same** script (menus close when you disconnect).
* Grids are Tabulator: use `.tabulator-row:visible` (hidden tabs remain in the DOM). Pending edits show `Reset` / `N Apply ▾` in the footer; the ▾ menu has *Copy to SQL*.
* Query editor is CodeMirror 6 `.cm-content`: use `keyboard.insertText`. Run all = Ctrl+Enter, run current = Ctrl+Shift+Enter, multiple results = native `<select>` -> `selectOption({label})`.
* Cell menu: *View as JSON* (sidebar), *Edit in modal*. Modal confirm dialogs are `.v--modal-box` (`Confirm` / `Cancel`).
* Activity-bar icons at x=22 (y=59 database, 101 saved queries, 146 history) **toggle** their panel: clicking the active one hides it.
* Entities "+" is at (250,123) (hover the header first): *New Table*, *New Table from File*. Tools menu: ER Diagram, backup/restore, Export Data, Manage Plugins.
* Plugins render in an out-of-process iframe: `page.frameLocator('iframe').first()`.
* Overlays that swallow clicks: welcome toast ("Don't show again"), trial toast, driver.js tour popover (button **Okay**), "Really close ?" modal.
* Coordinates are a last resort; prefer locators.

## 3. Gotchas that cost time

* `pkill -f <path>` kills your own shell (exit 144) if the pattern is in the command line. Anchor it: `pkill -f "^/abs/path/squashfs-root/beekeeper-studio-bin"`.
* Two versions side by side: different `--user-data-dir` **and** port (`launch.sh <app> <profile> 9223`, then `BKS_PORT=9223 node ...`). Copy the DB first.
* Logs: app stdout `<profile>/app.log`; **utility process** `~/.config/beekeeper-studio/logs/utility.log` (config/plugin/db errors show here, not in the console).
* **First-run config bug (6.2.0-beta.3)**: `user.config.ini` is never created, so *any* in-app config write (e.g. enabling Community Plugins)
  fails with ENOENT. Workaround for testing: `cp squashfs-root/resources/user.config.ini <userData>/user.config.ini` and restart.
  Use `launch_fresh.sh` (fake HOME, default userData) when you need to prove first-run behaviour.
* Plugin registry is fetched through `app.beekeeperstudio.io/api/plugins/registries/<official|community>` (reachable from the sandbox). Official list is currently `[]` upstream; Community is off by default.
* The sandbox GitHub scope is `beekeeper-studio/beekeeper-studio` only; plugin repos on other orgs may still install because the app proxies through the cloud API.
* Native menus/titlebar are rendered by the app (custom), so `page` sees them; the GTK file dialog is the only real X window.
* No dbus is available -> harmless `dbus`/`dconf` errors in `app.log`.

## 4. Licensing (needs a decision)

Free edition gates: JSON Row Viewer sidebar, "New Table from File"/import, AI shell. The app offers **Start free trial**
(14 days, "no email or credit card"; title bar then reads *Free Trial (14 days left)*). That is an outward call to Beekeeper's
licence server. If the user has not pre-approved it, ask once, and **disclose in the report** that a trial was started.

## 5. The release script (what "done" means)

For each step record PASS/FAIL/PARTIAL, evidence (screenshot path, video path) and a DB check where relevant.

1. Start app. 2. Connect SQLite. 3. Run 1, 2 and 3 statements in one editor (expect "Result N: x rows" select; Run Current runs only the cursor statement).
4. Saved query: save, edit + re-save, run, delete (confirm dialog). 5. Table: edit cell -> Apply (check DB), edit -> Reset (DB unchanged), edit -> Copy to SQL (UPDATE text).
6. New table via *New Table*; structure editor: add, rename, drop columns - **test each alone AND combined in one Apply** (SQLite rebuild path).
7. JSON: *Edit in modal* (valid edit applies, invalid shows "Invalid JSON content"), JSON Row Viewer sidebar (follows selection, editing creates a pending change).
8. Plugins: Tools > Manage Plugins > Browse > enable Community (+ risk dialog) > Install > new-tab menu entry > use it.
9. Import CSV to a new table (quoted comma value) and to an existing table (Import from File). 10. Export a table to CSV (Export To File) then import that file to a new table and diff the rows.

Also worth poking while you are there: close a tab with unsaved changes (modal must dismiss), toggles that persist config, first-run behaviour.

## 6. Regression triage (always do this for a suspected bug)

1. Reproduce twice from a clean state with a script (not by hand). 2. Reproduce with **X11-only input** (xdotool, no CDP attached) if the bug is UI/modal related to rule out the harness.
3. Run the same script on the previous release (download its AppImage, other profile/port). Label: **regression** (only new build) vs **pre-existing**.
4. Check the shipped bundle when you suspect the source: `python3 -I` search of `squashfs-root/resources/app.asar` for the function (source checkout may be newer than the tag).
5. Capture: screenshot of the failure, a <15s clip, exact repro steps, expected vs actual, version(s), and a log excerpt if there is one.

## 7. Report format

A table: `# | Severity | Area | Summary | Regression? | Evidence`, followed by repro steps per issue. Do not file issues unless asked.
Note anything you changed to get unblocked (trial started, workaround config seeded, community plugins enabled).

## 8. Known issues in 6.2.0-beta.3 (re-verify on every new build)

| ID | Summary | Regression vs 6.1.6? | Re-check with |
|---|---|---|---|
| BUG-1 | SQLite structure editor: rename + add/drop column in one Apply generates `RENAME COLUMN "new" TO "new"` -> error `no such column`, partial apply, stale UI | No (also 6.1.6) | `node scripts/repro_structure_combo.js <table> rename add drop` |
| BUG-2 | Closing any tab with unsaved changes: after Confirm the "Really close ?" modal stays open and blocks the UI | **Yes** | `node scripts/repro_close_unsaved.js` (reload the page afterwards) |
| BUG-3 | First run: `user.config.ini` never created -> in-app config writes fail (Community Plugins cannot be enabled, list empty, no error) | Latent in 6.1.6 (plugins were disabled by default there) | `scripts/launch_fresh.sh` + `node scripts/repro_enable_community_plugins.js` |
| BUG-4 | Plugin manager "Official Plugins" toggle reads `officialEnabled` / writes `ultimateDisabled` (nonexistent keys): always ON, cannot change | New UI | same script; inspect `PluginManagerModal.vue` / bundle |

Other notes: data-tab pending cell edits are discarded without a prompt when the tab is closed (same in 6.1.6); new column name in the
table builder is not selected on edit (typing appends to `column_N`); official plugin registry (`plugins.json`) is empty upstream.
