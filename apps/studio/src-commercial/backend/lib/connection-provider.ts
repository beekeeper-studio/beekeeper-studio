import { IGroupedUserSettings } from '@/common/appdb/models/user_setting'
import { IConnection } from '@/common/interfaces/IConnection'
import { IDbConnectionPublicServer } from '@/lib/db/serverTypes'
import { IDbConnectionServerConfig, IDbConnectionServerSSHConfig } from '@/lib/db/types'
import { createServer } from './db/server'
import { readSshConfig } from '@/lib/ssh/sshConfigReader'
import fs from 'fs'

// In Automatic mode ssh tries each IdentityFile and skips missing ones; surface
// that so the user knows a configured key was not used. Only relevant when the
// keys are actually consumed (agent mode).
function missingIdentityFileWarnings(identityFiles?: string[]): string[] {
  return (identityFiles || [])
    .filter((p) => !fs.existsSync(p))
    .map((p) => `IdentityFile not found and skipped: ${p}`)
}

// Non-fatal ~/.ssh/config issues to surface to the user (invalid/untrusted
// config, missing IdentityFile), collected across every hop in the chain.
function collectSshConfigWarnings(ssh: IDbConnectionServerSSHConfig): string[] {
  if (!ssh.enabled) {
    return [];
  }

  const sshConfigWarnings: string[] = []

  for (const { sshConfig: config } of ssh.configs) {
    if (!config.host) continue
    const fileConfig = readSshConfig(
      config.host.trim(),
      undefined,
      config.username ? config.username.trim() : undefined
    )
    if (fileConfig.warnings) {
      sshConfigWarnings.push(...fileConfig.warnings.map((w) => w.message))
    }
    if (config.mode === 'agent') {
      sshConfigWarnings.push(...missingIdentityFileWarnings(fileConfig.identityFiles))
    }
  }

  return Array.from(new Set(sshConfigWarnings))
}

export default {
  convertConfig(config: IConnection, osUsername: string, settings: IGroupedUserSettings): IDbConnectionServerConfig {
    const sqliteExtension = settings?.sqliteExtensionFile?.value || undefined
    const ssh: IDbConnectionServerSSHConfig = {
      enabled: config.sshEnabled,
      configs: config.sshConfigs || [],
      keepaliveInterval: config.sshKeepaliveInterval,
    }

    const sshConfigWarnings = collectSshConfigWarnings(ssh)

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
      sqlServerOptions: config.sqlServerOptions,
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
      snowflakeOptions: config.snowflakeOptions,
      dynamoDbOptions: config.dynamoDbOptions,
      runtimeExtensions: sqliteExtension ? sqliteExtension as string[] : [],
      sshConfigWarnings,
    }
  },

  for(config: IConnection, osUsername: string, settings: IGroupedUserSettings): IDbConnectionPublicServer {
    const convertedConfig = this.convertConfig(config, osUsername, settings)
    const server = createServer(convertedConfig)
    return server
  }
}
