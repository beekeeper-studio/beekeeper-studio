# Contributing to Sqlectron Core

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

There are some ways of contributing to Sqlectron

* Report an issue
* Development

## Report an issue

* Before opening the issue make sure there isn't an issue opened for the same problem
* Include the database client you were using during the error (mysql, postgres, etc.)
* Include the version of sqlectron-core you are using
* Include the stack trace error

## Development

It is required to use [editorconfig](http://editorconfig.org/). Furthermore, please write and run tests (`/spec/db.spec.js`) before pushing any changes.

### Testing

#### With docker + docker-compose

It will bring up some databases such as MySQL and PostgreSQL and run all the tests:

```shell
docker-compose run --rm test
```

#### Without Docker

You will need to bring up all the databases then run the tests through:

```shell
npm test
```

### Adding a new client

1. Duplicate an existing client that is the most similar to the new client (e.g. [postgresql](/src/db/clients/postgresql.js)). Then adapt the code for this new client with its own logic. But it MUST keep the same public API. The tests will help to ensure the API still the same.
1. Include the new client into the [list of supported dbs](/src/db/clients/index.js).
1. Ensure the [tests](/spec/db.spec.js) are passing. May require adapting the tests to handle any different input/output the new client might have from the other clients.
1. [Link](https://github.com/sqlectron/sqlectron-gui/blob/master/docs/development/test-core-changes.md) sqlectron-core to sqlectron-gui and test it in the app.
1. Include a logo `server-db-client-<client_name>.png` into the [app](https://github.com/sqlectron/sqlectron-gui/tree/master/src/renderer/components).
