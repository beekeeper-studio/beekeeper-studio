Lists the columns in the tables or views for which you have access privileges. This command can be used to list the columns for a specified table/view/schema/database (or the current schema/database for the session), or your entire account.

See also:

[DESCRIBE TABLE](https://docs.snowflake.com/en/sql-reference/sql/desc-table)

[COLUMNS view](https://docs.snowflake.com/en/sql-reference/info-schema/columns) (Information Schema)

## Syntax[¶](https://docs.snowflake.com/en/sql-reference/sql/show-columns#syntax "Link to this heading")

```
SHOW COLUMNS [ LIKE '<pattern>' ]
             [ IN { ACCOUNT | DATABASE [ <database_name> ] | SCHEMA [ <schema_name> ] | TABLE | [ TABLE ] <table_name> | VIEW | [ VIEW ] <view_name> } | APPLICATION <application_name> | APPLICATION PACKAGE <application_package_name> ]

```

## Parameters[¶](https://docs.snowflake.com/en/sql-reference/sql/show-columns#parameters "Link to this heading")

`LIKE '<pattern>'`

Filters the command output by object name. The filter uses case-insensitive pattern matching, with support for SQL wildcard characters (`%` and `_`).

For example, the following patterns return the same results:

`... LIKE '%testing%' ...`

`... LIKE '%TESTING%' ...`

`IN { ACCOUNT | DATABASE [ <database_name> ] | SCHEMA [ <schema_name> ] | TABLE | [ TABLE ] <table_name> | VIEW | [ VIEW ] <view_name> | APPLICATION <application_name>  | APPLICATION PACKAGE <application_package_name> }`

Specifies the scope of the command, which determines whether the command lists records only for the current/specified database, schema, table, or view, or across your entire account:

If you specify the keyword `ACCOUNT`, then the command retrieves records for all schemas in all databases of the current account.

If you specify the keyword `DATABASE`, then:

-   If you specify a `_db_name_`, then the command retrieves records for all schemas of the specified database.
    
-   If you do not specify a `_db_name_`, then:
    
    -   If there is a current database, then the command retrieves records for all schemas in the current database.
        
    -   If there is no current database, then the command retrieves records for all databases and schemas in the account.
        

If you specify the keyword `SCHEMA`, then:

-   If you specify a qualified schema name (e.g. `my_database.my_schema`), then the command retrieves records for the specified database and schema.
    
-   If you specify an unqualified `_schema_name_`, then:
    
    -   If there is a current database, then the command retrieves records for the specified schema in the current database.
        
    -   If there is no current database, then the command displays the error `SQL compilation error: Object does not exist, or operation cannot be performed`.
        
-   If you do not specify a `_schema_name_`, then:
    
    -   If there is a current database, then:
        
        -   If there is a current schema, then the command retrieves records for the current schema in the current database.
            
        -   If there is no current schema, then the command retrieves records for all schemas in the current database.
            
    -   If there is no current database, then the command retrieves records for all databases and all schemas in the account.
        

If you specify the keyword `TABLE` without a `table_name`, then:

-   If there is a current database, then:
    
    -   If there is a current schema, then the command retrieves records for the current schema in the current database.
        
    -   If there is no current schema, then the command retrieves records for all schemas in the current database.
        
-   If there is no current database, then the command retrieves records for all databases and all schemas in the account.
    

If you specify a `<table_name>` (with or without the keyword `TABLE`), then:

-   If you specify a fully-qualified `<table_name>` (e.g. `my_database_name.my_schema_name.my_table_name`), then the command retrieves all records for the specified table.
    
-   If you specify a schema-qualified `<table_name>` (e.g. `my_schema_name.my_table_name`), then:
    
    -   If a current database exists, then the command retrieves all records for the specified table.
        
    -   If no current database exists, then the command displays an error similar to `Cannot perform SHOW <object_type>. This session does not have a current database...`.
        
-   If you specify an unqualified `<table_name>`, then:
    
    -   If a current database and current schema exist, then the command retrieves records for the specified table in the current schema of the current database.
        
    -   If no current database exists or no current schema exists, then the command displays an error similar to: `SQL compilation error: <object> does not exist or not authorized.`.
        

If you specify the keyword `VIEW` or a view name, the rules for views parallel the rules for tables.

If you specify the keywords `APPLICATION` or `APPLICATION PACKAGE`, records for the specified Snowflake Native App Framework application or application package are returned.

Default: Depends on whether the session currently has a database in use:

> -   Database: `DATABASE` is the default (i.e. the command returns the objects you have privileges to view in the database).
>     
> -   No database: `ACCOUNT` is the default (i.e. the command returns the objects you have privileges to view in your account).
>     

## Usage notes[¶](https://docs.snowflake.com/en/sql-reference/sql/show-columns#usage-notes "Link to this heading")

-   If you use the keyword `VIEW` and specify a view name, the view may be a materialized view or a non-materialized view.
    

-   The command doesn’t require a running warehouse to execute.
    
-   The command only returns objects for which the current user’s current role has been granted at least one access privilege.
    
-   The MANAGE GRANTS access privilege implicitly allows its holder to see every object in the account. By default, only the account administrator (users with the ACCOUNTADMIN role) and security administrator (users with the SECURITYADMIN role) have the MANAGE GRANTS privilege.
    

-   To post-process the output of this command, you can use the [RESULT\_SCAN](https://docs.snowflake.com/en/sql-reference/functions/result_scan) function, which treats the output as a table that can be queried.
    

-   The command returns a maximum of ten thousand records for the specified object type, as dictated by the access privileges for the role used to execute the command. Any records above the ten thousand records limit aren’t returned, even with a filter applied.
    
    To view results for which more than ten thousand records exist, query the corresponding view (if one exists) in the [Snowflake Information Schema](https://docs.snowflake.com/en/sql-reference/info-schema).
    

## Output[¶](https://docs.snowflake.com/en/sql-reference/sql/show-columns#output "Link to this heading")

The command output provides column properties and metadata in the following columns:

| 
Column

 | 

Description

 |
| --- | --- |
| 

`table_name`

 | 

Name of the table the columns belong to.

 |
| 

`schema_name`

 | 

Schema for the table.

 |
| 

`column_name`

 | 

Name of the column.

 |
| 

`data_type`

 | 

Column data type and applicable properties, such as length, precision, scale, nullable, etc.; note that character and numeric columns display their generic data type rather than their defined data type (i.e. TEXT for all character types, FIXED for all fixed-point numeric types, and REAL for all floating-point numeric types).

 |
| 

`null?`

 | 

Whether the column can contain NULL values.

 |
| 

`default`

 | 

Default value, if any, defined for the column.

 |
| 

`kind`

 | 

Not applicable for columns (always displays COLUMN as the value).

 |
| 

`expression`

 |  |
| 

`comment`

 | 

Comment, if any, for the column.

 |
| 

`database_name`

 | 

Database for the table.

 |
| 

`autoincrement`

 | 

Auto-increment start and increment values, if any, for the column. If the column has the NOORDER property, the value includes `NOORDER` (for example, `IDENTITY START 1 INCREMENT 1 NOORDER`). Otherwise, the value includes `ORDER`.

 |
| 

`SchemaEvolutionRecord`

 | 

Records information about the latest triggered Schema Evolution for a given table column. This column contains the following subfields:

-   EvolutionType: The type of the triggered schema evolution (ADD\_COLUMN or DROP\_NOT\_NULL).
    
-   EvolutionMode: The triggering ingestion mechanism (COPY or SNOWPIPE).
    
-   FileName: The file name that triggered the evolution.
    
-   TriggeringTime: The approximate time when the column was evolved.
    
-   QueryId or PipeID: A unique identifier of the triggering query or pipe (QUERY ID for COPY or PIPE ID for SNOWPIPE).
    

 |

## Examples[¶](https://docs.snowflake.com/en/sql-reference/sql/show-columns#examples "Link to this heading")

```
create or replace table dt_test (n1 number default 5, n2_int integer default n1+5, n3_bigint bigint autoincrement, n4_dec decimal identity (1,10),
                                 f1 float, f2_double double, f3_real real,
                                 s1 string, s2_var varchar, s3_char char, s4_text text,
                                 b1 binary, b2_var varbinary,
                                 bool1 boolean,
                                 d1 date,
                                 t1 time,
                                 ts1 timestamp, ts2_ltz timestamp_ltz, ts3_ntz timestamp_ntz, ts4_tz timestamp_tz);

show columns in table dt_test;

+------------+-------------+-------------+---------------------------------------------------------------------------------------+-------+----------------+--------+------------+---------+---------------+-------------------------------+
| table_name | schema_name | column_name | data_type                                                                             | null? | default        | kind   | expression | comment | database_name | autoincrement                 |
|------------+-------------+-------------+---------------------------------------------------------------------------------------+-------+----------------+--------+------------+---------+---------------+-------------------------------|
| DT_TEST    | PUBLIC      | N1          | {"type":"FIXED","precision":38,"scale":0,"nullable":true}                             | true  | 5              | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | N2_INT      | {"type":"FIXED","precision":38,"scale":0,"nullable":true}                             | true  | DT_TEST.N1 + 5 | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | N3_BIGINT   | {"type":"FIXED","precision":38,"scale":0,"nullable":true}                             | true  |                | COLUMN |            |         | TEST1         | IDENTITY START 1 INCREMENT 1  |
| DT_TEST    | PUBLIC      | N4_DEC      | {"type":"FIXED","precision":38,"scale":0,"nullable":true}                             | true  |                | COLUMN |            |         | TEST1         | IDENTITY START 1 INCREMENT 10 |
| DT_TEST    | PUBLIC      | F1          | {"type":"REAL","nullable":true}                                                       | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | F2_DOUBLE   | {"type":"REAL","nullable":true}                                                       | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | F3_REAL     | {"type":"REAL","nullable":true}                                                       | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | S1          | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | S2_VAR      | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | S3_CHAR     | {"type":"TEXT","length":1,"byteLength":4,"nullable":true,"fixed":false}               | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | S4_TEXT     | {"type":"TEXT","length":16777216,"byteLength":16777216,"nullable":true,"fixed":false} | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | B1          | {"type":"BINARY","length":8388608,"byteLength":8388608,"nullable":true,"fixed":true}  | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | B2_VAR      | {"type":"BINARY","length":8388608,"byteLength":8388608,"nullable":true,"fixed":false} | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | BOOL1       | {"type":"BOOLEAN","nullable":true}                                                    | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | D1          | {"type":"DATE","nullable":true}                                                       | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | T1          | {"type":"TIME","precision":0,"scale":9,"nullable":true}                               | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | TS1         | {"type":"TIMESTAMP_LTZ","precision":0,"scale":9,"nullable":true}                      | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | TS2_LTZ     | {"type":"TIMESTAMP_LTZ","precision":0,"scale":9,"nullable":true}                      | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | TS3_NTZ     | {"type":"TIMESTAMP_NTZ","precision":0,"scale":9,"nullable":true}                      | true  |                | COLUMN |            |         | TEST1         |                               |
| DT_TEST    | PUBLIC      | TS4_TZ      | {"type":"TIMESTAMP_TZ","precision":0,"scale":9,"nullable":true}                       | true  |                | COLUMN |            |         | TEST1         |                               |
+------------+-------------+-------------+---------------------------------------------------------------------------------------+-------+----------------+--------+------------+---------+---------------+-------------------------------+

```