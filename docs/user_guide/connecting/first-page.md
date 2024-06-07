---
title: Connecting To A Database
summary: "How to start using Beekeeper Studio with your database of choice."
old_url: "https://docs.beekeeperstudio.io/docs/first-page"
---

The connection screen allows you to enter connection information for your database.

## Beekeeper Studio Supported Databases

Beekeeper Studio currently supports the following database types:

| Database                                                 | Support                              | Community               | Ultimate                | Beekeeper Docs                             |
| :------------------------------------------------------- | :----------------------------------- | :---------------------- | :---------------------- | :----------------------------------------- |
| [PostgreSQL](https://postgresql.org)                     | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/postgresql)  |
| [MySQL](https://www.mysql.com/)                          | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/mysql)       |
| [Firebird](https://firebirdsql.org/)                     | :material-beta: Beta Support         | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/firebird)    |
| [SQLite](https://sqlite.org)                             | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/sqlite)      |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/sqlserver)   |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/redshift)    |
| [CockroachDB](https://www.cockroachlabs.com/)            | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/cockroachdb) |
| [MariaDB](https://mariadb.org/)                          | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/mariadb)     |
| [TiDB](https://pingcap.com/products/tidb/)               | :material-check-circle: Full Support | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/tidb)        |
| [Google BigQuery](https://cloud.google.com/bigquery)     | :material-beta: Beta Support         | :material-check-circle: | :material-check-circle: | [Docs](/user_guide/connecting/bigquery)    |
| [Oracle Database](https://www.oracle.com/database/)      | :material-check-circle: Full Support |                         | :material-check-circle: | [Docs](/user_guide/connecting/oracle)      |
| [Cassandra](http://cassandra.apache.org/)                | :material-check-circle: Full Support |                         | :material-check-circle: | [Docs](/user_guide/connecting/cassandra)   |
| [Firebird](https://firebirdsql.org/)                     | :material-beta: Beta Support         |                         | :material-check-circle: | [Docs](/user_guide/connecting/firebird)    |
| [Snowflake](https://www.snowflake.com/)                  | :material-clock-outline: Coming Soon |                         | :material-check-circle: | [Docs](/user_guide/connecting/snowflake)   |
| [Clickhouse](https://clickhouse.tech/)                   | :material-clock-outline: Coming Soon |                         | :material-check-circle: | [Docs](/user_guide/connecting/clickhouse)  |
| [LibSQL](https://libsql.org/)                            | :material-beta: Beta Support         |                         | :material-check-circle: | [Docs](/user_guide/connecting/libsql)      |
| [DuckDB](https://duckdb.org/)                            | :material-beta: Beta Support         |                         | :material-check-circle: | [Docs](/user_guide/connecting/duckdb)      |
| [Trino](https://trino.io/)                           | :material-clock-outline: Coming Soon |                         | :material-check-circle: | [Docs](/user_guide/connecting/presto)      |
| [Presto](https://prestodb.io/)                           | :material-clock-outline: Coming Soon |                         | :material-check-circle: | [Docs](/user_guide/connecting/presto)      |
| [MongoDB](https://www.mongodb.com/)                      | :material-clock-outline: Coming in V5 |                         | :material-check-circle: | [Docs](/user_guide/connecting/mongodb)     |

- add surrealdb


*[Full Support]: Fully supported by the Beekeeper Studio team and verified as working.
*[Beta Support]: Fully supported by the Beekeeper Studio team, verified as working, but there may be small bugs here and there.
*[Coming Soon]: We're working on it! Check back soon for updates.

![Image Alt Tag](../../assets/images/first-page-5.png)
The Beekeeper Studio Connection Screen

## Connection Mode

You can connect to some databases with either a `socket` or a `TCP` connection. Socket connections only work when the database server is running on your local machine (it's the default set-up for a MySQL installation for example). TCP connections require a hostname and port.

![Image Alt Tag](../../assets/images/first-page-6.png)

TCP (Host/Port) connection example

Note that SSL, SSH, and other advanced connection options are only available with a TCP connection.

## SSL

![Image Alt Tag](../../assets/images/first-page-7.png)

Beekeeper Studio's SSL Configuration


There are three ways to connect to a database with SSL

1. **Trust the server:** Connect with SSL without providing your own certificate. This is the default.
2. **Required Cert:** Connect with SSL, provide your own certs, and disable `rejectUnauthorized`.
3. **Verified Cert:** Connect with SSL, provide your own certs, and enable `rejectUnauthorized`.

Here's a table of how the various `sslmode` flags from command line clients map to Beekeeper:

| sslmode     | Turn on SSL? | rejectUnauthorized |
| ----------- | ------------ | ------------------ |
| disable     | no           | n/a                |
| allow       | no           | n/a                |
| prefer      | no           | n/a                |
| require     | yes          | false              |
| verify-ca   | yes          | false              |
| verify-full | yes          | true               |

You can provide your own custom certificate files if needed.


## SSH

![Image Alt Tag](../../assets/images/first-page-8.png)

Beekeeper Studio's SSH configuration


### Server Configuration

Before you can use an SSH tunnel to connect to your database, you need to make sure your SSH server is setup correctly.

Firstly make sure the following line is set in your `/etc/ssh/sshd_config`:

```
AllowTcpForwarding yes
```

#### ssh-rsa public keys

If you are using an ssh key generated by the `ssh-rsa` algorithm, you'll need to enable support for this algorithm in your ssh server.

To do this, you can add the following line to the `/etc/ssh/sshd_config` file on your SSH server

```
PubkeyAcceptedKeyTypes +ssh-rsa
```
Yes, the `+` is intentional
{: .text-muted .small .text-center }


### Client Configuration Options


Beekeeper supports tunneling your connection via SSH. To connect to a remote database using your SSH account on that machine:

1. **Activate the SSH Tunnel** to reveal the ssh connection detail fields

2. **Enter the SSH Hostname** or IP address of the remote SSH server

3. **Change the SSH server's Port** if it doesn't accept connections on the default port 22

4. **Enter Bastion Host (JumpHost)** (optional) if your server's network requires that you connect through a [JumpHost](https://www.redhat.com/sysadmin/ssh-proxy-bastion-proxyjump)

5. **Enter the Keepalive Interval** (optional) to specify, _in seconds_, how often to ping the server while idle to prevent getting disconnected due to a timeout.  This is equivalent to the [ServerAliveInterval](https://superuser.com/questions/37738/how-to-reliably-keep-an-ssh-tunnel-open#answer-601644) option you might use on the ssh command line, or in your `~/.ssh/config` file -- **Entering 0 (zero) disables this feature**

6. **Select your SSH Authentication method**:

    * `SSH Agent` if your local machine is running an SSH Agent, you only need to provide the remote **SSH Username** of your ssh account on the server

    * `Username and Password` to enter both your **SSH Username** and **SSH Password** (also see the _Save Passwords_ option, below)

    * `Key File` Select your **SSH Private key File** (and optionally enter your **Key File PassPhrase**) if you use your [SSH Public Key](https://stackoverflow.com/questions/7260/how-do-i-setup-public-key-authentication#answers-header) on the server for authentication

7. **Enter a name for your Connection** (optionally check the **Save Passwords** checkbox) and Press **Save** to have Beekeeper remember all of the above for you

8. **Press the Connect button** to access your database!

## File Associations

Beekeeper Studio provides file associations so you can do the following things without opening the app:

- Double click a sqlite `.db` file in a file browser to open it in Beekeeper Studio!
- Open URLs and files from the terminal:
  - Mac: `open postgresql://user@host/database` or `open ./example.db`
  - Linux: `xdg-open postgresql://user@host/database` or `xdg-open ./example.db`


