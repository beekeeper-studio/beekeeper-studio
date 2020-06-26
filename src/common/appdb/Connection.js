import { createConnection } from "typeorm"
import { SavedConnection } from "./models/saved_connection"
import { UsedConnection } from "./models/used_connection"
import { UsedQuery } from './models/used_query'
import { FavoriteQuery } from './models/favorite_query'
import { UserSetting } from './models/user_setting'
import { Subscriber as EncryptedColumnSubscriber } from "typeorm-encrypted-column"

const models = [
  SavedConnection,
  UsedConnection,
  UsedQuery,
  FavoriteQuery,
  UserSetting
]


export default class Connection {
  path
  connection
  logging
  constructor(path, logging) {
    this.path = path
    this.logging = logging
  }

  async connect() {
    this.connection = await createConnection({
      database: this.path,
      type: 'sqlite',
      synchronize: false,
      migrationsRun: false,
      entities: models,
      subscriptions: [
        EncryptedColumnSubscriber
      ],
      logging: this.logging
    })
    return this.connection
  }

    

}