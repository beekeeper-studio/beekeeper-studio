---
title: SQL Editor
summary: "A quick guide on using Beekeeper Studio's best-in-class SQL Editor"
old_url: "https://docs.beekeeperstudio.io/docs/using-the-sql-editor"
icon: material/code-tags
---

Writing SQL is such a fundamental part of interacting with a relational database that we put this functionality front and center.

You can use the SQL query tab to write, and run, SQL queries quickly and easily.

## Code completion

We have tried to make our code completion useful but not intrusive.

Code suggestions will automatically appear in the following situations:

- `tables` will be suggested after typing `from` or `join`
- `columns` will be suggested after typing a tablename, or table alias, followed by a period, eg `film.`

In these situations, Beekeeper will automatically resolve the correct table and column names for the entity you are querying.

### Manually triggering autocomplete

The default key combo to manually trigger autocomplete is `Ctrl+Space`.

![Image Alt Tag](../../assets/images/using-the-sql-editor-11.gif)

## Run Contexts

If you like writing big long SQL scripts with multiple queries in the same editor pane (I know I do), you might want to only run a portion of your script at a time.

Beekeeper allows you to:

1. Run everything (this is the default)
2. Run only the 'current' query (Beekeeper highlights this query for you so you know what will run)
3. Run only what you have selected.

![Image Alt Tag](../../assets/images/using-the-sql-editor-12.gif)

## Transaction Management

Transactions run within the query editor will be automatically detected by Beekeeper, which will then reserve a connection for your current query tab until that transaction is committed or rolled back.

There is also a [Manual Transaction Mode](./manual-transaction-management.md) that allows you to manually handle every step of this process.

This functionality is currently only available for Postgres, CockroachDB, Redshift, MySQL, MariaDB, SQLServer, Firebird, and Oracle.

## Query Parameters

You can parameterize your queries and Beekeeper will prompt you for values when you run it.

You can use three types of syntax `:variable`, `$1`, or `?` depending on the database engine you are querying.

```sql
select * from table where foo = :one and bar = :two

select * from table where foo = $1 and bar = $2
```
![Image Alt Tag](../../assets/images/using-the-sql-editor-13.gif)

You can configure which syntax is active for your database engine using the [config file](../configuration.md).

```ini
; Enable all parameter types for postgres (not recommended)
[db.postgres.paramTypes]
positional = true
named[] = ':'
named[] = '@'
named[] = '$'
numbered[] = '?'
numbered[] = ':'
numbered[] = '$'
quoted[] = ':'
quoted[] = '@'
quoted[] = '$'
```


## Downloading Results

When you run a query, the results will appear right underneath the SQL editor, simple!

![Image Alt Tag](../../assets/images/using-the-sql-editor-99.png)

If you run multiple SQL queries, you can select different result sets with the dropdown on the status bar. You'll get a little popup to tell you about it the first time you do it.

### Large Resultsets

If you run a query that generates a result set of more than 50,000 records Beekeeper will truncate the result table (to conserve memory).

In the commercial edition of Beekeeper Studio, you can also select `Run To File`, this will run your SQL query and send the full results directly to a CSV file.

## Vim Mode
Along with the default query editor, Beekeeper supports Vim mode, which allows you to write queries in a Vim-like text editor.

To enable this, you can click the cog in the bottom left corner of the query editor:

![editor mode selection](../../assets/images/using-the-sql-editor-155.png)

And then you're off to the races with a vim editor in Beekeeper!

Whichever editor you prefer will be preserved across all connections/restarts/etc.

### Customisation
You can also add your own keybindings and motions to the vim editor by placing a `.beekeeper.vimrc` file in the `userDirectory` for Beekeeper Studio and writing out your custom mappings.

`userDirectory` locations:
- Windows: `%APPDATA%\beekeeper-studio`
- Linux: `~/.config/beekeeper-studio`
- MacOS: `~/Library/Application Support/beekeeper-studio`

For instance, if you're a Helix user, you can add `gl` and `gh` commands like this:

```
nmap gl $
nmap gh ^
```

These commands add motions for `gl` to go to the end of a line, and `gh` to go to the beginning of a line

We currently only support the `nmap`, `imap`, and `vmap` commands, but we hope to introduce more in the future!


