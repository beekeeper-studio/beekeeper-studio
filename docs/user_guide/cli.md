---
title: Command Line Interface
summary: "Query the database that is open in Beekeeper Studio from a terminal, a script, or an AI coding agent with the beekeeper-studio cli commands."
icon: material/console
---

# Command Line Interface

`beekeeper-studio cli` runs a handful of read-mostly commands against a database connection that is **already open in the Beekeeper Studio app**: list schemas and tables, describe a table, run a query. The output is JSON by default, which makes it a good fit for scripts and for AI coding agents that need to look at a schema or check some data without being handed database credentials.

The CLI does not connect to databases on its own. It talks to the running desktop app over a local socket, and the app runs the command on the connection it already holds. Close the app, or disconnect, and the CLI stops working.

```bash
beekeeper-studio cli list-tables --schema public
beekeeper-studio cli structure public.users
beekeeper-studio cli query "select id, email from users order by id limit 5"
```

## Enabling CLI access

CLI access is off for every connection by default. Turn it on in one of two ways:

1. **Per connection**: check **Enable CLI Access** in the connection form (next to **Read Only Mode**), save the connection, and connect. Only connections with the box checked answer CLI commands.
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

**Read Only Mode** still applies: a connection opened in read only mode rejects writes from the CLI just as it does in the SQL editor.

## Running the command

Pass `cli` as the first argument to the Beekeeper Studio executable. Where the executable lives depends on how you installed the app:

=== "Linux"
    The deb, rpm, pacman and snap packages put `beekeeper-studio` on your `PATH`:

    ```bash
    beekeeper-studio cli connections
    ```

    For an AppImage, run the AppImage file itself: `./Beekeeper-Studio-*.AppImage cli connections`.

=== "macOS"
    The executable is inside the app bundle. An alias keeps the commands short:

    ```bash
    alias beekeeper-studio="/Applications/Beekeeper Studio.app/Contents/MacOS/Beekeeper Studio"
    beekeeper-studio cli connections
    ```

=== "Windows"
    ```powershell
    & "$env:LOCALAPPDATA\Programs\beekeeper-studio\Beekeeper Studio.exe" cli connections
    ```

    The installer location differs for per-machine (MSI) installs: look under `C:\Program Files\beekeeper-studio`.

!!! note "Startup noise"
    The command runs through the Electron binary, so on some systems the desktop toolkit prints warnings to **stderr** when it starts. The command's result is always written to **stdout** on its own, so `beekeeper-studio cli ... 2>/dev/null` or capturing only stdout gives you clean JSON.

## Commands

| Command | What it does |
| ------- | ------------ |
| `connections` | Lists the connections open in the app, with their id and whether CLI access is enabled |
| `list-schemas` | Lists the schemas in the connected database |
| `list-tables` | Lists tables. Same as `list-entities --entity-type table` |
| `list-entities` | Lists tables, views, materialized views and routines |
| `structure <name>` | Columns, primary key, indexes, foreign keys, triggers and the create script of a table or view |
| `query <sql>` | Runs SQL and prints the results. Each result is capped at 20,000 rows |
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
beekeeper-studio cli connections
beekeeper-studio cli list-tables --connection "Local Postgres"
```

## Output

Results are JSON objects. Every result includes the connection that answered, so a script can check it ran against the database it expected.

```bash
$ beekeeper-studio cli query "select id, email from users limit 2"
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

Errors are printed to stderr as `Error (CODE): message`, followed by a hint, and the process exits with status `1` (`2` for a usage mistake). Codes you may see: `NO_OPEN_CONNECTIONS`, `CLI_DISABLED`, `AMBIGUOUS_CONNECTION`, `UNKNOWN_CONNECTION`, `NOT_FOUND`, `QUERY_FAILED`.

## Using it with an AI coding agent

Point your agent at the CLI instead of giving it a connection string. A short note in the project's agent instructions is enough:

```text
The database for this project is open in Beekeeper Studio. Inspect it with
`beekeeper-studio cli list-tables`, `beekeeper-studio cli structure <table>` and
`beekeeper-studio cli query "<sql>"`. If a command fails with CLI_DISABLED, ask me
to enable CLI access for the connection.
```

The agent only ever sees what the app lets it see: the connection's Read Only Mode applies, the 20,000 row cap applies, and when you disconnect in the app the agent loses access.

## How it works

The app listens on a local socket (a Unix domain socket in the Beekeeper Studio data directory on Linux and macOS, a named pipe on Windows) that only your user account can open. The `cli` command sends one request over that socket and prints the reply. Nothing is exposed on the network, and no credentials leave the app.
