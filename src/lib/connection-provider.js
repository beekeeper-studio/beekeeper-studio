import { createServer } from './db/index.js'

export default {

  convertConfig(config, osUsername) {
    const ssh = config.sshEnabled ? {} : null
    if (ssh) {
      ssh.host = config.sshHost ? config.sshHost.trim() : null
      ssh.port = config.sshPort
      ssh.user = config.sshUsername ? config.sshUsername.trim() : null
      ssh.password = config.sshPassword
      ssh.privateKey = config.sshKeyfile
      ssh.passphrase = config.sshKeyfilePassword
      ssh.bastionHost = config.sshBastionHost
      ssh.useAgent = config.sshMode == 'agent'
    }

    return {
      client: config.connectionType,
      host: config.host.trim(),
      port: config.port,
      domain: config.domain,
      socketPath: null,
      user: config.username ? config.username.trim() : null,
      osUser: osUsername,
      password: config.password,
      ssh: ssh,
      ssl: config.ssl
    }
  },

  for(config, osUsername) {
    let convertedConfig = this.convertConfig(config, osUsername)
    const server = createServer(convertedConfig)
    return server
  }
}
