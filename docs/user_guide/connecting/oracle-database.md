---
title: Oracle Database
summary: "Specific instructions for making connections with Oracle Database"
old_url: "https://docs.beekeeperstudio.io/docs/oracle-database"
icon: material/database
---

# How to connect to Oracle Database

Beekeeper Studio supports connecting to Oracle databases in two modes:

1. **Thin Mode**: This is the default mode and does not require any additional configuration. Not all connection options are available in this mode. If you get a `thin mode` error, you may need to use `Thick Mode`.
2. **Thick Mode**: This mode requires the Oracle Instant Client to be installed on your system. It allows for more advanced connection options and is recommended for most users.

For a comparison of how thin and thick mode differ, see the Oracle Database documentation on [the Oracle website](https://node-oracledb.readthedocs.io/en/latest/user_guide/appendix_a.html#oracle-database-features-supported-by-node-oracledb)

## Thick Mode Requirements

1. On all operating systems you must have the Oracle Instant Client installed.
2. On Linux you must have `libaio-dev` (apt) / `libaio-devel` (yum/dnf) installed.
3. For Ubuntu 24.04+ You also need to make a symlink: `sudo ln -s /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1`

Below are specific instructions for each of the above requirements

### Download Oracle Instant Client

Download the Instant Client [from the Oracle website](https://www.oracle.com/cis/database/technologies/instant-client/downloads.html).

Choose the download for your operating system.

[![Oracle Instant Client download page](../../assets/images/instant-client-download.png)](https://www.oracle.com/cis/database/technologies/instant-client/downloads.html)


### Linux: Install libaio

```bash
sudo apt-get install libaio1 libaio-dev #debian/ubuntu
sudo yum install libaio #redhat/fedora
```

## Connecting To Oracle Databases

There are a number of ways you can connect to an Oracle database using Beekeeper Studio.

1. PSA connection string
1. SID or Service Name connection string
2. TSA alias
3. Host and port

## Using tnsnames.ora

You can specify your 'config' directory when adding an Oracle connection. Beekeeper Studio will use this to find your tnsnames.ora file, you can then use an alias in your connection string.

### Enter Your Oracle Connection String

If you are using a connection string to connect to your database, Beekeeper supports all common forms of Oracle connection strings. See the examples below, or [more on the Oracle website](https://docs.oracle.com/en/database/other-databases/essbase/21/essoa/connection-string-formats.html)

#### Oracle Connection String Examples

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
