import { IGroupedUserSettings } from '@/common/appdb/models/user_setting'
import { IConnection } from '@/common/interfaces/IConnection'
import { IDbConnectionPublicServer } from '@/lib/db/serverTypes'
import { IDbConnectionServerConfig, IDbConnectionServerSSHHopConfig } from '@/lib/db/types'
import { createServer } from './db/server'
import { readSshConfig } from '@/lib/ssh/sshConfigReader'

export default {
  convertConfig(config: IConnection, osUsername: string, settings: IGroupedUserSettings): IDbConnectionServerConfig {
    const sqliteExtension = settings?.sqliteExtensionFile?.value || undefined

    // sshConfigs is an ordered list of ConnectionSshConfig join rows (each has a .sshConfig nested object)
    const sorted = (config.sshConfigs ?? []).slice().sort((a, b) => a.position - b.position)
    const targetJoin = sorted[sorted.length - 1]
    const hopJoins = sorted.slice(0, -1)

    const toHopConfig = (join: typeof sorted[0]): IDbConnectionServerSSHHopConfig => {
      const cfg = join.sshConfig
      return {
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        password: cfg.password,
        privateKey: cfg.keyfile,
        passphrase: cfg.keyfilePassword,
        authMethod: (cfg.mode === 'userpass' ? 'password' : cfg.mode) as 'agent' | 'keyfile' | 'password',
      }
    }

    const jumpHosts: IDbConnectionServerSSHHopConfig[] = hopJoins.map(toHopConfig)

    const ssh = config.sshEnabled && targetJoin ? (() => {
      const cfg = targetJoin.sshConfig
      return {
        host: cfg.host ? cfg.host.trim() : null,
        port: cfg.port,
        user: cfg.username ? cfg.username.trim() : null,
        password: cfg.password,
        privateKey: cfg.keyfile,
        passphrase: cfg.keyfilePassword,
        bastionHost: null,
        useAgent: cfg.mode === 'agent',
        keepaliveInterval: config.sshKeepaliveInterval,
        jumpHosts,
      }
    })() : null

    if (ssh && targetJoin?.sshConfig?.mode === 'agent' && targetJoin?.sshConfig?.host) {
      const fileConfig = readSshConfig(targetJoin.sshConfig.host.trim())
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
