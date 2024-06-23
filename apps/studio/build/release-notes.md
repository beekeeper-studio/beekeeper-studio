
A new release of Beekeeper Studio is out, version 4.6. This release includes support for Azure SSO, LibSQL, and a bunch of bug fixes. It's getting hot here in Texas, so our releases will be getting hotter too 🔥🔥.

## Headline Features

### Azure SSO Support for SQL Server

We've added support for Azure SQL Single Sign On. You can now authenticate with Azure SQL using your Azure Active Directory credentials.

This makes it easier to connect to Azure SQL databases, and is a feature that many of our users have been asking for.

### LibSQL Support

We've added support for [LibSQL](https://github.com/tursodatabase/libsql). LibSQL is a fork of SQLite which is designed to expand the scope and capabilities of SQLite to include remote hosted SQLite, and built-in automatic replication of local files. It's pretty cool (and MIT licensed).

libSQL is maintained by [Turso](https://turso.tech), which offers a managed version of libSQL and whose mission it is to build SQLite for production in modern distributed applications.

## Other Changes

- Fixed a bug that prevented some users from properly using Beekeeper for cassandra connections
- Added filters to the connections and saved query sidebars
- Fixed a bug that caused the query canceled icon to not show up
- Fixed a bug that caused the launcher to not work on Ubuntu
- Added a SQL import feature to import a bunch of .sql files into Beekeeper Studio


## PRs Merged

ee3bdea6 Merge pull request #2216 from beekeeper-studio/fix/minimal-mode-auto-resize
ab26569c Merge pull request #2214 from beekeeper-studio/fix/editor-modal-autofocus-autoresize
e953a708 Merge pull request #2208 from beekeeper-studio/feat/minimal-mode
3ce73df3 Merge pull request #2212 from therealrinku/fix/disabled-filter-state
3f1c72ef Merge pull request #2210 from beekeeper-studio/e2e-tests
51f076a3 Merge pull request #2162 from beekeeper-studio/chore/resolve-language
7e695c46 Merge pull request #2185 from beekeeper-studio/fix/autoincrement-pk-table-builder
932803e4 Merge pull request #2188 from beekeeper-studio/fix/nulls-not-distinct
df818b26 Merge pull request #2203 from beekeeper-studio/fix/keyboard-issues
02618dfc Merge pull request #2206 from beekeeper-studio/feat/minimal-mode
0e02534b Merge pull request #2058 from beekeeper-studio/feat/import-sql-files
52ab675e Merge pull request #2179 from beekeeper-studio/prefix-length-mysql
90701222 Merge pull request #2172 from beekeeper-studio/fix/vim-yanking-again
beeab2e1 Merge pull request #2186 from beekeeper-studio/style-upgrade-button
5aead738 Merge pull request #2181 from beekeeper-studio/style-connection-upsell
