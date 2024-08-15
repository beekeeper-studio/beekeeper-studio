---
title: Browse and Edit Table Data
summary: "View, search, and modify your database table data using our built-in table explorer."
old_url: "https://docs.beekeeperstudio.io/docs/creating-tables"
---


Double click a table in the left sidebar to open an Excel-like interface for viewing and editing the data. We call this the **Table View**

![Image Alt Tag](../assets/images/creating-tables-14.png)


This view allows you to:
- Interact with your table like it is a spreadsheet
- Filter the view to see specific records
- Easily edit data
- Copy/Paste data from elsewhere
- Export the whole or partial table to a range of formats


## Interaction

The table view provides a spreadsheet-like experience for selecting, copying, and pasting data. Beekeeper supports many spreadsheet-like interaction primitives.

1. Select arbitrary ranges of cells using click & drag, ctrl-click, and shift-click.
2. Hide columns by right clicking the header and choosing `hide column`
3. Resize columns, either one at a time, or together
4. Copy and paste ranges of cells from Excel or Google Sheets with native keyboard shortcuts


## Filtering The Table View

At the top of the table are data filters. You can use these to search your table for the specific data you want.

There are two types of filter you can use - the filter GUI, and the raw SQL filter

### Filter GUI

![Database table filter GUI](../assets/images/table-view-filters.png)

The filter GUI lets you check any column on the table for a variety of conditions:
- Equality
- Greater than / less than
- Like
- IN

!!! warning
    When using `LIKE` in your filters, don't forget to use `%`. For example to find all titles that contain `foo` you would write: `%foo%`, not `foo`

### Raw SQL filters

Click the little `<>` icon to the left of the filters to enter a sql filter. You can type anything in here that would appear in the `WHERE` clause of a sql statement.

![Table view SQL filter](../assets/images/table-view-sql-filters.png)


## Editing Data

In the table view you can easily edit any cell you like. Simply double click the cell to edit.

!!! note
    Beekeeper only supports editing tables with primary keys.

### Editing JSON & Other Large Values

Editing a JSON document in a tiny table cell isn't a great experience. Instead you can right click the cell and select `Edit in Modal`. This will provide a pop-out modal with syntax highlighting and checking.

![Editing JSON values in SQL Database using Beekeeper Studio](../assets/images/table-view-modal-edit.png)

### Editing tables that don't have primary keys

Beekeeper Studio doesn't typically allow you to edit a table that does not contain a primary key, but other database GUIs allow this, so what gives?

In general, if you don't have a primary key on your table there is **no reliable way to identify a specific row**. Some GUIs support editing in this situation, but they use a *heuristic* to determine which row to update. A common technique is matching all the values of the row to perform the update, or using a secret row identifier.

#### A not on secret/internal row identifiers

Some databases provide an internal identifier for rows, but they're not always stable. 

The PostgreSQL [ctid](https://www.postgresql.org/docs/current/ddl-system-columns.html#DDL-SYSTEM-COLUMNS-CTID) identifies the physical location of a row, but can change during a vaccum, making it unsuitable as a real row identifier in certain situations.

Oracle's [ROWID](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/ROWID-Pseudocolumn.html#GUID-F6E0FBD2-983C-495D-9856-5E113A17FAF1) is similar, but the docs explicitly state that `You should not use ROWID as the primary key of a table.`.

#### Good-enough isn't good enough

We never want Beekeeper Studio to be the reason you update the wrong row in a production database. Ever. A solution that works 99% of the time, or even 99.9% of the time *isn't good enough* when dealing with production data.

For that reason editing of table data is disabled unless your table has a primary key.

#### Exceptions

- SQLite always gives rows a primary key, whether specified or not. This `rowid` is used by Beekeeper Studio in SQLite to enable data editing where you haven't specified a primary key.


### Applying Changes

Beekeeper has a unique design that 'stages' changes before applying them, so you can make multiple changes to be applied inside of a single transaction.

Staged change types are indicated by color:

- Green - new data to be added
- Red - data to be deleted
- Orange - data to be updated

To commit a change, click the `Apply` in the bottom right of the screen. To discard the change, click `Reset`. You can also click `Copy To Sql` if you'd like to make manual changes to the operations.

!!! warning
    Sorting or filtering the table during editing will discard your staged changes.

### Editing entire rows

You can clone, delete, and create new rows of data pretty easily.

Right click a row (or multiple rows) to delete or clone.
Click the `+` button at the bottom right to add a new row. New rows will be added to the end of the table, even though they appear at the top of the UI for convenience.

## Copying Data

The table view allows you to copy

- An individual cell
- An entire row
- An arbitrary set of selected cells.

If you press the `copy` keyboard shortcut (`ctrl+c` or `cmd+c`), you will copy the data in a spreadsheet-friendly format (it will paste beautifully into Google Sheets or Excel)

Alternatively, right-click any cell to copy that row (or all selected cells) in a range of formats like CSV, JSON, and Markdown.

![Image Alt Tag](../assets/images/creating-tables-95.png)

### Exporting the whole table

Click the ⚙ icon in the bottom right and select `export` to export a whole table, or the filtered table view.

From here you can get a full snapshot of the table, ready to share with others.

