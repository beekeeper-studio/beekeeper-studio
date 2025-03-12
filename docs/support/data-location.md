---
title: Data Storage Location
summary: "Where Beekeeper Studio stores your SQL queries and connections when you save them."
old_url: "https://docs.beekeeperstudio.io/docs/deep-dive-overview"
---

When you save connections and SQL queries in Beekeeper Studio they are persisted to a SQLite database in the application configuration directory.

## Database Location

The database is named `app.db` and is stored in the `userData` folder which the operating system provides for Beekeeper Studio to store settings and preferences.

### UserData directory locations:

- Windows: `<User Directory>\AppData\Roaming\beekeeper-studio`
- MacOS: `~/Library/Application Support/Beekeeper Studio`
    - Note: The ~/Library directory is typically hidden in Finder. However, you can use Go -> Go to Folder to open this directory.
- Linux: `~/.config/beekeeper-studio`

## Access the Beekeeper Studio Database....From Beekeeper Studio

If you navigate to `Help -> Add Beekeeper's Database` the app will add a new database connection for you to use - Beekeeper's database itself.

You can use this connection to explore your saved data, export SQL queries, or do whatever you need.
