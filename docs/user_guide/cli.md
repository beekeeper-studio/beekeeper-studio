---
title: Command Line Interface
summary: "Inspect the database that is open in Beekeeper Studio from a terminal, a script, or an AI coding agent with the bks command."
icon: material/console
---

`bks` is a command line tool that ships with Beekeeper Studio. It runs **read-only** commands against a connection that is **already open in the app**, and prints JSON by default.

It's a good fit for scripts and AI coding agents: they can inspect a schema or check some data without being given database credentials.

```bash
bks tables --schema public
bks structure public.users
bks create-tab query "select id, email from users order by id limit 5"
```

!!! note "`bks` doesn't connect to databases or start the app. It doesn't work when the app is closed or disconnected."

## Enabling CLI access

CLI access is off by default. Turn it on:

- **Per connection**: check **Enable CLI Access** in the connection form, save, and connect.
- **For every connection**: add this to your [config file](configuration.md) and restart the app:

    ```ini
    [cli]
    enableForAllConnections = true
    ```

If access is off, the command fails with `CLI_DISABLED` and says how to turn it on.

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

Runs read-only commands against a database connection that is already open in
the Beekeeper Studio desktop app.

Options:
  -v, --version               Output the version number
  --socket <path>             Socket the app listens on (beekeeper-studio cli
                              prints it). (default: the app's socket, env:
                              BKS_CLI_SOCKET)
  --timeout <ms>              Give up waiting for the app after this many
                              milliseconds. 0 waits forever (default: 5000)
  -h, --help                  display help for command

Commands:
  connections [options]       List the connections currently open in the app
  schemas [options]           List the schemas in the connected database
  tables [options]            List tables (same as entities --type table)
  entities [options]          List tables, views, materialized views and
                              routines
  structure [options] <name>  Columns, keys, indexes, relations, triggers and
                              DDL of a table or view
  query [options] [sql...]    Run a read-only SQL statement and print the
                              results (at most 20,000 rows per result)
  create-tab                  Open a new tab and switch to that tab
  switch-tab [options] <id>   Switch to an open tab
  help [command]              display help for command

Examples:
  bks connections
  bks tables --schema public
  bks structure users --schema public
  bks query "select id, email from users limit 10"
  bks create-tab query "select id, email from users limit 10"
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
```

## Global Options

| Option | Description |
| ------ | ------- |
| `--timeout <ms>` | Give up after this many milliseconds (default `5000`). `0` waits forever |
| `--socket <path>` | Socket the app listens on. Defaults to `BKS_CLI_SOCKET` or the app's socket |
| `-h, --help` | Prints usage |

## Commands

### `connections`

Lists the connections open in the app, with each one's id, name, database type and whether CLI access is enabled. Use the name or id with `--connection`.

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

Runs SQL and prints the results. Only statements that read data are allowed, such as `SELECT`, `SHOW` and `EXPLAIN`; anything else fails with `READ_ONLY`. Each result is capped at 20,000 rows.

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

Opens a query tab, prefilled with the SQL if given. The SQL is not run.

```bash
bks create-tab query [sql] [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |
| `--file <path>` | Read SQL from a file. Pass `-` as the SQL to read stdin |

### `switch-tab`

Switches the app to an open tab. Use the id `create-tab` printed.

```bash
bks switch-tab <id> [options]
```

| Option | Description |
| ------ | ----------- |
| `-c, --connection <name>` | Connection name or id |

### `help`

Prints usage for `bks`, or for one command.

```bash
bks help [command]
```

### Choosing a connection

If only one open connection has CLI access, it's used automatically. Otherwise pass `--connection`:

```bash
bks tables --connection "Local Postgres"
```

### Environment variables

| Variable | Description |
| -------- | ------- |
| `BKS_CLI_SOCKET` | Socket the app listens on, if it's not in the default location |
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
{"time":"2026-10-30T13:12:40.512Z","method":"structure","params":{"name":"users","schema":"public"},"connection":{"id":"7e1c…","name":"Local Postgres"},"ok":true,"durationMs":14,"responseBytes":412,"result":{"schema":"public","name":"users","entityType":"table","columns":4,"warnings":0}}
```

!!! note "SQL longer than 10,000 characters is cut in the log."

## Using it with an AI coding agent

Give your agent the CLI instead of a connection string. Add a note to the project's agent instructions:

```text
The database for this project is open in Beekeeper Studio. Inspect it with
`bks tables`, `bks structure <table>` and `bks query "<sql>"`. If a command
fails with CLI_DISABLED, ask me to enable CLI access for the connection.
```

## How it works

`bks` sends one request over a local socket (a named pipe on Windows) that only your user account can open, and prints the reply. Nothing is exposed on the network and no credentials leave the app.
