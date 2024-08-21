import { createConnection, Connection as TypeORMConnection } from "typeorm"
import { SavedConnection } from "./models/saved_connection"
import { UsedConnection } from "./models/used_connection"
import { UsedQuery } from './models/used_query'
import { FavoriteQuery } from './models/favorite_query'
import { UserSetting } from './models/user_setting'
import { LoggerOptions } from 'typeorm/logger/LoggerOptions'
import { PinnedEntity } from "./models/PinnedEntity"
import { CloudCredential } from "./models/CloudCredential"
import { OpenTab } from "./models/OpenTab"

import { LicenseKey } from "./models/LicenseKey"
import { HiddenEntity } from "./models/HiddenEntity"
import { HiddenSchema } from "./models/HiddenSchema"
import { PinnedConnection } from "./models/PinnedConnection"
import { TokenCache } from "./models/token_cache"

const models = [
  SavedConnection,
  UsedConnection,
  UsedQuery,
  FavoriteQuery,
  UserSetting,
  PinnedEntity,
  CloudCredential,
  OpenTab,
  LicenseKey,
  HiddenEntity,
  HiddenSchema,
  PinnedConnection,
  TokenCache
]


export default class Connection {
  private connection?: TypeORMConnection

  constructor(private path: string, private logging: LoggerOptions) {}

  async connect(): Promise<TypeORMConnection> {
    this.connection = await createConnection({
      database: this.path,
      type: 'better-sqlite3',
      synchronize: false,
      migrationsRun: false,
      entities: models,
      logging: this.logging,
    })
    return this.connection
  }



}
