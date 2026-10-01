# Demo video: safe changes in production

A scripted, reproducible screen recording of Beekeeper Studio for the
"software engineer, not a DBA" audience. It drives the real app with
Playwright on a virtual display, records it with ffmpeg, and burns in
captions. Re-run it whenever the UI changes.

## What it shows

| Scene | Mistake | Beekeeper feature |
| --- | --- | --- |
| Intro | Not knowing which database you're in | Connection colors: red production label, red status bar on every tab |
| 1 | Updating the wrong record (Sarah Johnson vs. Sara Johnston) | Staged table edits, **Copy to SQL** review, **Reset**, then **Apply** |
| 2 | `DELETE FROM orders` run before the `WHERE` clause | **Manual commit** + **Rollback**, then the correct delete + **Commit**; Truncate confirmation from the sidebar |
| 3 | Running a leftover write while investigating | **Read Only Mode**: table editing disabled, SQL writes blocked |

All data is fictional (`seed.sql`: an "Acme Coffee" subscription shop).

## Requirements

- Linux with `Xvfb`, `ffmpeg` and `psql` on the `PATH`
- Docker (or any Postgres 12+ reachable from the app)
- A built app: from the repo root, `yarn install`, `yarn lib:build`, then
  `yarn workspace beekeeper-studio build`

## Run it

```bash
# 1. Demo databases (production + staging)
docker run -d --name bks-demo-db -p 5432:5432 \
  -e POSTGRES_USER=app_admin -e POSTGRES_PASSWORD=demo_password \
  -e POSTGRES_DB=acme_production postgres:16-alpine
PGPASSWORD=demo_password psql -h 127.0.0.1 -U app_admin -d acme_production \
  -c 'CREATE DATABASE acme_staging'

# 2. Record (about 4 minutes, plus about 2 minutes to encode)
cd apps/studio
node e2e/demos/production-safety/record.mjs
```

Outputs go to `out/` in this folder (gitignored):

- `beekeeper-production-safety-demo.mp4` is the final 1080p video
- `raw.mp4` is the unedited capture
- `captions.srt` holds the caption text with timings
- `chapters.txt` holds YouTube chapter markers
- `marks.json` holds scene timestamps

Use `NO_RECORD=1 SHOTS=1` for a quick dry run. It saves one screenshot
per step to `out/` and records no video.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `PGHOST` / `PGPORT` | `127.0.0.1` / `5432` | Where the demo Postgres runs |
| `OUT_DIR` | `./out` | Output folder |
| `DEMO_DISPLAY` | `:99` | X display that Xvfb starts on |

## Notes

- Every run reseeds both databases and wipes `apps/studio/tmp`, the
  `TEST_MODE` profile, so each take starts identically.
- On the fresh profile the script starts the built-in 14-day trial.
  Paid features such as SQL blocking in Read Only Mode then behave as
  they do for a trial user.
- The cursor, click ripples, captions, cards and key badges come from
  `overlay.js`. It is injected into the app window during recording
  only, and the app itself is unchanged.
- Selectors live in `record.mjs`. If a scene breaks after a UI change,
  run the dry run and check the screenshots.
