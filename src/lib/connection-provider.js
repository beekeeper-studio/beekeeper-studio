

import { MySQLDriver } from './drivers/mysql.js'

export default {
  for(config) {
    if (config.connectionType === 'mysql') {
      return new MySQLDriver(config)
    }

    if (config.connectionType === 'psql') {
      return null
    }
  }
}
