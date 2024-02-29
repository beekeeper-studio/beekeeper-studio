---
title: Oracle Database
summary: "Specific instructions for making connections with Oracle Database"
old_url: "https://docs.beekeeperstudio.io/docs/oracle-database"
---

There are a number of ways you can connect to an Oracle database using Beekeeper Studio.

1. PSA connection string
1. SID or Service Name connection string
2. TSA alias
3. Host and port

## Prerequisites

### Linux: Install libaio

```bash
sudo apt-get install libaio1 libaio-dev #debian/ubuntu
sudo yum install libaio #redhat/fedora
```

### Download Oracle Instant Client

Before you can connect to Oracle at all you need to tell Beekeeper where on your computer the Oracle Instant Client libraries are stored. This is a downloadable set of files provided by Oracle.

This is an Oracle requirement and not something Beekeeper Studio controls unfortunately

!!! info
    Download the Instant Client [from the Oracle website](https://www.oracle.com/cis/database/technologies/instant-client/downloads.html)

In Beekeeper Studio you can choose the location of the instant client in the `Global Configuration` section before making your first connection:

![Set oracle instant client](../../assets/images/oracle-database-62.png)


## Connection string examples

If you are using a connection string to connect to your database, Beekeeper supports all common forms of Oracle connection strings. See the examples below, or [more on the Oracle website](https://docs.oracle.com/en/database/other-databases/essbase/21/essoa/connection-string-formats.html)

```bash
# PDB connection string
<host>:<port>/<PDB>

# simple example with SID or service name
<host>:<port>/<SID or servicename>

# Long service name
(DESCRIPTION=(ADDRESS=(host=host_name)(protocol=protocol_name)(port=port_number))
      (CONNECT_DATA=(SERVICE_NAME=service_name)))

 # Long version with SID
 (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(Host=host_name)(Port=port))(CONNECT_DATA=(SID=sid_here)))
```
