## Version 1.3 - Bugfix Bonanza

Thank you everyone for being a part of the community. We are amazed by the reception our little project has received.

Some great features and bugfixes in this release:

- PSQL schemas are now shown in the table sidebar
- PSQL identifiers are now properly escaped, so tables load properly
- PSQL identifiers are autocompleted properly, even if they need escaping
- MySQL, PSQL, and SQL Server columns are now shown in ordinal position in the sidebar
- The file picker can now access hidden folders on Mac and Windows
- JSON, JSONB, and ARRAY columns are properly displayed
- MySQL 8 connections no longer fail due to an unsupported password encryption error
- You can connect to Postgres without providing a username
- Portable app is now available for Windows



## Version 1.2 - Table Tabs & More

The big new feature in this release is `table tabs`.

Table Tabs let you open a table (or view) in a new tab. From there you can search and filter the data as needed.

It's really useful!

![Table tabs gif](https://user-images.githubusercontent.com/279769/80726647-4db5ac00-8aca-11ea-95f6-d51462dc9e68.gif)


Other fixes and changes:

1. PSQL now opens the `public` schema by default
2. MariaDB is an explicit connection option
3. Redshift is an explicit connection option
4. Column headers are no longer capitalized incorrectly
5. Some minor stability and performance improvements


