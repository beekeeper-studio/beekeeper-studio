---
title: Command Line Interface
summary: "Inspect the database that is open in Beekeeper Studio from a terminal, a script, or an AI coding agent with the bks command."
icon: material/console
---

`bks` is a command line tool that ships with Beekeeper Studio. It runs commands against a connection that is **already open in the app**, and prints JSON by default. Each client that uses it, such as an AI coding agent or a terminal, is approved separately and only gets the access you choose.

It's a good fit for scripts and AI coding agents: they can inspect a schema or check some data without being given database credentials.

```bash
bks tables --schema public
bks structure public.users
bks create-tab query "select id, email from users order by id limit 5"
```

!!! note "`bks` doesn't connect to databases or start the app. It doesn't work when the app is closed or disconnected."

## Approving clients

A client has to be approved before it can use a connection. Until then every command fails with `NOT_APPROVED` and prints the command that asks for approval:

```bash
bks request-approval --connection "Local Postgres"
```

`request-approval` opens a dialog in the window that holds the connection and waits for your answer. If `bks` is stopped while it waits, the dialog closes and nothing is approved. If the client is already approved it returns right away with the current access.

The dialog shows the client's name and lets you choose what it may do:

- **Schemas and table structure** are always allowed.
- **Query types**: `SELECT`, `EXPLAIN ANALYZE`, `UPDATE`, `DELETE`, `ALTER`, or **Allow anything**. Statements of any other type, such as `INSERT`, `CREATE` or `DROP`, need **Allow anything**. `EXPLAIN ANALYZE` runs the statement it explains, so that statement's type has to be allowed too.
- **Saved queries**: read them, create and edit them, or both.
- **Open and switch tabs** in the app.

On a connection in read only mode, write query types can't be granted.

**Deny** fails `request-approval` with `ACCESS_DENIED`; run it again to ask again. **Approve** keeps the choice for that client while the connection stays open. Disconnecting or closing the app revokes every approval, so the client has to ask again next time. To change what a client may do, reconnect and run `request-approval` again.

A command the client isn't allowed to run fails with `NOT_PERMITTED`.

### Client names

`bks` names the client after the program that ran it, found by walking up its parent processes past shells: `Claude Code`, `Cursor`, `VS Code`, or the terminal app (`iTerm2`, `Windows Terminal`, ...) when you run it yourself. Set `BKS_CLI_CLIENT` to give a script its own name:

```bash
BKS_CLI_CLIENT="Nightly report" bks query --file report.sql
```

!!! warning "The client name identifies a program, not a user. Any program running as your user account can use the socket and pick a name, so approve only what the connection can safely allow."

## Get Started

`bks` is installed with the app in `resources/bin`. No separate Node.js install is needed.

=== "Linux"
    The deb and rpm packages install it as `/usr/bin/bks`:

    ```bash
    bks connections
    ```

    With an AppImage, pass `cli` to the AppImage instead:

    ```bash
    ./Beekeeper-Studio-*.AppImage cli connections
    ```

=== "macOS"
    Link it onto your `PATH` once:

    ```bash
    ln -s "/Applications/Beekeeper Studio.app/Contents/Resources/bin/bks" /usr/local/bin/bks
    bks connections
    ```

=== "Windows"
    Run `bks.cmd` from the `resources\bin` folder, or add that folder to your `PATH`:

    ```powershell
    & "$env:LOCALAPPDATA\Programs\beekeeper-studio\resources\bin\bks.cmd" connections
    ```

!!! tip "Run `beekeeper-studio cli` to print where `bks` is installed and the socket the app listens on."

Run `bks help` for the full help.

```text
$ bks help
Usage: bks [options] [command]

Runs commands against a database connection that is already open in the
Beekeeper Studio desktop app. A client has to be approved first: run
request-approval.

Options:
  -v, --version                 Output the version number
  --socket <path>               Socket the app listens on. (default: the app's
                                socket, env: BKS_CLI_SOCKET)
  -h, --help                    display help for command

Commands:
  connections [options]         List the connections currently open in the app
  schemas [options]             List the schemas in the connected database
  tables [options]              List tables (same as entities --type table)
  entities [options]            List tables, views, materialized views and
                                routines
  structure [options] <name>    Columns, keys, indexes, relations, triggers and
                                DDL of a table or view
  query [options] [sql...]      Run SQL and print the results (at most 20,000
                                rows per result). Only the statement types the
                                client was approved for run
  create-tab                    Open a new tab and switch to that tab
  switch-tab [options] <id>     Switch to an open tab
  request-approval|r [options]  Ask for access to a connection. Opens a dialog
                                in the app and waits until it is answered
  saved-queries                 Read and write the queries saved in the app
  help [command]                display help for command

Examples:
  bks connections
  bks tables --schema public
  bks structure users --schema public
  bks query "select id, email from users limit 10"
  bks create-tab query "select id, email from users limit 10"
  bks request-approval
  bks saved-queries list

The client name shown in the approval dialog is detected from the parent
processes. Set BKS_CLI_CLIENT to name it explicitly.
```

## Examples

```bash
# List open connections
bks connections

# List tables in the public schema
bks tables --schema public

# Describe a table
bks structure public.users

# Run a query
bks query "select id, email from users limit 10"

# Run SQL from a file and print it as markdown
bks query --file ./report.sql --format md

# Read SQL from stdin
echo "select count(*) from orders" | bks query -

# Open a query tab in the app with this SQL
bks create-tab query "select * from orders"

# Save a query, then change its SQL
bks saved-queries create "Big orders" "select * from orders where total > 1000"
bks saved-queries update 12 "select * from orders where total > 5000"
```

## Global Options

| Option | Description |
| ------ | ------- |
| `--socket <path>` | Socket the app listens on. Defaults to `BKS_CLI_SOCKET` or the app's socket |
| `-h, --help` | Prints usage |

## Commands

### `connections`

Lists the connections open in the app, with each one's id, name, database type and whether the calling client is approved for it. Use the name or id with `--connection`. Doesn't need approval.

```bash
bks connections
```

| Option | Description |
| ------ | ----------- |
| `-f, --format <format>` | `json` (default; the result as one line of JSON) or `md` (markdown) |

### `schemas`

Lists the schemas in the connected database.

```bash
bks schemas [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `-f, --format <format>` | `json` (default; the result as one line of JSON) or `md` (markdown) |

### `tables`

Lists the tables in the connected database. Same as `entities --type table`.

```bash
bks tables [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `-s, --schema <schema>` | Limit to one schema |
| `-f, --format <format>` | `json` (default; the result as one line of JSON) or `md` (markdown) |

### `entities`

Lists tables, views, materialized views and routines. Use `--type` to list only some of them.

```bash
bks entities [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `-s, --schema <schema>` | Limit to one schema |
| `-t, --type <types...>` | One or more of `table`, `view`, `materialized-view` and `routine`. Plurals and the aliases `materialized_view`, `matview`, `function` and `procedure` also work |
| `-f, --format <format>` | `json` (default; the result as one line of JSON) or `md` (markdown) |

### `structure`

Describes a table or view: its columns, primary key, indexes, foreign keys, triggers and create script. Views only include columns and the create script.

```bash
bks structure <name> [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `-s, --schema <schema>` | Limit to one schema. `<name>` also accepts `schema.table` |
| `-f, --format <format>` | `json` (default; the result as one line of JSON) or `md` (markdown) |

### `query`

Runs SQL and prints the results. Every statement has to be a type the client was approved for (see [Approving clients](#approving-clients)); otherwise nothing runs and the command fails with `NOT_PERMITTED`. On a connection in read only mode, writes fail with `READ_ONLY`. Each result is capped at 20,000 rows.

Pass the SQL as an argument, with `--file`, or as `-` to read stdin.

```bash
bks query <sql> [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `--file <path>` | Read SQL from a file. Pass `-` as the SQL to read stdin |
| `-f, --format <format>` | `json` (default; the result as one line of JSON) or `md` (markdown) |

### `create-tab query`

Opens a query tab, prefilled with the SQL if given. The SQL is not run. Needs the **Open and switch tabs** permission.

```bash
bks create-tab query [sql] [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `--file <path>` | Read SQL from a file. Pass `-` as the SQL to read stdin |

### `switch-tab`

Switches the app to an open tab. Use the id `create-tab` printed. Needs the **Open and switch tabs** permission.

```bash
bks switch-tab <id> [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |

### `request-approval`

Also available as `bks a`. Asks for access to a connection: opens the approval dialog in the app and waits for the answer. Prints the access that was granted, and whether a dialog was shown (`newlyApproved`). See [Approving clients](#approving-clients).

```bash
bks request-approval [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |

### `saved-queries`

Reads and writes the queries saved in the app. `list` and `get` need the saved queries **Read** permission; `create` and `update` need **Create and edit**. Saved queries can't be deleted from the CLI.

```bash
bks saved-queries list [options]
bks saved-queries get <id> [options]
bks saved-queries create <title> [sql] [options]
bks saved-queries update <id> [sql] [--title <title>] [options]
```

`list` prints each query's id, title and the start of its SQL; `get` prints the full SQL. `create` and `update` take the SQL as an argument, with `--file`, or as `-` to read stdin.

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id. Saved queries aren't tied to a connection, but the client has to be approved for the one it uses |
| `--file <path>` | `create` and `update`: read SQL from a file |
| `--title <title>` | `update`: new title |
| `-f, --format <format>` | `list`: `json` (default) or `md` (markdown) |

### `help`

Prints usage for `bks`, or for one command.

```bash
bks help [command]
```

### Choosing a connection

If only one connection is open, or the client is approved for exactly one of the open connections, it's used automatically. Otherwise pass `--connection`:

```bash
bks tables --connection "Local Postgres"
```

### Environment variables

| Variable | Description |
| -------- | ------- |
| `BKS_CLI_SOCKET` | Socket the app listens on, if it's not in the default location |
| `BKS_CLI_CLIENT` | Client name shown in the approval dialog, instead of the detected one |
| `BKS_CLI_DEV` | Set to `1` to talk to a development build |
| `BKS_ELECTRON_BINARY` | Beekeeper Studio executable for the `bks` script, if it's not next to the script |

## Audit log

Every CLI call is logged as one line of JSON in `cli.log`, next to the app's other logs. It rotates at 10 MB to `cli.old.log`.

| Platform | Location |
| -------- | -------- |
| Linux | `~/.config/beekeeper-studio/logs/cli.log` |
| macOS | `~/Library/Logs/beekeeper-studio/cli.log` |
| Windows | `%APPDATA%\beekeeper-studio\logs\cli.log` |

Each line records the request and a summary of the result, never the data:

```json
{"time":"2026-10-30T13:12:40.512Z","method":"structure","client":"Claude Code","params":{"name":"users","schema":"public"},"ok":true,"durationMs":14,"responseBytes":412,"result":{"schema":"public","name":"users","entityType":"table","columns":4,"warnings":0}}
```

!!! note "SQL longer than 10,000 characters is cut in the log."

## Using it with an AI coding agent

Give your agent the CLI instead of a connection string. Add a note to the project's agent instructions:

```text
The database for this project is open in Beekeeper Studio. Inspect it with
`bks tables`, `bks structure <table>` and `bks query "<sql>"`. If a command
fails with NOT_APPROVED, run the request-approval command it prints and
wait for me to approve it. If it fails with NOT_PERMITTED, tell me what it needs
so I can reconnect and approve it again with that access.
```

## How it works

`bks` sends one request over a local socket (a named pipe on Windows) that only your user account can open, and prints the reply. Nothing is exposed on the network and no credentials leave the app.
