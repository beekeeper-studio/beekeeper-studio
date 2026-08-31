# Beekeeper Studio 5.9.0

This is a big one. Snowflake support — which we've been teasing for a couple of releases — has finally landed, bringing our fully-featured driver count up another notch. SQL Server gets proper integrated (Windows/Kerberos) authentication, and there's a pile of everyday-workflow upgrades: paste copied data straight in as new rows, pick enum values from a dropdown, rename things inline in the sidebar, and move queries, folders, and connections around from a single dialog. On top of that there's a long tail of bug fixes, SSH and packaging improvements, and a security fix worth calling out.

## Highlights

- **Snowflake support.** Our long-awaited Snowflake driver is here. Connect with username/password, SSO via browser, or multi-factor auth (authenticator code or Duo push), with token caching where your account allows it. You get full schema browsing, views and materialized views, primary/foreign keys, index create/drop, create-script (DDL) retrieval, table cloning, and transactional inserts/updates/deletes — plus streaming and cancellation for big queries. The connection form takes your account ID, default database, and warehouse, and there's a read-only mode for locked-down environments.

- **SQL Server integrated (Windows/Kerberos) authentication.** Connect to your SQL Server using either integrated Windows auth, or Kerberos. Kerberos authentication works across all three operating systems (although it sometimes requires system-wide libraries installed).


## Notable Improvements

- **Paste data as new rows.** Copy a block of data from anywhere and paste it into a table as new rows instead of overwriting the cells you've selected — the quick way to port a chunk of data between tables without setting up a full import. There's a dedicated keybinding, and backspace now clears a selected range as you'd expect.

- **Pick enum values from a dropdown.** Enum columns now offer their valid values in a dropdown right in the table and result grids, so you don't have to remember or retype them. Works on PostgreSQL, CockroachDB, MySQL/MariaDB, DuckDB, and ClickHouse.

- **One move-to dialog for everything.** The move-to modal now handles saved queries and (sub)folders as well as connections, so you can reorganize the whole sidebar from one consistent dialog instead of a scatter of context-menu entries.

- **Inline renaming in the sidebar.** Rename queries, connections, and folders inline, right where they live.

- **Plugin keyboard shortcuts.** Plugin menu items can now be bound to custom keyboard shortcuts via the config file.

- **New "unix timestamp" query magic.** Convert a Unix timestamp (seconds, milliseconds, microseconds, or nanoseconds) to a readable date string, with timezone and ISO formatting options — e.g. `columnname__format__unixtime__ms__utc`.

- **Smarter SSH config handling.** Previously-silent `~/.ssh/config` problems now surface as non-blocking warning toasts on connect/test (unparseable config, bad ownership/permissions, or a missing `IdentityFile` in agent mode). SSH tunnels now skip entries with a missing `IdentityFile`, and Beekeeper uses ssh-config's native `Match exec` handling instead of stripping Match blocks by hand. A new `[security] allowSshConfigMatchExec` option (default true, matching `ssh(1)`) lets you disable execution of `Match exec` directives.

- **SSH tunneling for more engines.** Fixed SSH tunneling for ClickHouse and Firebird, and added bastion/jump-host support for MongoDB (forcing `directConnection` so it actually works).

- **ClickHouse custom SSL certificates.** ClickHouse connections now support custom SSL certificates for encrypted connections. Thanks @mastercactapus!

- **DynamoDB is now in beta.** DynamoDB moves from planned to beta support, with a new connection guide covering IAM auth and local-endpoint configuration.

- **Sidebar remembers where you were.** The last-open sidebar tab persists across restarts, and the default sidebar tab is configurable.

## Full Change List

### New Features
- Snowflake driver: connections, schema browsing, views/materialized views, keys, indexes, DDL retrieval, table cloning, transactional writes, streaming and cancellation (#4323)
- SQL Server integrated (Windows/Kerberos) authentication, with Encrypt toggle and optional SPN override (#4416, #4430)
- Paste copied data as new rows, with a dedicated keybinding; backspace clears a selected range (#4450)
- Select enum values from a dropdown — PostgreSQL, CockroachDB, MySQL/MariaDB, DuckDB, ClickHouse (#4444)
- Unified move-to dialog for connections, saved queries, and (sub)folders (#4448)
- Inline renaming of queries, connections, and folders in the sidebar (#4250)
- Plugin menu items support configurable keyboard shortcuts (#3837)
- New unix-timestamp query magic (#4401). Thanks @Squidysquid1!
- ClickHouse custom SSL certificate support (#4343). Thanks @mastercactapus!
- DynamoDB beta support and connection docs (#4298)
- Persist last-open sidebar tab across restarts; configurable default sidebar selection (#4440, #4447)

### Bug Fixes
- Restoring the edited text of a saved query was broken (#4443)
- Auto-refresh now works when making table alterations from the query editor (#4442)
- BigQuery NUMERIC/BIGNUMERIC (and other custom-type) values now display correctly (#4391)
- SQL Server autocomplete handles bracket-quoted `[identifiers]` correctly (#4437)
- Editing a PostgreSQL array of enums no longer throws a JSON error (#4238)
- Newly added columns no longer become invisible when dragged to reorder (#4418). Thanks @aanthoonyy!
- Team subfolders show their own name instead of the parent's (#4403)
- Query import clears the folder ID for correct personal-folder placement (#4406)
- Fixed two import bugs: a `generateColumnTypesFromFile` TypeError and a CSV error message (#4244)
- Paste a single value across all selected cells (#3972). Thanks @anabdsantos!
- Proper string escaping in the TableMenu copy actions (#4421). Thanks @Squidysquid1!
- Simplified delete context-menu wording (#4386)
- Reverted AppImage to the default runtime for AppImageLauncher compatibility

### SSH
- Surface invalid/untrusted ssh config and missing identity files as non-blocking warning toasts (#4378 and related)
- Use ssh-config's native `Match exec` support instead of stripping Match blocks
- New `[security] allowSshConfigMatchExec` option to control execution of `Match exec` directives
- Skip SSH tunnel entries with a missing `IdentityFile` (#4368)
- Fixed SSH tunneling for MongoDB, ClickHouse, and Firebird (#4435)

### Security
- Fixed a plugin-manifest path-traversal vulnerability (GHSA-3wfm-5rhc-mg5c) that could trigger arbitrary recursive directory deletion on uninstall; plugin IDs are now validated and must match their install directory (#4393)
- Misc dependency vulnerability fixes (#4392)

### Packaging & Platform
- Migrated Snap builds to electron-builder's native core24 snapcraft config to fix broken snap builds (#4427)
- Switched Windows code signing from Azure to Google Cloud KMS (#4424)
- Upgraded electron-builder to 26.11.1 and configured the AppImage toolset (#4315), with follow-up toolset config cleanup (#4432)
- Fixed desktop-environment window association on Linux (#4429)

### Internal / Tooling
- Migrated the TableSchemaValidation editor to the shared UI Kit text editor (#4327)
- Upgraded Vite to v8 (#4394)
- Upgraded the ERD library (#4364)
- Updated the Tabulator data-grid library (#4400)
- Structured plugin error classes/codes for better diagnostics (#3316)
- Extracted folder-tree logic into reusable utilities (#4408)
- Test/CI: pinned the ClickHouse Docker image to stop timeouts, static ed25519 SSH fixture, lightweight none-auth tunnel harness, dockerized Samba AD + SQL Server Kerberos stack, and regression tests for several utility bugs
- Dependency bumps: @babel/core, dompurify, fast-xml/builder, form-data, @grpc/grpc-js, protobufjs, qs, shell-quote, tmp, @tootallnate/once, typeorm, undici, vitest, ws
