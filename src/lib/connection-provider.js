

import mysql from 'mysql'

export default {
  for(config) {
    if (config.connectionType === 'mysql') {

      const options = {
        host: config.host,
        port: config.port,
        user: config.user
      }
      if (config.password) {
        options.password = config.password
      }

      if (config.defaultDatabase) {
        options.database = config.defaultDatabase
      }


      return mysql.createConnection(options);

    }

    if (config.connectionType === 'psql') {

    }
  }
}
