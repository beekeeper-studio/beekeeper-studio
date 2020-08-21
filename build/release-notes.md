
## Table editing, Foreign Key Links, and other lovely things




Some really big features in this release, but the headliners are:
1. **Table Editing**: So long as your table has a `primary key` you can edit the values of the other columns right inside Beekeeper

2. **FK Links**: Click on a foreign key column to jump to that record in the foreign key table.

This release would not be possible without some massive community contributions. MVP for this release goes to @UtechtDustin, who has contributed quite a number of Pull Requests.

More features in this release:
- Cancel long running queries
- Query execution time
- Table view now shows total records and last refresh time
- Context menus (right click menus) for tabs
- SQL formatter for the SQL editor
- Added the option to copy a connection as a URL
- Fixed HEX value display in table view
- You can now toggle comments in the query editor as expected
- SSH tunnel switch is fixed
- There's a nice info message if you try and run a blank query
- PSQL connections use a default database if none is specified


### Pull Requests in this release

94632cb Merge pull request #299 from geovannimp/add-select-to-bool-type-at-edit-mode
2dffcf9 Merge pull request #296 from UtechtDustin/some-issues
f3aeb03 Merge pull request #294 from UtechtDustin/feature/added-shortcut-for-toggling-comments
2521b8c Merge pull request #293 from UtechtDustin/use-default-database-postgresql
56589e2 Merge pull request #291 from UtechtDustin/fix-ssh-tunnel-switch-status
dfb301f Merge pull request #289 from UtechtDustin/fix/199
890c412 Merge pull request #288 from UtechtDustin/add-open-to-copy-connection-url
41d83ba Merge pull request #285 from beekeeper-studio/context-menu
25a0423 Merge pull request #276 from beekeeper-studio/foreign-key-lookups
9ff3131 Merge pull request #282 from UtechtDustin/editorconfig
1815116 Merge pull request #271 from UtechtDustin/fix/259
86bdf4f Merge pull request #272 from UtechtDustin/fix/connectionString
91c01a2 Merge pull request #264 from beekeeper-studio/dependabot/npm_and_yarn/elliptic-6.5.3
9dfb1d6 Merge pull request #266 from UtechtDustin/show-no-query-message
1901d2d Merge pull request #268 from UtechtDustin/feature/259
Done in 0.06s.
