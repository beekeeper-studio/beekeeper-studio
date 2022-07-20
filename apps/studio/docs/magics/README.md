---
title: Query Magics
---

# Query Magics

**Query Magics are only available in Beekeeper Studio Ultimate Edition** - [download here](https://beekeeperstudio.io/get)

Query Magics provide a way to customize the results of a SQL query.

## Things you can do

- Link to another table using a FK lookup
- Make urls clickable
- Make email addresses clickable
- Display a url as an image
- Display an number as a star rating
- Display a number as a progress bar
- Display a number as localized money

## How To Use Query Magics

You can format the results of a SQL query by simply adding some text to the end of your column names.

For example, to format the the `url` field as a link you'd do this:

```sql
select url as url__format__link from some_table
```

Here's a quick example that displays clickable emails and links to another table

```sql
select
  users.email_address as email_address__format__email,
  users.company_id as company__goto__companies__id
from users
limit 100
```

## Available Query Magics

Text in square parens is optional.

- Format Magics
  - Link - clickable URLs `columnname__format__link`
  - Email - clickable emails `columname__format__email`
  - Check - Check/cross for 1 and 0 respectively `columname__format__check`
  - Image - display url as image `columname__format__image[__width__height]
  - Money - display a number as money `columname__format__money[__currencycode]` (default USD)
  - Progress bar - display a number as a progress bar `columname__format__progress[__max]` (default 100 max)
  - Stars - display number as star rating `columname__format__stars[__max]` (default 5)
  - 
- GOTO Magic - link to specific records in another table.
  - Full syntax: `columname__goto[__schema]__table[__column_name]`
  - Link to to the primary key of a table: `columname__goto__tablename`
  - Link to the primary key of a table in a specific schema `columname__goto__schema__table`
  - Link to a specific column `columname__goto__schema__table__column`
  - Examples: 
    - `columnname__goto__public__customers` - link to the primary key in the customers table
    - `columname__goto__businesses__business_id` - link to the businesses table, filter by business_id
