# sqlectron-core

The common code used by all sqlectron clients.


#### Current supported databases
* PostgreSQL
* MySQL

Do you wanna support for another SQL database? Is expected that in the pull request the new database is included in the [db.spec.js](https://github.com/sqlectron/sqlectron-core/blob/master/spec/db.spec.js).

## Installation

Install via npm:

```bash
$ npm install sqlectron-core
```

## Configuration

SQLECTRON keeps a hidden configuration file called `.sqlectron.json` at the user's home directory (`~/`).

**Example**

```json
{
  // the limit used in the default query
  "limitQueryDefaultSelectTop": 100,
  "servers": [
    {
      // in case including a new server manually
      // there is no need setting an id field
      // because SQLECTRON will do it for you
      "id": "c48890d8-5d87-4085-8b22-94981f8d522c",
      "name": "pg-vm-ssh",
      "client": "postgresql", // postgresql or mysql
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

Although you can change this file manually, most of time you should not worry about it because SQLECTRON will manage the configuration for you.


## Contributing

It is required to use [editorconfig](http://editorconfig.org/) and please write and run specs before pushing any changes:

```js
npm test
```

## License

Copyright (c) 2015 The SQLECTRON Team. This software is licensed under the [MIT License](http://raw.github.com/sqlectron/sqlectron-core/master/LICENSE).
