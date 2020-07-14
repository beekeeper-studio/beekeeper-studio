// Copyright (c) 2015 The SQLECTRON Team

import fs from 'fs'
import path from 'path'
import pf from 'portfinder'
import createLogger from '../logger';
import { SSHConnection } from 'node-ssh-forward'
import appConfig from '../../config'

import { resolveHomePathToAbsolute } from '../../common/utils'

const logger = createLogger('db:tunnel');

export default function(config) {
  logger().debug('setting up ssh tunnel')

  return new Promise(async (resolve, reject) => {
    try {

      const sshConfig = {
        endHost: config.ssh.host,
        endPort: config.ssh.port,
        bastionHost: config.ssh.bastionHost,
        agentForward: config.ssh.useAgent,
        passphrase: config.ssh.passphrase,
        username: config.ssh.user,
        password: config.ssh.password,
        skipAutoPrivateKey: true,
        noReadline: true
      }

      if (config.ssh.useAgent && appConfig.sshAuthSock) {
        sshConfig.agentSocket = appConfig.sshAuthSock
      }

      if (config.ssh.privateKey && !config.ssh.useAgent) {
        sshConfig.privateKey = fs.readFileSync(path.resolve(resolveHomePathToAbsolute(config.ssh.privateKey)))
      } else {
        sshConfig.privateKey = null
      }
      const connection = new SSHConnection(sshConfig)
      logger().debug("connection created!")

      const localPort = await pf.getPortPromise({port: 10000, stopPort: 60000})
      // workaround for `getPortPromise` not releasing the port quickly enough
      await new Promise(resolve => setTimeout(resolve, 500));
      const tunnelConfig = {
        fromPort: localPort,
        toPort: config.port,
        toHost: config.host
      }
      const tunnel = await connection.forward(tunnelConfig)
      logger().debug('tunnel created!')
      const result = {
        connection: connection,
        localHost: '127.0.0.1',
        localPort: localPort,
        tunnel: tunnel
      }
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}
