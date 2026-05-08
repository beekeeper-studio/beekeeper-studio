# Beekeeper Studio AI skill

A Claude Code skill that lets your local Claude session inspect and query
databases configured in Beekeeper Studio. The skill talks to a small,
loopback-only HTTP server that Beekeeper Studio runs on demand.

## Files

- **`SKILL.md`** — the skill definition Claude reads.
- **`beekeeper.py`** — Python helper that handles discovery, auth, and JSON I/O.
- **`install.sh`** — copies these into `~/.claude/skills/beekeeper`.

## Install

```sh
curl -fsSL https://beekeeperstudio.io/skills/install.sh | sh
```

Or, from the bundled copy that ships with Beekeeper Studio:

```sh
cp -r "<beekeeper resources>/skills/beekeeper" ~/.claude/skills/
```

The resources path is shown in **Tools → AI Server → Install skill**.

## How it finds the server

Beekeeper Studio writes `ai-server.json` to its config dir whenever the AI
server is running. The skill reads it to find the host, port, and bearer
token. If the file is missing, ask the user to start the server.

## Pre-approving the helper

Claude Code prompts before running any `Bash` command unless the command is on
its allow list. The `install.sh` script adds the rule for you. To do it
manually, add this to the `permissions.allow` array in `~/.claude/settings.json`:

```
Bash(python3 ~/.claude/skills/beekeeper/beekeeper.py:*)
```

Or, with `jq`:

```sh
jq '.permissions = (.permissions // {}) |
    .permissions.allow = ((.permissions.allow // []) +
      ["Bash(python3 ~/.claude/skills/beekeeper/beekeeper.py:*)"] | unique)' \
   ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

Restart Claude Code after editing settings.

## Security

- Loopback only. The server never binds beyond `127.0.0.1`.
- Bearer-token authenticated. The token is fresh every time the server starts.
- Read-only by default. Per-connection override possible.
- Row-cap by default (1000).
- The user explicitly allowlists which connections / saved queries the AI
  can reach.
- Every query is logged in-app and to `<userData>/ai-server.log.jsonl`.
