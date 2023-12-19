---
title: Browse and Edit Table Data
summary: "View, search, and modify your database table data using our built-in table explorer."
old_url: "https://docs.beekeeperstudio.io/docs/creating-tables"
---


Double click a table in the left sidebar to open an Excel-like interface for viewing and editing the data.

![Image Alt Tag]\(/assets/images/creating-tables-14.png)

## Navigating the table


## Selecting multiple cells

You can select either a single cell, a single row, or a range of rows. You cannot (yet) select an arbitrary set of cells or columns.

To multi-select rows:

1. Select a row
2. `cmd/ctrl + click` to select a second row
3. `shift + click` to select a continuous range of rows
4. Esc, or click away to cancel the selection
![Image Alt Tag]\(/assets/images/creating-tables-98.gif)

## Copying Data

The table view allows you to copy
- An individual cell
- An entire row
- An arbitrary set of selected rows.

If you press the `copy` keyboard shortcut (`ctrl+c` or `cmd+c`), you will copy the data in a spreadsheet-friendly format (it will paste beautifully into Google Sheets or Excel)

Alternatively, right-click any cell to copy that row (or all selected rows) in a range of formats like CSV, JSON, and Markdown.

![Image Alt Tag]\(/assets/images/creating-tables-95.png)


## Editing Data

**Note:** Beekeeper only supports editing tables with primary keys.
{: .alert .alert-info }

Beekeeper has a unique design that 'stages' changes before applying them, so you can make multiple changes to be applied inside of a single transaction.

Staged change types are indicated by color:
- Green - new data to be added
- Red - data to be deleted
- Orange - data to be updated

To commit a change, click the `Apply` in the bottom right of the screen. To discard the change, click `Reset`.

**Warning:** Sorting or filtering the table during editing will discard your staged changes.
{: .alert .alert-warning }

## Editing Options

1. Click a cell to edit the contents
2. Right click a row and select `clone` to duplicate the row
3. Right click a row and select `delete` to delete the row
4. Click `+` in the bottom right to add a new row

