// Copyright (c) 2015 The SQLECTRON Team
import fs from 'fs'
import path from 'path'
import rawLog from "@bksLogger";
import { Options, SSHConnection } from '../../vendor/node-ssh-forward/index'
import appConfig from '@/common/platform_info'
import pf from 'portfinder'

import { IDbConnectionServerConfig } from './types';
import { resolveHomePathToAbsolute } from '@/handlers/utils';
import { IDbSshTunnel } from './backendTypes';

const log = rawLog.scope('db:tunnel');
const logger = () => log;

export default function connectTunnel(config: IDbConnectionServerConfig): Promise<IDbSshTunnel> {
  logger().debug('setting up ssh tunnel')

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!config.ssh) {
          throw new Error('Missing ssh config')
        }

        // BUG FIX: As of Node 17, node prefers to resolve hostnames (eg 'localhost') using ipv6 by default rather than ipv4
        // So we need to make sure we're consistent with what hostname we return
        // localhost can be 127.0.0.1:port (ipv4), or :::port (ipv6) by default, depending.

        const sshConfig: Options = {
          endHost: config.ssh.host || '',
          endPort: config.ssh.port,
          bastionHost: config.ssh.bastionHost || '',
          agentForward: config.ssh.useAgent,
          passphrase: config.ssh.passphrase || undefined,
          username: config.ssh.user || undefined,
          password: config.ssh.password || undefined,
          skipAutoPrivateKey: true,
          noReadline: true,
          keepaliveInterval: config.ssh.keepaliveInterval,
          // TODO: Move this to configuration defaults in the ini file
          bindHost: '127.0.0.1'
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
        console.log("tunnel/ GOT TUNNEL PORT", localPort)
        // workaround for `getPortPromise` not releasing the port quickly enough
        await new Promise(resolve => setTimeout(resolve, 500));
        const tunnelConfig = {
          fromPort: localPort,
          toPort: config.port || 22,
          toHost: config.host
        }
        console.log("tunnel config: ", tunnelConfig)
        const tunnel = await connection.forward(tunnelConfig)
        logger().debug('tunnel created!')
        const result = {
          connection: connection,
          localHost: sshConfig.bindHost,
          localPort: localPort,
          tunnel: tunnel
        } as IDbSshTunnel
        resolve(result)

      } catch (ex) {
        reject(new Error('SSH Tunnel Connection Error: ' + ex.message));
      }
    })()
  })
}
