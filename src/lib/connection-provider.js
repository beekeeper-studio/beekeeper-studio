

import { createServer } from './db/index.js'

export default {

  convertConfig(config, osUsername) {
    const ssh = config.sshEnabled ? {} : null
    if (ssh) {
      ssh.host = config.sshHost
      ssh.port = config.sshPort
      ssh.user = config.sshUsername
      ssh.password = config.sshPassword
      ssh.privateKey = config.sshKeyfile
      ssh.passphrase = config.sshKeyfilePassword
    }

    return {
      client: config.connectionType,
      host: config.host,
      port: config.port,
      socketPath: null,
      user: config.username,
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
