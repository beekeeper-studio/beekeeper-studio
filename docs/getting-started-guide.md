---
title: Beginners Guide
summary: "This guide will help you setup and use Beekeeper Studio for the first time. Don't worry, it's pretty painless. :-)"
old_url: "https://docs.beekeeperstudio.io/docs/getting-started-guide"
---

👋 Hello and welcome to the Beekeeper Studio community. I think you're going to like it here.

Beekeeper Studio is more than an app, come say hi:

- [Join the community Slack group](https://beekeeperstudio.io/slack)
- [Explore feature requests on Github](https://github.com/beekeeper-studio/beekeeper-studio)



!!! note "Hey there!"
    This page will help you get familiar with Beekeeper Studio. If you've used similar applications in the past, feel free to explore the rest of the documentation site, or just start using Beekeeper Studio (it's pretty intuitive!)


If you're new to database management apps in general it might help to watch this walkthrough of Beekeeper Studio, I go through a bunch of major features

<iframe width="100%" height="315" src="https://www.youtube-nocookie.com/embed/id37-ZRZNkQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

👉  [Watch the Beekeeper Studio Walkthrough on YouTube](https://www.youtube.com/watch?v=id37-ZRZNkQ)

## First step - install Beekeeper Studio


Beekeeper Studio is a desktop application, so the first step is to [Install Beekeeper Studio](./installation/index.md)



## Lets explore Beekeeper Studio with a demo database

A quick and easy way to explore Beekeeper Studio's functionality is with the `Sakila` demo database -- it's a sample database modeling an old-school DVD rental store, like a Blockbuster.


!!! tip "Experts can skip to the end"
    If you already have a database you want to view, edit, and query, hop to it!

    These topics will help you get started with the most commonly used features of Beekeeper Studio

    - [Connecting to a database](./user_guide/connecting/connecting.md)
    - [Write some SQL](./user_guide/sql_editor/editor.md)
    - [Browse and edit table data](./user_guide/editing-data.md)
    - [Create & modify tables](./user_guide/modify-tables.md)


### Getting started with Sakila and Beekeeper Studio

1. Make sure you have Beekeeper Studio [downloaded and installed](./installation/index.md)
1. [Download the Sakila database](https://github.com/ivanceras/sakila/raw/master/sqlite-sakila-db/sakila.db) - this is a `.db` file - a self contained SQLite database file.
2. Double click the `sakila.db` file you just downloaded.

Beekeeper will open, showing you the contents of the database:

![Opening the demo database in Beekeeper Studio](./assets/images/getting-started-guide-60.gif)

### Open a table and change some data

Double click on the `film` table in the left sidebar. This will open the data view for that table.

Remember - this is just a demo database, you can do whatever you like to it without any risk. Try clicking on the `title` cell for a movie and changing the movie name. You can save your changes by clicking the `apply` button in the footer.


![Click apply to save changes](./assets/images/getting-started-guide-61.gif)

### Write your first SQL query

Now you know how to view and edit table data, why not write some custom SQL to pull some interesting data out of the database.

Here's a sample query to count the number of films in the database grouped by rating (like PG-13):

```sql
SELECT
    film.rating, COUNT(DISTINCT inventory.film_id) AS film_count
    FROM film JOIN inventory
    ON film.film_id = inventory.film_id
    GROUP BY film.rating
    ORDER BY COUNT(inventory.film_id) DESC
```

Executing this produces the below result:

| rating | film_count |
|--------|------------|
| PG-13  | 213        |
| NC-17  | 202        |
| PG     | 183        |
| R      | 189        |
| G      | 171        |

### Explore other Beekeeper Studio Features

It's time to fly the nest and explore Beekeeper Studio on your own 🕊.

- Try [creating a new table](./user_guide/modify-tables.md)
- Maybe [export some data to Excel](./user_guide/data-export.md)
- Also checkout [beautifying your results with Query Magics](./user_guide/query-magics.md)


## Reach out if you need help

Stuck? Confused? Email us and we'll help - [support@beekeeperstudio.io](mailto:support@beekeeperstudio.io)
