

import { createServer } from './db/index.js'

export default {

  convertConfig(config) {

    const ssh = config.sshEnabled ? {} : null

    if (ssh) {
      ssh.host = config.sshHost.trim()
      ssh.port = config.sshPort
      ssh.user = config.sshUsername.trim()
      ssh.password = config.sshPassword
      ssh.privateKey = config.sshKeyfile
      ssh.passphrase = config.sshKeyfilePassword
    }

    return {
      client: config.connectionType,
      host: config.host.trim(),
      port: config.port,
      socketPath: null,
      user: config.username.trim(),
      password: config.password,
      ssh: ssh,
      ssl: config.ssl
    }
  },

  for(config) {
    let convertedConfig = this.convertConfig(config)
    const server = createServer(convertedConfig)
    return server
  }
}
