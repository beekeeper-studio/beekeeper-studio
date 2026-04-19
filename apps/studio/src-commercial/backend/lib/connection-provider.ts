import { IGroupedUserSettings } from '@/common/appdb/models/user_setting'
import { IConnection } from '@/common/interfaces/IConnection'
import { IDbConnectionPublicServer } from '@/lib/db/serverTypes'
import { IDbConnectionServerConfig } from '@/lib/db/types'
import { createServer } from './db/server'
import { readSshConfig } from '@/lib/ssh/sshConfigReader'

export default {
  convertConfig(config: IConnection, osUsername: string, settings: IGroupedUserSettings): IDbConnectionServerConfig {
    const sqliteExtension = settings?.sqliteExtensionFile?.value || undefined
    const ssh = config.sshEnabled ? {
      host: config.sshHost ? config.sshHost.trim() : null,
      port: config.sshPort,
      user: config.sshUsername ? config.sshUsername.trim() : null,
      password: config.sshMode === 'userpass' ? config.sshPassword : null,
      privateKey: config.sshMode === 'keyfile' ? config.sshKeyfile : null,
      passphrase: config.sshMode === 'keyfile' ? config.sshKeyfilePassword : null,
      bastionHost: config.sshBastionHost,
      bastionPort: config.sshBastionHostPort,
      bastionUser: config.sshBastionUsername,
      bastionPassword: config.sshBastionMode === 'userpass' ? config.sshBastionPassword : null,
      bastionPrivateKey: config.sshBastionMode === 'keyfile' ? config.sshBastionKeyfile : null,
      bastionPassphrase: config.sshBastionMode === 'keyfile' ? config.sshBastionKeyfilePassword : null,
      bastionMode: config.sshBastionMode,
      useAgent: config.sshMode == 'agent',
      keepaliveInterval: config.sshKeepaliveInterval,
    } : null

    if (ssh && config.sshMode === 'agent' && config.sshHost) {
      const fileConfig = readSshConfig(config.sshHost.trim())
      if (fileConfig.port && !ssh.port) {
        ssh.port = fileConfig.port
      }
      if (fileConfig.identityFile) {
        ssh.privateKey = fileConfig.identityFile
      }
      if (fileConfig.host) {
        ssh.host = fileConfig.host
      }
      if (fileConfig.user && !ssh.user) {
        ssh.user = fileConfig.user
      }
    }

    if (ssh && config.sshBastionMode === 'agent' && config.sshBastionHost) {
      const fileConfig = readSshConfig(config.sshBastionHost.trim())
      if (fileConfig.port && !ssh.bastionPort) {
        ssh.bastionPort = fileConfig.port
      }
      if (fileConfig.identityFile) {
        ssh.bastionPrivateKey = fileConfig.identityFile
      }
      if (fileConfig.host) {
        ssh.bastionHost = fileConfig.host
      }
      if (fileConfig.user && !ssh.bastionUser) {
        ssh.bastionUser = fileConfig.user
      }
    }

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
      windowsAuthEnabled: config.windowsAuthEnabled,
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
