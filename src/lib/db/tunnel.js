// Copyright (c) 2015 The SQLECTRON Team

import fs from 'fs'
import path from 'path'
import { getPort } from '../utils';
// import createLogger from '../logger';
import { SSHConnection } from 'node-ssh-forward'
// const logger = createLogger('db:tunnel');
import { resolveHomePathToAbsolute } from '../utils'

export default function(config) {
  console.log('setting up ssh tunnel')

  return new Promise(async (resolve, reject) => {
    try {
      console.log("ssh config:")
      console.log(config.ssh)
      const connection = new SSHConnection({
        endHost: config.ssh.host,
        endPort: config.ssh.port,
        bastionHost: config.ssh.bastionHost,
        agentForward: config.ssh.agentForward,
        privateKey: fs.readFileSync(path.resolve(resolveHomePathToAbsolute(config.ssh.privateKey))),
        passphrase: config.ssh.passphrase,
        username: config.ssh.user,
        password: config.ssh.password
      })
      console.log("connection created!")

      const localPort = await getPort()
      console.log(`trying to tunnel on port ${localPort}`)
      console.log('tunnel config:')
      const tunnelConfig = {
        fromPort: localPort,
        toPort: config.port,
        toHost: config.host
      }
      console.log(tunnelConfig)
      const tunnel = await connection.forward(tunnelConfig)
      console.log('tunnel created!')
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
