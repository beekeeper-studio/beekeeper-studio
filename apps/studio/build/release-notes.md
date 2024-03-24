
# 4.2 - One decimal from the life, the universe, and everything

We've spent the first few months of the year working on resolving small complaints, fixing bugs, and smoothing rough edges.

In particular we've made maintaining the two different apps a lot easier by moving a lot of code into the open source repo.

That said there's a LOT of stuff in this release.

## Headline features

- One tab per table - Ok fine, you all asked for this, now we only allow one tab open per table.
- Firebird support - The Ultimate edition now has support for the Firebird database engine
- SQLite duplicate column bug fix - you can now select two columns with the same name without them becoming a single column
- .sql file import - In the `saved queries` section you can now import .sql files into your saved queries.
- Better drag/drop support for .sql files - drag and drop a .sql file anywhere to open in a new query tab


## Loads of other stuff

- Spreadsheet mode improvements - better resizing, multi-select, and range select behavior.
- Some regression fixes
- Exactly 3 bajillion tweaks and minor fixes
- Generated columns are now shown and correctly labelled


## Under the hood
- We spent a LOT of time trying to make Beekeeper Studio more maintainable, backporting a lot of code from the ultimate version, and rewriting entire components to make them more modular. This has resulted in 0 new fixes, and likely a few bugs, but it helps us move faster in the future.
  - In particular, merge conflicts when merging community and master have been a real problem lately, these changes should help alleviate that.
- We also migrated all of our database drivers to a typescript-based class model. While this also probably introduced a few bugs we haven't yet found, it allowed us to remove ~1000+ lines of generic code, and makes implementing a new database driver a lot quicker.


ee6b7a20 Merge pull request #2024 from beekeeper-studio/autocomplete-load-cols-fix
e8bfa7b4 Merge pull request #2023 from beekeeper-studio/feat/hidden-column-indicator
c0202f00 Merge pull request #2022 from beekeeper-studio/mssql-version-tests
89d98fc5 Merge pull request #2026 from beekeeper-studio/dependabot/npm_and_yarn/follow-redirects-1.15.6
202e3055 Merge pull request #2016 from beekeeper-studio/cassandra-client
87445f86 Merge pull request #2014 from beekeeper-studio/fix-clashing-css-class
7c8c28b9 Merge pull request #2015 from beekeeper-studio/fix-nullable-editor-parser
56f23474 Merge pull request #1981 from beekeeper-studio/sqlite-result-as-array
989be53f Merge pull request #1975 from beekeeper-studio/tabulator-update
769776cd Merge pull request #2004 from beekeeper-studio/fix-codemirror-gutters
bd7f6c08 Merge pull request #1966 from beekeeper-studio/fix-sqlite-generated-columns
2cb16a65 Merge pull request #1924 from beekeeper-studio/fix/insert-table-name
8187e675 Merge pull request #1972 from beekeeper-studio/dependabot/npm_and_yarn/ip-1.1.9
0c75163d Merge pull request #2001 from beekeeper-studio/table-filter-regressions
e3c2694e Merge pull request #2007 from beekeeper-studio/fix-empty-column-export
c1024f36 Merge pull request #1953 from beekeeper-studio/bigquery-client
dd3f5819 Merge pull request #1989 from MiniGeospatial/getViewCreateScript
874b29ce Merge pull request #1998 from beekeeper-studio/fix/focus-sql-text-editor
eeff3b50 Merge pull request #2000 from beekeeper-studio/fix/tabulator-table-regressions
8d25e159 Merge pull request #1996 from beekeeper-studio/fix/renaming-column
2c4c1aed Merge pull request #1991 from beekeeper-studio/bugfix/apply-changes-issue
90062a3f Merge pull request #1990 from beekeeper-studio/fix/redshift-error
a2e19655 Merge pull request #1988 from beekeeper-studio/bugfix/escapeHtml-Results-Table
450df82f Merge pull request #1983 from beekeeper-studio/ultimate-driver-backports
a2de0bda Merge pull request #1974 from beekeeper-studio/wmontgomery-patch-1
801ea7e9 Merge pull request #1971 from beekeeper-studio/ultimate-backports
991d1667 Merge pull request #1965 from omahs/patch-1
8096c987 Merge pull request #1969 from beekeeper-studio/fix/css-vendor
0e6203c3 Merge pull request #1955 from beekeeper-studio/fix/spreadsheet-data
2c203e7b Merge pull request #1956 from beekeeper-studio/fix/tabletable-export
74ab88f6 Merge pull request #1835 from beekeeper-studio/feature/1738_Readable-DateTime
65af9cb6 Merge pull request #1935 from therealrinku/fix/popup-after-creating-table
e0b7e016 Merge pull request #1907 from beekeeper-studio/refactor/text-editor
823a5164 Merge pull request #1928 from beekeeper-studio/feature/1851_SqlServerToClass
fd725361 Merge pull request #1934 from austinwilcox/fixVimQuit
6a1167ff Merge pull request #1779 from beekeeper-studio/feature/data-picker
2f3db7b5 Merge pull request #1941 from beekeeper-studio/fix/header-tooltip-xss
0dd3d644 Merge pull request #1936 from therealrinku/fix/copy-json-fix
6701f227 Merge pull request #1938 from jc00ke/master
1d82f920 Merge pull request #1909 from beekeeper-studio/postgres-client
65d679b0 Merge pull request #1913 from beekeeper-studio/feat/import-export-sql
f696fa0a Merge pull request #1917 from beekeeper-studio/fix/minor-fixes
0ec8fae9 Merge pull request #1861 from beekeeper-studio/refactor/mysql-to-ts
46bde4c6 Merge pull request #1879 from austinwilcox/vimrcImprovements
b0aef6a4 Merge pull request #1869 from beekeeper-studio/dependabot/npm_and_yarn/follow-redirects-1.15.4
5e99ee35 Merge pull request #1834 from beekeeper-studio/fix/one-tab-one-table
be5ee18c Merge pull request #1873 from beekeeper-studio/sass-migration
04f10ea9 Merge pull request #1859 from luca1197/tablelength-formatting
14ddcdaf Merge pull request #1855 from invisal/feat/long-query-notification
9df859ef Merge pull request #1843 from Christof-P/feat/show-password-option
d48b399c Merge pull request #1821 from marco-lavagnino/master
64493d24 Merge pull request #1829 from beekeeper-studio/finish-bigquery
c20d3692 Merge pull request #1811 from beekeeper-studio/feat/initial-firebird
dcc2c67b Merge pull request #1904 from beekeeper-studio/add-sort-buttons
