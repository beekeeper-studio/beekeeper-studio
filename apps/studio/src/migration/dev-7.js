import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'


export default {
  name: 'dev-7-fixtures',
  env: 'development',
  dbs: [
    {
      name: "[DEV] Docker MongoDB",
      connectionType: 'mongodb',
      url: 'mongodb://beekeeper:example@localhost:27017',
      defaultDatabase: 'sakila'
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
