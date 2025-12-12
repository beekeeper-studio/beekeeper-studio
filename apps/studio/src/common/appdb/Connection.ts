import { DataSource } from "typeorm"
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
import { InstallationId } from "./models/installation_id"
import { UserPin } from "./models/UserPin"
import { PluginData } from "./models/PluginData";
import { EncryptedPluginData } from "./models/EncryptedPluginData"
import { FormatterPreset } from "./models/FormatterPreset"

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
  TokenCache,
  InstallationId,
  UserPin,
  PluginData,
  EncryptedPluginData,
  FormatterPreset,
]

interface IConnectionState {
  connection: Connection | null
}

export const ConnectionState: IConnectionState = {
  connection: null
}

export default class Connection {
  public connection?: DataSource

  constructor(private path: string, private logging: LoggerOptions = false) {}

  async connect(options: any = {}): Promise<void> {
    this.connection = new DataSource({
      database: this.path,
      type: 'better-sqlite3',
      synchronize: false,
      migrationsRun: false,
      entities: models,
      logging: this.logging,
      ...options
    })
    await this.connection.initialize()
    ConnectionState.connection = this
  }

  async disconnect() {
    await this.connection?.destroy()
    this.connection = undefined;
  }


}
