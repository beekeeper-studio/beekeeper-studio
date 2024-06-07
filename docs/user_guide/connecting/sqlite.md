---
title: SQLite
summary: "Connect to a SQLite database by double clicking, from the command line, or from the app. You can also optionally load runtime extensions"
old_url: "https://docs.beekeeperstudio.io/docs/sqlite"
---

Connecting to a SQLite database from the app is pretty easy, simply select `SQLite` from the dropdown, choose your SQLite file, then click `connect`.

## Double click .db and .sqlite3 files

When you install Beekeeper Studio it will create an association for files with the following extensions: `.db`, `.sqlite3`, and `.sqlite`.

So long as Beekeeper Studio remains the default app for these file types, you can now just double click any SQLite file to open it in Beekeeper Studio.

## Opening from the command line

You can also use your terminal to open a database in Beekeeper Studio so long as you have the file associations set-up.

- **MacOS** `open ./path/to/example.db`
- **Linux** `xdg-open ./path/to/example.db`

## Runtime Extensions

SQLite supports [runtime extensions](https://www.sqlite.org/loadext.html). This provides extended capabilities for interacting with SQLite.

There are many such extensions, a lot of them are open source. For example [sqlean](https://github.com/nalgeon/sqlean) is an extension that provides a range of new functions and features from crypto functions, to array handling.

Beekeeper Studio provides the ability to load a SQLite extension whenever you connect to a SQLite database.

This is a **global** setting, so it applies to any and all SQLite connections on the machine.

To add a runtime extension, expand the `Runtime Extension` settings block and choose the file.

![SQLite runtime extensions loader](../../assets/images/sqlite-88.png)

### Requirements

1. The runtime extension must be compiled for the operating system you are currently using
2. The runtime extension must have the correct file extension
	- Windows: `.dll`
    - MacOS: `.dylib`
    - Linux: `.so`












