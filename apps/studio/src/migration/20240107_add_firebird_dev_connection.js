import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'


export default {
  name: 'dev-4-fixtures',
  env: 'development',
  dbs: [
    {
      name: "[DEV] Docker Firebird",
      connectionType: 'firebird',
      port: 3050,
      host: 'localhost',
      username: 'sysdba',
      password: 'masterkey',
      defaultDatabase: '/firebird/data/sakila.fdb',
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
