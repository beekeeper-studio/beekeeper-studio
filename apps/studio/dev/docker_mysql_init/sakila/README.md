
This sample database is derived from the Sakila-spatial db, available from 
[the MySQL docs](https://dev.mysql.com/doc/index-other.html).

The changes applied here are quite simple:

* The FULLTEXT index in InnoDB is added conditionally for MySQL 5.6+
* The GEOMETRY column and SPATIAL index are added conditionally for MySQL 5.7+

