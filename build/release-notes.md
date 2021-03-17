# 1.10.0 - DEB Migration, and Major Engine Improvements

This release has been a long time coming, but we're about to pick up the pace!

We're wrapping up some long-outstanding technical debt to fix some really gnarley issues and improve usability across the board. Not a massive feature release, but a really satisfying one non the less.

## Included in this release

- Toggle the sidebar!
- Automated migration of DEB users to our new DEB repository, as Bintray is shutting down.
- Set cell values to `null` when editing a table
- Performance improvements by using `Object.freeze`
- Results with the same column name no longer clash (except Sqlite :-( )
- Much faster table loads for large tables using approximate row counts
- No duplicate table queries on table load
- Query identification improvements (eg quote escaped strings)

## PR Merges

a514a94 Merge pull request #590 from beekeeper-studio/tabletable-speedups
243d966 Merge pull request #569 from beekeeper-studio/sidebar-toggle
8009e5e Merge pull request #575 from beekeeper-studio/whitespace
390faff Merge pull request #570 from beekeeper-studio/set-null
7f29d20 Merge pull request #568 from beekeeper-studio/max-initial-width
5e6ecd0 Merge pull request #566 from beekeeper-studio/sqlserver-arrayrows
36c1e88 Merge pull request #525 from fabscav/feature/table-view-insert-row
da6f041 Merge pull request #557 from beekeeper-studio/freeze-all-the-things
9ead59e Merge pull request #563 from beekeeper-studio/mysql-rowmode
131db0b Merge pull request #556 from beekeeper-studio/apt-repo
6627bdc Merge pull request #548 from beekeeper-studio/moar-force-redraw
fa48628 Merge pull request #545 from beekeeper-studio/hotfix-1.9.3
c336a6d Merge pull request #540 from moisespsena/pg_bytea_to_base64
99e7f5e Merge pull request #395 from fabscav/feature/table-view-delete-rows

