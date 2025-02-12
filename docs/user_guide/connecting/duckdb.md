---
title: DuckDB
summary: "Connect to a DuckDB database by double clicking, from the command line, or from the app."
---

Connecting to a DuckDB database from the app is straightforward. Simply select DuckDB from the dropdown, choose your DuckDB file, and click `connect`.

## Double click .db and .sqlite3 files

When you install Beekeeper Studio it will create an association for files with the `.duckdb` extension.

So long as Beekeeper Studio remains the default app for these file types, you can now just double click any DuckDB file to open it in Beekeeper Studio.

## Opening from the command line

You can also use your terminal to open a database in Beekeeper Studio so long as you have the file associations set-up.

- **MacOS** `open ./path/to/example.duckdb`
- **Linux** `xdg-open ./path/to/example.duckdb`

## Creating a new database

To create a new database, you can specify the location of the database file in the `Database File` input field. If you are running on Windows or Linux, you can select a folder from the `Choose File` dialog, and then complete the `Database File` input field with your file name.

![Create a new database](../../assets/images/duckdb-create.png)
