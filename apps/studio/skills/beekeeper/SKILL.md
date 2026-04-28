---
name: beekeeper
description: Read schema and run read-only SQL against databases configured in Beekeeper Studio. Auto-discovers the local Beekeeper Studio AI server.
allowed-tools: Bash(python3 ~/.claude/skills/beekeeper/beekeeper.py:*), Read(~/.config/beekeeper-studio/ai-server.json), Read(~/Library/Application Support/beekeeper-studio/ai-server.json)
---

# Beekeeper Studio skill

Use this skill when the user wants to inspect or query a database that is already
saved in their local Beekeeper Studio. You do not need credentials — Beekeeper
holds them. You just talk to the local AI server it exposes.

## How discovery works

Beekeeper Studio writes a small JSON file containing the host, port and bearer
token for its local AI server when the user starts it. The location is
platform-dependent:

- macOS:   `~/Library/Application Support/beekeeper-studio/ai-server.json`
- Linux:   `~/.config/beekeeper-studio/ai-server.json`
- Windows: `%APPDATA%/beekeeper-studio/ai-server.json`

Read that file first. If it is missing or the `pid` it contains is not a
running process, ask the user to start the server from
**Beekeeper Studio → Tools → AI Server… → Start server**.

## What the server gives you

The user has explicitly allowlisted which connections (and optionally which
saved queries) are reachable. By default all queries you run are read-only and
capped at 1000 rows. Do not assume you can write.

## Endpoints

All endpoints are JSON. All require `Authorization: Bearer <token>` from the
discovery file. Loopback only (`127.0.0.1`).

| Method | Path | Purpose |
|---|---|---|
| GET  | `/v1/health` | Liveness probe (no auth). |
| GET  | `/v1/server/info` | Capabilities, allowlist summary. |
| GET  | `/v1/connections` | List connections the user allowlisted for AI access. |
| POST | `/v1/connections/{id}/connect` | Open the connection. Idempotent. |
| GET  | `/v1/connections/{id}/databases` | List databases on this server. |
| GET  | `/v1/connections/{id}/schemas` | List schemas. `?database=` optional. |
| GET  | `/v1/connections/{id}/tables` | List tables + views. `?schema=`. |
| GET  | `/v1/connections/{id}/tables/{table}/columns` | Column list. |
| GET  | `/v1/connections/{id}/tables/{table}/keys` | Foreign keys, in and out. |
| GET  | `/v1/connections/{id}/tables/{table}/sample` | First N rows. `?limit=` (capped). |
| POST | `/v1/connections/{id}/query` | Run SQL. Body `{ sql, maxRows? }`. |
| GET  | `/v1/queries`, `/v1/queries/{id}` | User-saved queries. |
| GET  | `/v1/log` | Recent queries (audit log). |

## Recommended workflow

1. Read the port file.
2. `GET /v1/server/info` to confirm the server is up and grab `defaultReadOnly` / `maxRows`.
3. `GET /v1/connections` to choose a target.
4. `POST /v1/connections/{id}/connect`.
5. Inspect schema with `/tables` and `/columns` before writing queries.
6. Run SQL via `POST /v1/connections/{id}/query`.

## Errors

- `401` — token mismatch. Re-read the port file.
- `403` — connection or query is not in the user's allowlist.
- `4xx` — bad SQL or read-only violation.

## Read-only mode

If the connection is read-only (`/v1/server/info` reports it, the per-connection
listing flags it), Beekeeper rejects any non-`SELECT/SHOW/DESCRIBE/EXPLAIN/PRAGMA/WITH`
statement. Don't try to bypass it.

## Helper

A Python helper is bundled next to this file (`beekeeper.py`) that wraps the
discovery file, auth header and JSON parsing for you. Prefer it over hand-rolled
HTTP calls.

**Always invoke it via this exact path** so the `allowed-tools` rule in the
skill frontmatter matches and the user is not prompted to approve every call:

```
python3 ~/.claude/skills/beekeeper/beekeeper.py <subcommand> [args]
```

Subcommands: `info`, `connections`, `queries`, `connect <id>`, `disconnect <id>`,
`databases <id>`, `schemas <id>`, `tables <id>`, `columns <id> <table>`,
`sample <id> <table>`, `query <id> --sql "..."`, `log`.
