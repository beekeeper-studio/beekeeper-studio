# Demo video: safe changes in production

Aimed at software engineers who aren't DBAs. It records three classic
production mistakes and the Beekeeper Studio feature that stops each one.
It is built on the toolkit in `../lib`; see `../README.md`.

| Scene | Mistake | Beekeeper feature |
| --- | --- | --- |
| Intro | Not knowing which database you're in | Connection colors: red production label, red status bar on every tab |
| 1 | Updating the wrong record (Sarah Johnson vs. Sara Johnston) | Staged table edits, **Copy to SQL** review, **Reset**, then **Apply** |
| 2 | `DELETE FROM orders` run before the `WHERE` clause | **Manual commit** + **Rollback**, then the correct delete + **Commit**; Truncate confirmation from the sidebar |
| 3 | Running a leftover write while investigating | **Read Only Mode**: table editing disabled, SQL writes blocked |

All data is fictional (`seed.sql`: an "Acme Coffee" subscription shop).
Beekeeper has no warning for `DELETE`/`UPDATE` without `WHERE`, so scene 2
relies on Manual commit and Rollback.

## Run it

```bash
docker run -d --name bks-demo-db -p 5432:5432 \
  -e POSTGRES_USER=app_admin -e POSTGRES_PASSWORD=demo_password \
  -e POSTGRES_DB=acme_production postgres:16-alpine

cd apps/studio
node e2e/demos/production-safety/record.mjs
```

Recording takes about 4 minutes, plus about 2 minutes to encode. Each run
creates `acme_production` and `acme_staging` if they're missing and
reseeds both. Outputs go to `out/`, starting with
`beekeeper-production-safety-demo.mp4`.

Set `PGHOST`/`PGPORT` if Postgres runs elsewhere. On the fresh profile the
built-in 14-day trial starts automatically. Read Only Mode only blocks
typed SQL on a trial or paid license, and the title bar shows "Free Trial".
