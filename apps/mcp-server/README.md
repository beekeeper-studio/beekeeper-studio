# `@beekeeperstudio/mcp-server`

MCP (Model Context Protocol) server that exposes the Beekeeper Studio
AI server as Claude Code / MCP tools. It auto-discovers the local
Beekeeper AI server via the port file Beekeeper writes when you start
the server from **Tools → AI Server… → Start server**.

## Why MCP instead of a Claude Code skill?

Skills shell out via `Bash`/`Read`, and each invocation is permission-gated
per call. Once an MCP server is added with `claude mcp add`, all of its
tools are first-class — you grant access once and Claude can use them
without further prompts.

## Install

```sh
claude mcp add --scope user beekeeper -- npx -y @beekeeperstudio/mcp-server
```

Or, if you already have Beekeeper Studio installed and want the bundled
copy that ships with the app:

```sh
claude mcp add --scope user beekeeper -- node "<beekeeper resources>/mcp-server/dist/index.js"
```

The resources path is shown in **Beekeeper → Tools → AI Server… → Install skill**.

After adding, restart Claude Code. Run `/mcp` in Claude Code to confirm
the `beekeeper` server is connected.

## Tools

| Tool | Description |
|---|---|
| `server_info` | Server capabilities and the user's allowlist summary. |
| `list_connections` | Allowlisted saved connections. |
| `connect`, `disconnect` | Open/close an AI session for a connection. |
| `list_databases`, `list_schemas`, `list_tables` | Browse structure. |
| `list_columns`, `list_keys` | Per-table metadata. |
| `sample_table` | First N rows (capped). |
| `run_query` | Execute SQL. Read-only enforcement and row caps applied server-side. |
| `list_saved_queries`, `get_saved_query` | Reach allowlisted favorite queries. |
| `recent_log` | Audit log of queries run by AI clients. |

## How discovery works

Beekeeper Studio writes a JSON file to its config dir whenever the AI
server is running. Locations:

- macOS: `~/Library/Application Support/beekeeper-studio/ai-server.json`
- Linux: `~/.config/beekeeper-studio/ai-server.json`
- Windows: `%APPDATA%/beekeeper-studio/ai-server.json`

The MCP server reads this file at startup (and again if the connection
fails, in case the port changed). Override the path with the
`BEEKEEPER_AI_SERVER_FILE` environment variable.

## Security

- Loopback only (`127.0.0.1`).
- Bearer-token auth. Token rotates every server restart.
- Read-only by default, with row caps. Per-connection overrides are set
  by the user in the AI Server panel.
- The user explicitly allowlists which connections and saved queries
  the AI can reach.
- Every query is logged to `<userData>/ai-server.log.jsonl`.

## Development

```sh
yarn workspace @beekeeperstudio/mcp-server build
node ./dist/index.js  # speaks MCP on stdio; not useful directly — wire to claude mcp
```

Or run directly under `claude mcp add`:

```sh
claude mcp add --scope user beekeeper-dev -- node /absolute/path/to/dist/index.js
```
