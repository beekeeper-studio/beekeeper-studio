// Copyright (c) 2015 The SQLECTRON Team
import fs from 'fs'
import path from 'path'
import pf from 'portfinder'
import createLogger from '../logger';
import { Options, SSHConnection } from 'node-ssh-forward'
import appConfig from '../../config'

import { resolveHomePathToAbsolute } from '../../common/utils'
import { IDbConnectionServerConfig, IDbSshTunnel } from './client';

const logger = createLogger('db:tunnel');
export default function connectTunnel(config: IDbConnectionServerConfig): Promise<IDbSshTunnel> {
  logger().debug('setting up ssh tunnel')

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!config.ssh) {
          throw new Error('Missing ssh config')
        }

        const sshConfig: Options = {
          endHost: config.ssh.host || '',
          endPort: config.ssh.port,
          bastionHost: config.ssh.bastionHost || '',
          agentForward: config.ssh.useAgent,
          passphrase: config.ssh.passphrase || undefined,
          username: config.ssh.user || undefined,
          password: config.ssh.password || undefined,
          skipAutoPrivateKey: true,
          noReadline: true
        }

        if (config.ssh.useAgent && appConfig.sshAuthSock) {
          sshConfig.agentSocket = appConfig.sshAuthSock
        }

        if (config.ssh.privateKey && !config.ssh.useAgent) {
          sshConfig.privateKey = fs.readFileSync(path.resolve(resolveHomePathToAbsolute(config.ssh.privateKey)))
        } else {
          sshConfig.privateKey = undefined
        }
        const connection = new SSHConnection(sshConfig)
        logger().debug("connection created!")

        const localPort = await pf.getPortPromise({ port: 10000, stopPort: 60000 })
        // workaround for `getPortPromise` not releasing the port quickly enough
        await new Promise(resolve => setTimeout(resolve, 500));
        const tunnelConfig = {
          fromPort: localPort,
          toPort: config.port || 22,
          toHost: config.host
        }
        const tunnel = await connection.forward(tunnelConfig)
        logger().debug('tunnel created!')
        const result = {
          connection: connection,
          localHost: '127.0.0.1',
          localPort: localPort,
          tunnel: tunnel
        } as IDbSshTunnel
        resolve(result)

      } catch (ex) {
        reject(ex)
      }
    })()
  })
}
