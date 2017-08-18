# sqlectron-core

[![Build status](https://ci.appveyor.com/api/projects/status/bdnpb06lu4sl0hwn/branch/master?svg=true)](https://ci.appveyor.com/project/maxcnunes/sqlectron-core/branch/master)

The common code used by all sqlectron clients.

> Requires node 6 or higher.

#### How to pronounce

It is pronounced "sequelectron" - https://translate.google.com/?source=osdd#en/en/sequelectron

#### Current supported databases
* [PostgreSQL](http://www.postgresql.org/)
* [MySQL](https://www.mysql.com/)
* [Microsoft SQL Server](http://www.microsoft.com/en-us/server-cloud/products/sql-server/)
* [Cassandra](http://cassandra.apache.org/) (NoSQL; [Exceptions about this client](https://github.com/sqlectron/sqlectron-core/releases/tag/v6.3.0))
* [SQLite](https://sqlite.org/)

Do you want to support another SQL database? Please follow [these steps](/CONTRIBUTING.md#adding-a-new-client).

## Installation

Install via npm:

```bash
$ npm install sqlectron-core --save
```

## Configuration

SQLECTRON keeps a configuration file in the directory

* **MacOS:** `~/Library/Preferences/Sqlectron`
* **Linux** (`$XDG_CONFIG_HOME` or `~/.config`) + `/Sqlectron`
* **Windows** (`$LOCALAPPDATA` or `%USERPROFILE%\AppData\Local`) + `\Sqlectron\Config`

> For older versions it was stored as `.sqlectron.json` at the user's home directory (`~/` osx and linux; `%userprofile%` windows ).

Although you can change this file manually, most of time you should not worry about it because SQLECTRON will manage the configuration for you.

**Example**

```json
{
  "resultItemsPerPage": 50,
  "limitQueryDefaultSelectTop": 100,
  "servers": [
    {
      "id": "c48890d8-5d87-4085-8b22-94981f8d522c",
      "name": "pg-vm-ssh",
      "client": "postgresql",
      "host": "localhost",
      "port": 5432,
      "user": "user",
      "password": "password",
      "database": "company",
      "ssh": {
        "host": "10.10.10.10",
        "port": 22,
        "privateKey": "~/.vagrant.d/insecure_private_key",
        "user": "core"
      }
    },
    {
      "id": "0f6536a1-c232-4515-942a-c0fb56d362b2",
      "name": "vm-ssh",
      "client": "mysql",
      "host": "localhost",
      "port": 3306,
      "user": "root",
      "password": "password",
      "database": "authentication"
    }
  ]
}
```

### Fields

#### resultItemsPerPage

The limit of items per page *`(default on sqlectron-gui: 100)`*
The paging is not done in SQL query. Instead its is done during the results rendering.

#### limitQueryDefaultSelectTop

The limit used in the default query *`(default: 1000)`*

#### servers

Array with all servers connection.

- `id`: in case including a new server manually there is no need setting an id field because SQLECTRON will do it for you
- `name`
- `client`: `postgresql`, `mysql` or `sqlserver`
- `host`
- `port`
- `user`
- `password`
- `database`
- `ssh`
  - `host`
  - `user`
  - `port`
  - `privateKey`
  - `privateKeyWithPassphrase`



## Contributing

Please check out it [here](/CONTRIBUTING.md).

## License

Copyright (c) 2015 The SQLECTRON Team. This software is licensed under the [MIT License](http://raw.github.com/sqlectron/sqlectron-core/master/LICENSE).
