import { IGroupedUserSettings } from '@/common/appdb/models/user_setting'
import { IConnection } from '@/common/interfaces/IConnection'
import { IDbConnectionPublicServer } from '@/lib/db/serverTypes'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import { createServer } from './db/server'

export default {
  convertConfig(config: IConnection, osUsername: string, settings: IGroupedUserSettings): IDbConnectionServerConfig {
    const sqliteExtension = settings?.sqliteExtensionFile?.value || undefined
    const ssh = config.sshEnabled ? {
      host: config.sshHost ? config.sshHost.trim() : null,
      port: config.sshPort,
      user: config.sshUsername ? config.sshUsername.trim() : null,
      password: config.sshPassword,
      privateKey: config.sshKeyfile,
      passphrase: config.sshKeyfilePassword,
      bastionHost: config.sshBastionHost,
      useAgent: config.sshMode == 'agent',
      keepaliveInterval: config.sshKeepaliveInterval,
    } : null

    return {
      // @ts-ignore
      client: config.connectionType ?? config._connectionType,
      host: config.host ? config.host.trim() : null,
      port: config.port,
      // for mongo
      url: config.url,
      serviceName: config.serviceName || null,
      domain: config.domain || null,
      socketPath: config.socketPath,
      socketPathEnabled: config.socketPathEnabled,
      user: config.username ? config.username.trim() : null,
      osUser: osUsername,
      password: config.password,
      ssh: ssh,
      ssl: config.ssl,
      sslCaFile: config.sslCaFile,
      sslCertFile: config.sslCertFile,
      sslKeyFile: config.sslKeyFile,
      sslRejectUnauthorized: config.sslRejectUnauthorized,
      trustServerCertificate: config.trustServerCertificate,
      instantClientLocation: settings?.oracleInstantClient?.stringValue || undefined,
      oracleConfigLocation: settings?.oracleConfigLocation?.stringValue || undefined,
      options: config.options,
      redshiftOptions: config.redshiftOptions,
      iamAuthOptions: config.iamAuthOptions,
      readOnlyMode: config.readOnlyMode,
      cassandraOptions: config.cassandraOptions,
      bigQueryOptions: config.bigQueryOptions,
      azureAuthOptions: config.azureAuthOptions,
      authId: config.authId,
      libsqlOptions: config.libsqlOptions,
      sqlAnywhereOptions: config.sqlAnywhereOptions,
      surrealDbOptions: config.surrealDbOptions,
      runtimeExtensions: sqliteExtension ? sqliteExtension as string[] : []
    }
  },

  for(config: IConnection, osUsername: string, settings: IGroupedUserSettings): IDbConnectionPublicServer {
    const convertedConfig = this.convertConfig(config, osUsername, settings)
    const server = createServer(convertedConfig)
    return server
  }
}
