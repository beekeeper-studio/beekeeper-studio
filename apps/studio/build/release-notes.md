
## Headline Features

1. DuckDB support
2. Column reordering on the structure view
3. RPM, Flatpak, and AUR installers for Linux


That's right, DuckDB has landed. Using DuckDB you can query a whole range of files - CSV files, Parquet files, or even other databases!

We also have a whole bunch of other great minor features and bug fixes in this release:

## Minor Additions

- Fixed some bugs with Redshift queries
- Fixed some null serialization issues with binary columns
- Fixed a bunch of minor SQLite bugs like read-only mode not enabling in some situations
- No more BigInt truncation
- Adding databases for SQLite is now working right
- Fixed a few race conditions causing issues in the query editor and the JSON row viewer
- Added some missing functionality for Cassandra


## Merged PRs

c94dacfc1 Merge pull request #2715 from beekeeper-studio/dependabot/npm_and_yarn/vite-5.4.12
7dbb63fca Merge pull request #2716 from beekeeper-studio/feat/in-app-registration-form
01d0746b6 Merge pull request #2723 from MasterOdin/fix-redshift-table-structure
7cf5a9cea Merge pull request #2309 from beekeeper-studio/feat/duckdb
10af81ee5 Merge pull request #2721 from beekeeper-studio/fix/sqlite-db-dropdown
2b7ff8de6 Merge pull request #2651 from beekeeper-studio/more-installers
46204797f Merge pull request #2720 from MasterOdin/feat-mysql-ed25519
4d97b9a16 Merge pull request #2717 from MasterOdin/fix-mysql-index-unique
b8656efe9 Merge pull request #2719 from beekeeper-studio/fix/text-editor-race-cond
9fe9f8cea Merge pull request #2672 from beekeeper-studio/fix/json-column-json-viewer
796a9a1fa Merge pull request #2634 from beekeeper-studio/dependabot/npm_and_yarn/nanoid-3.3.8
1f3c891ad Merge pull request #2707 from MasterOdin/mpeveler/fix-sqlite-readonly
735d4c974 Merge pull request #2706 from MasterOdin/mpeveler/fix-sqlite-test
510beaceb Merge pull request #2527 from beekeeper-studio/fix/logging
7612f0432 Merge pull request #2523 from beekeeper-studio/feature/1341_reorder-columns
78bf78499 Merge pull request #2687 from beekeeper-studio/fix/bigint-truncation
18ffeef68 Merge pull request #2688 from beekeeper-studio/fix/binary-null-serialization
206063dea Merge pull request #2690 from beekeeper-studio/fix/json-view-fold
fb8b26077 Merge pull request #2686 from beekeeper-studio/bugfix/import-from-file-table-table
4df7c44a4 Merge pull request #2664 from beekeeper-studio/fix/filter-connections
1fa15e996 Merge pull request #2674 from anilsenay/cassandra-parse-rows
21aaf95bc Merge pull request #2678 from beekeeper-studio/fix/add-database
7d77f8c5d Merge pull request #2680 from beekeeper-studio/fix/json-row-viewer-view
