

import { createServer } from './db/index.js'

export default {

  convertConfig(config) {
    return {
      client: config.connectionType,
      host: config.host,
      port: config.port,
      socketPath: null,
      user: config.username,
      password: config.password,
      database: config.defaultDatabase
    }
  },

  for(config) {
    let convertedConfig = this.convertConfig(config)
    return createServer(convertedConfig).createConnection(config.defaultDatabase)
  }
}
