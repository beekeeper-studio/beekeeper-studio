---
title: Command Line Interface
summary: "Query the database that is open in Beekeeper Studio from a terminal, a script, or an AI coding agent with the bks command."
icon: material/console
---

# Command Line Interface

`bks` is a small command line tool that ships with Beekeeper Studio. It runs a handful of **read-only** commands against a database connection that is **already open in the app**: list schemas and tables, describe a table, run a query. The output is JSON by default, which makes it a good fit for scripts and for AI coding agents that need to look at a schema or check some data without being handed database credentials.

`bks` does not connect to databases on its own, and it does not start the app. It talks to the running desktop app over a local socket, and the app runs the command on the connection it already holds. Close the app, or disconnect, and `bks` stops working. Every call is recorded in a [log file](#audit-log).

```bash
bks list-tables --schema public
bks structure public.users
bks query "select id, email from users order by id limit 5"
```

## Enabling CLI access

CLI access is off for every connection by default. Turn it on in one of two ways:

1. **Per connection**: check **Enable CLI Access** in the connection form (next to **Read Only Mode**), save the connection, and connect. Only connections with the box checked answer CLI commands. Changing the box on a saved connection takes effect on the next CLI call, no reconnect needed.
2. **For every connection**: add this to your [user configuration file](configuration.md) and restart Beekeeper Studio:

    ```ini
    [cli]
    enableForAllConnections = true
    ```

When CLI access is not enabled the command fails with a message that says which connection is open and how to enable it, so an agent that hits the error can tell you what to do:

```text
Error (CLI_DISABLED): CLI access is not enabled for the open connection "Production (replica)".
To enable it, edit the connection in Beekeeper Studio, check "Enable CLI Access", save, and connect again. ...
```

## Read only

The CLI never writes to a database, whatever the connection's own **Read Only Mode** setting is. `query` accepts statements that read data (`SELECT`, `WITH ... SELECT`, `SHOW`, `EXPLAIN`, `DESCRIBE` and so on, the same set the app allows in Read Only Mode). An `INSERT`, `UPDATE`, `DELETE`, DDL statement, or a batch that contains one, is rejected before anything runs:

```text
Error (READ_ONLY): The statement was rejected because the CLI is read only.
The CLI is read only. It runs statements that read data (SELECT, SHOW, EXPLAIN, DESCRIBE and the like) on any connection; run writes in the Beekeeper Studio app.
```

The other commands only read catalog information.

## Finding the command

`bks` is installed with the app, under `resources/bin` in the install directory. It needs no separate Node.js install: it runs with the app's own runtime. Where that is depends on how you installed Beekeeper Studio:

=== "Linux"
    The deb and rpm packages link it as `/usr/bin/bks`, so it is simply:

    ```bash
    bks connections
    ```

    Other formats keep it inside the install directory, for example `/opt/Beekeeper Studio/resources/bin/bks`. An AppImage cannot be unpacked onto your `PATH`, so the AppImage hands the `cli` argument to `bks` for you:

    ```bash
    ./Beekeeper-Studio-*.AppImage cli connections
    ```

=== "macOS"
    The command lives inside the app bundle. Link it once onto your `PATH`:

    ```bash
    ln -s "/Applications/Beekeeper Studio.app/Contents/Resources/bin/bks" /usr/local/bin/bks
    bks connections
    ```

=== "Windows"
    The command is `bks.cmd` in the install directory's `resources\bin` folder:

    ```powershell
    & "$env:LOCALAPPDATA\Programs\beekeeper-studio\resources\bin\bks.cmd" connections
    ```

    Add that folder to your `PATH` to call it as `bks`. Per-machine (MSI) installs live under `C:\Program Files\beekeeper-studio` instead.

Not sure where it is? Run `beekeeper-studio cli` (or `beekeeper-studio cli --help`). The app does not run CLI commands itself, but it prints the exact location of `bks` for your install and the socket it listens on, then exits.

!!! tip "Agents with Node.js"
    `bks` is a plain Node.js program. If a tool already has `node`, it can also run `node "<install dir>/resources/bin/cli.js" <command>` directly.

## Commands

| Command | What it does |
| ------- | ------------ |
| `connections` | Lists the connections open in the app, with their id and whether CLI access is enabled |
| `list-schemas` | Lists the schemas in the connected database |
| `list-tables` | Lists tables. Same as `list-entities --entity-type table` |
| `list-entities` | Lists tables, views, materialized views and routines |
| `structure <name>` | Columns, primary key, indexes, foreign keys, triggers and the create script of a table or view |
| `query <sql>` | Runs a read-only SQL statement and prints the results. Each result is capped at 20,000 rows |
| `help` | Prints the usage text |

### Options

| Option | Applies to | Meaning |
| ------ | ---------- | ------- |
| `-c, --connection <name>` | all | Which open connection to use, by name or id. Required when more than one open connection has CLI access enabled |
| `-s, --schema <schema>` | `list-tables`, `list-entities`, `structure` | Limit to one schema. `structure` also accepts `schema.table` |
| `-t, --entity-type <type>` | `list-entities` | `table`, `view`, `materialized-view` or `routine`. Repeat the flag or comma-separate values |
| `--file <path>` | `query` | Read the SQL from a file. Pass `-` as the SQL argument to read it from stdin instead |
| `-f, --format <format>` | all | `json` (default) or `markdown` |
| `-h, --help` | all | Usage text |

### Choosing a connection

Every window in Beekeeper Studio can hold its own connection. If exactly one open connection has CLI access enabled it is used automatically. Otherwise pass `--connection`:

```bash
bks connections
bks list-tables --connection "Local Postgres"
```

### Environment variables

| Variable | Meaning |
| -------- | ------- |
| `BKS_CLI_SOCKET` | The socket (or Windows named pipe) the app listens on, when the app uses a non-standard data directory. `beekeeper-studio cli` prints the path |
| `BKS_CLI_DEV` | Set to `1` to talk to a development build of the app, which uses a separate socket |
| `BKS_ELECTRON_BINARY` | For the `bks` shell script only: the Beekeeper Studio executable to run the client with, if it is not found next to the script |

## Output

Results are JSON objects. Every result includes the connection that answered, so a script can check it ran against the database it expected.

```bash
$ bks query "select id, email from users limit 2"
{
  "connection": { "id": "7e1c…", "name": "Local Postgres" },
  "results": [
    {
      "command": "SELECT",
      "columns": ["id", "email"],
      "rows": [
        { "id": 1, "email": "ann@example.com" },
        { "id": 2, "email": "bo@example.com" }
      ],
      "rowCount": 2,
      "totalRowCount": 2,
      "truncated": false,
      "maxRows": 20000,
      "affectedRows": null
    }
  ]
}
```

- Rows are objects keyed by column name. Duplicate column names get a numeric suffix (`id`, `id_2`).
- A statement that returns more than 20,000 rows is cut off: `truncated` is `true` and `totalRowCount` holds the full count. Add a `LIMIT` to the query to page through large tables.
- Binary values are encoded as `{ "type": "binary", "encoding": "hex", "data": "…" }`. Integers outside JavaScript's safe range are returned as strings.
- `--format markdown` prints tables instead, which is easier to read in a terminal or to paste into a chat.

Errors are printed to stderr as `Error (CODE): message`, followed by a hint, and the process exits with status `1` (`2` for a usage mistake). Codes you may see: `NO_OPEN_CONNECTIONS`, `CLI_DISABLED`, `AMBIGUOUS_CONNECTION`, `UNKNOWN_CONNECTION`, `NOT_FOUND`, `READ_ONLY`, `QUERY_FAILED`.

## Audit log

The app writes one line of JSON to `cli.log` for every CLI call it answers, including calls that failed. The file sits next to the other Beekeeper Studio log files and rotates at 10 MB (the previous file is kept as `cli.old.log`):

| Platform | Location |
| -------- | -------- |
| Linux | `~/.config/beekeeper-studio/logs/cli.log` |
| macOS | `~/Library/Logs/beekeeper-studio/cli.log` |
| Windows | `%APPDATA%\beekeeper-studio\logs\cli.log` |

Each line records what was asked and a summary of what came back, never the data itself:

```json
{"time":"2026-10-30T13:12:40.512Z","command":"query","args":{"sql":"select id, email from users limit 2"},"connection":{"id":"7e1c…","name":"Local Postgres"},"ok":true,"durationMs":14,"responseBytes":412,"result":{"statements":1,"commands":["SELECT"],"rows":2,"totalRows":2,"truncated":false,"affectedRows":0}}
{"time":"2026-10-30T13:13:02.081Z","command":"list-tables","args":{"schema":"public"},"connection":null,"ok":false,"durationMs":1,"responseBytes":655,"error":{"code":"CLI_DISABLED","message":"CLI access is not enabled for the open connection \"Prod\"."}}
```

- `args` is what the caller sent, SQL included. SQL longer than 10,000 characters is cut, with `sqlLength` and `sqlTruncated` added.
- `connection` is the connection that answered, when one was selected.
- `result` depends on the command: counts of connections, schemas, entities or columns, or for `query` the number of statements, rows returned and whether a result hit the row cap.
- `error` carries the error code and message of a failed call.

Because the file is line-delimited JSON, `tail -f` shows calls as they happen and `jq` can filter them, for example `jq 'select(.ok == false)' cli.log`.

## Using it with an AI coding agent

Point your agent at the CLI instead of giving it a connection string. A short note in the project's agent instructions is enough:

```text
The database for this project is open in Beekeeper Studio. Inspect it with
`bks list-tables`, `bks structure <table>` and `bks query "<sql>"`. If a command
fails with CLI_DISABLED, ask me to enable CLI access for the connection.
```

The agent only ever sees what the app lets it see: every command is read only, the 20,000 row cap applies, each call is written to `cli.log`, and when you disconnect in the app the agent loses access.

## How it works

The app listens on a local socket (a Unix domain socket in the Beekeeper Studio data directory on Linux and macOS, a named pipe on Windows) that only your user account can open. `bks` sends one request over that socket and prints the reply. Nothing is exposed on the network, and no credentials leave the app.

`bks` itself is a single JavaScript file, `resources/bin/cli.js`, started by a tiny shell script (`bks`) or batch file (`bks.cmd`) that runs the app's executable in Node.js mode. That is why it starts in a fraction of a second and prints nothing but the result: the desktop app and its browser engine never load.
