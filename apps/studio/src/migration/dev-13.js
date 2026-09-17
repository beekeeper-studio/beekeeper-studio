import _ from 'lodash'
import { SavedConnection } from '../common/appdb/models/saved_connection'

export default {
  name: 'dev-13',
  env: 'development',
  dbs: [
    {
      name: '[DEV] Docker DynamoDB',
      connectionType: 'dynamodb',
      dynamoDbOptions: {
        endpoint: 'http://localhost:8001'
      },
      iamAuthOptions: {
        accessKeyId: 'local',
        secretAccessKey: 'local'
      }
    },
    {
      name: '[DEV] Docker ScyllaDB',
      connectionType: 'scylladb',
      host: 'localhost',
      port: 9043,
      cassandraOptions: {
        localDataCenter: 'datacenter1'
      },
      defaultDatabase: 'store'
    }
  ],

  async run() {
    const connections = this.dbs.map((db) => {
      const connection = new SavedConnection();
      _.merge(connection, db);
      return connection;
    });

    for (const conn of connections) {
      await conn.save();
    }
  }
}
