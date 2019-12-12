# beekeeper-studio


Use https://dexie.org/ for query run and connection storage
NO
Just make sqlite3 an external dependency in webpack.
In fact everything EXCEPT libs that provide .vue files can be externals.

## Project setup
```
yarn install
```

## Running Electron in dev mode

yarn electron:serve


### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).



## TODO

Firstly: ** YAY! Sequelize core db utilities has been merged **

1. See ConnectionInterface.vue
  ConnectionProvider should now get the connection from db/index using createConnection
  Will need to:
    - make the config expected by the db/clients look like our own connection config objects
    - adjust expectations to deal with the server + database split set-up
    - replace our MySQL driver with the one from sequelize


- (matthew) Investigate Bookshelf for ORM needs https://github.com/bookshelf/bookshelf/



### Result Table

- which table should I be using?