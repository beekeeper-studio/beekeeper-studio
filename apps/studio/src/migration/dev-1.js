import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'
import platformInfo from '../common/platform_info'

export default {
  name: 'dev-1-fixtures',
  env: 'development',
  dbs: [
    {
      name: '[DEV] Docker MySQL',
      connectionType: 'mysql',
      port: 3306,
      username: 'root',
      password: 'example',
      defaultDatabase: 'employees'
    },
    {
      name: '[DEV] Docker MariaDB',
      connectionType: 'mariadb',
      port: 3307,
      username: 'root',
      password: 'example',
      defaultDatabase: 'employees'
    },
    {
      name: "[DEV] local Sqlite",
      connectionType: 'sqlite',
      defaultDatabase: './dev/sakila.db',
    },
    {
      name: "[DEV] Docker PSQL",
      connectionType: 'postgresql',
      port: 5432,
      username: 'postgres',
      password: 'example',
      defaultDatabase: 'saklia'
    },
    {
      name: "[DEV] Docker SQLServer",
      connectionType: 'sqlserver',
      port: 1433,
      host: 'localhost',
      username: 'sa',
      password: 'Example@1',
      defaultDatabase: 'sakila'
    },
    {
      name: "Beekeeper's Database",
      connectionType: "sqlite",
      defaultDatabase: platformInfo.appDbPath
    }
  ],

  async run() {

    const connections = this.dbs.map(db => {
      const connection = new SavedConnection()
      _.merge(connection, db)
      return connection
    })

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      await connection.save()
    }

  }
}
