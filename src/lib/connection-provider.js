

import { MySQLDriver } from './drivers/mysql.js'
import { createServer } from './db/index.js'

export default {

  convertConfig(config) {
  	return {
  		client: config.connectionType,
  		host: config.host,
  		port: config.host,
  		socketPath: null,
  		password: config.password,
  		database: config.defaultDatabase
  	}
  },

  for(config) {
  	let convertedConfig = this.convertConfig(config)
  	return createConnection(convertedConfig).createConnection(config.defaultDatabase)
  }
}
