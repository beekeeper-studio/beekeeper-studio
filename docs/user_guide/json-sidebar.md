---
title: JSON Sidebar
icon: material/code-json
summary: "View any record as JSON, view relations in-line, and search using regex"
---

Open the JSON Sidebar in any data table in one of two ways - Right click any row and select `See Details`, or click the :material-dock-right: icon in the application title bar.

![JSON Sidebar](../assets/images/json-sidebar-1.gif)

The JSON sidebar allows you to view any record in JSON format. It's a great way to view wide-tables, complex schemas, and nested fields.

Once you have the data you like, simply copy the data -- it's normal JSON!


## View Relations in-line


You can click a foreign key in the JSON sidebar to expand the record in-line. This is super useful for join tables or schemas where a lot of joins are used to organize data better (looking at you Ruby on Rails 👀).


<video controls>
    <source id="json-fks" type="video/mp4" src="/assets/videos/json-sidebar-fks.mp4" />
</video>


## Search with text or regular expressions

The search box at the top of the JSON sidebar supports both fuzzy text search and regular expressions, so you can easy find the data you want.

<video controls>
    <source id="json-regex" type="video/mp4" src="/assets/videos/json-sidebar-regex.mp4" />
</video>

