import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'


export default {
  name: '20240427_add_tidb_dev_connection',
  env: 'development',
  dbs: [
    {
      name: "[DEV] Docker TiDB",
      connectionType: 'tidb',
      port: 4000,
      host: 'localhost',
      username: 'root',
      password: 'example',
      defaultDatabase: 'sakila',
    },
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
