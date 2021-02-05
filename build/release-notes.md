
## 1.9.2 State management bugfixes

This is a small release to fix a few annoying state management issues:

1. Postgres queries that return two columns with the same name will no longer conflict, eg: `select 1, 2`.
2. Altering a table, then refreshing a table tab will now update the table schema appropriately
3. Contents of tables will no longer disappear or garble when scrolling, this happened with some larger tables. There might be a slight performance regression, but I think the trade of is worth it.

