---
title: Create & Modify Table Structure
summary: "Beekeeper Studio's SQL Table Creator lets you visually build a SQL table without having to remember the right syntax."
old_url: "https://docs.beekeeperstudio.io/docs/editing-data"
---

Beekeeper Studio lets you **CREATE** and **ALTER** database tables with a user-friendly UI **without having to write any SQL**.

## Creating new SQL Tables

At the top of the entities list in the left sidebar, click the `+` button to open the table creation interface.

![Image Alt Tag](../assets/images/editing-data-19.png)

On this screen you can add and remove columns from your new table, then click `create table` in the bottom right

![Image Alt Tag](../assets/images/editing-data-20.gif)

### Adding an autoincrement column

For new tables we automatically include an `autoincrement` primary key column to streamline the process of creating a table with a primary key that automatically increments. This is consistent across all database types.

You can add as many of these as you like.

### Adding a primary key

You'll probably want to set a primary key on your new table, by default we select the `id` column as the primary key, but you can check multiple columns and Beekeeper Studio will create a compound primary key.

### Creating indexes and relations

After creating your table you will be able to add indexes and relations, but this is not available until after initially creating the table.

### Finally - creating your table

Click `CREATE TABLE` at the bottom right to create your new database table automatically.

You can also click `Copy to SQL` rather than `create table` to open the generated `CREATE TABLE` syntax in a new sql editor tab, so you can edit it before applying it.

## Altering an existing table

Right click any table in the sidebar and click `View Structure` to view and edit the table schema.

![Image Alt Tag](../assets/images/editing-data-21.png)

This view works much the same as the table creation view, except you also have options for modifying indexes, relations, and triggers.

![Image Alt Tag](../assets/images/editing-data-22.png)

**Note**: Some database engines don't support some types of schema modifications, in these cases Beekeeper Studio will provide a warning and that feature will be disabled
{: .alert .alert-info }

## SQL Table Creator Preview

Want to play around with our table creator code? You can use the online version of the table creator on the [SQL Tools website here](https://sqltools.beekeeperstudio.io/build). This is a stripped down version of our built-in table creator and cannot create your new table, but rather provides you with the generated SQL to download.


