import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { IDbConnectionServerConfig } from './db/client'
import { createServer } from './db/index'
import { IDbConnectionPublicServer } from './db/server'

export default {

  convertConfig(config: SavedConnection, osUsername: string): IDbConnectionServerConfig {
    const ssh = config.sshEnabled ? {
      host: config.sshHost ? config.sshHost.trim() : null,
      port: config.sshPort,
      user: config.sshUsername ? config.sshUsername.trim() : null,
      password: config.sshPassword,
      privateKey: config.sshKeyfile,
      passphrase: config.sshKeyfilePassword,
      bastionHost: config.sshBastionHost,
      useAgent: config.sshMode == 'agent',
    } : null

    return {
      client: config.connectionType,
      host: config.host.trim(),
      port: config.port,
      domain: config.domain || null,
      socketPath: null,
      user: config.username ? config.username.trim() : null,
      osUser: osUsername,
      password: config.password,
      ssh: ssh,
      ssl: config.ssl,
      sslCaFile: config.sslCaFile,
      sslCertFile: config.sslCertFile,
      sslKeyFile: config.sslKeyFile,
      sslRejectUnauthorized: config.sslRejectUnauthorized,
    }
  },

  for(config: SavedConnection, osUsername: string): IDbConnectionPublicServer {
    const convertedConfig = this.convertConfig(config, osUsername)
    const server = createServer(convertedConfig)
    return server
  }
}
