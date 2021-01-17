
## 1.9 Functions, Procedures, and SSL love

Oh hey there lovely Beekeeper Studio users.

This release adds a few nice things folks have been asking for, mostly little things, but you know it's the little things that make software nice to use.

### In this release

**Headline Feature**: We've added custom functions and procedures to the database UI sidebar. The UI shows argument types and return types, and allows you to pin them alongside tables and views.

1. Reorder your pinned items!
2. SSL connections now allow you to toggle `requireAuthorization` if you provide your own certificate, allowing both `sslMode=require` and `sslMode=verify`.
3. Tab reordering - you can drag and drop your tabs to reorder them.
4. Table tabs now allow you to filter with a SQL condition, so you can filter on multiple columns or do other, more complex things.
5. Passwordless connections for PSQL/Cockroach - if you have to provide a client cert, but no password, you can now do this.
6. Refresh a table tab by clicking on the last refresh time in the UI.

### Pull Requests in this release
e6e6215 Merge pull request #500 from beekeeper-studio/routines
99ebb61 Merge pull request #459 from beekeeper-studio/dupe-column-results
8b84c5a Merge pull request #425 from fabscav/feature/tab-reorder
b371bb7 Merge pull request #427 from fabscav/feature/table-view-raw-search
