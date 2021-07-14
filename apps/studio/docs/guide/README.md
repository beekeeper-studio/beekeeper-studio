---
title: User Guide
sidebarDepth: 2
---

## Connecting to a Database

The connection screen allows you to enter connection information for your database.

Note - Beekeeper Studio does not support unix socket connections for PSQL or MYSQL, only TCP connections.

### SSL

There are three ways to connect to a database with SSL
1. **Trust the server:** Connect with SSL without providing your own certificate.
2. **Required Cert:** Connect with SSL, provide your own certs, and disable `rejectUnauthorized`.
3. **Verified Cert:** Connect with SSL, provide your own certs, and enable `rejectUnauthorized`.

Here's a table of how the various `sslmode` flags from command line clients map to Beekeeper:

| sslmode | Turn on SSL? | rejectUnauthorized |
|------|-----|-----|
| disable |	no | 	n/a |
| allow |	no | 	n/a |
| prefer |	no | 	n/a |
| require |	yes | 	false |
| verify-ca |	yes | 	false |
| verify-full |	yes | 	true |


Once you are connected to your database Beekeeper Studio allows you to open tabs to do the following things:

1. SQL Editor: Write and execute SQL Queries (this is what tabs do by default)
2. Table Explorer: View table contents

## File Associations

Beekeeper Studio provides file associations so you can do the following things without opening the app:

- Double click a sqlite `.db` file in a file browser to open it in Beekeeper Studio!
- Open URLs and files from the terminal:
  - Mac: `open postgresql://user@host/database` or `open ./example.db`
  - Linux: `xdg-open postgresql://user@host/database` or `xdg-open ./example.db`


## SQL Editor

Writing SQL is such a fundamental part of interacting with a relational database that we put this functionality front and center.

You can use the SQL query tab to write, and run, SQL queries quickly and easily.

### Code Completion

We have tried to make our code completion useful but not intrusive. 

Code suggestions will automatically appear in the following situations:

- `tables` will be suggested after typing `from` or `join`
- `columns` will be suggested after typing a tablename, or table alias, followed by a period, eg `film.`

In these situations, Beekeeper will automatically resolve the correct table and column names for the entity you are querying.

Oh, you want to manually trigger code-suggestions? The default key combo is `Ctrl+Space`, or `Cmd+Space`.

![SQL Auto Complet](../assets/img/auto-complete.gif)


### Run Contexts

If you like writing big long SQL scripts with multiple queries in the same editor pane (I know I do), you might want to only run a portion of your script at a time.

Beekeeper allows you to:

1. Run everything (this is the default)
2. Run only the 'current' query (Beekeeper highlights this query for you so you know what will run)
3. Run only what you have selected.

![sql editor](../assets/img/bks-editor-runs.gif)


### Query Parameters

You can parameterize your queries and Beekeeper will prompt you for values when you run it.

You can use two types of syntax `:variable`, or `$1`

```sql
select * from table where foo = :one and bar = :two

select * from table where foo = $1 and bar = $2
```
![Query parameters gif](../assets/img/bks-editor-params.gif)


## Table Explorer

Click the little `open` button next to a table name to open the table in a table-tab.

Now you can filter, sort, and explore your table data all day.

![table tab](../assets/img/table-tab.png)

### Edit Table Data

Assuming your table has a (single) primary key, you can edit your data right inside of Beekeeper Studio. Don't worry, Beekeeper stages your changes so you can discard them if you make a mistake.

Ways to edit data:
1. Click a cell to edit the contents
2. Right click a row and select `clone` to duplicate the row
3. Right click a row and select `delete` to delete the row
4. Click ⚙ and select `Add Row` to create a new row

After editing data, click `Commit` in the table footer to commit your changes.

> **Note** if you sort or filter the table while editing you will discard your changes.

### Export Table Data

Click the ⚙ icon in the table footer and select `Export` to export table data to CSV, JSON, or SQL formats.

You can export either the entire table, or the currently filtered view.


## Keyboard Shortcuts

### General Shortcuts

New Window <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>

New Tab <kbd>Ctrl</kbd> + <kbd>T</kbd>

Close Tab <kbd>Ctrl</kbd> + <kbd>W</kbd>

Format Query <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>

Run Query <kbd>Ctrl</kbd> + <kbd>↩</kbd>

### Edit
Undo       <kbd>Ctrl</kbd> + <kbd>Z</kbd>

Redo       <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>Z</kbd>

Cut        <kbd>Ctrl</kbd> + <kbd>X</kbd>

Copy       <kbd>Ctrl</kbd> + <kbd>C</kbd>

Paste      <kbd>Ctrl</kbd> + <kbd>V</kbd>

Select All <kbd>Ctrl</kbd> + <kbd>A</kbd>
