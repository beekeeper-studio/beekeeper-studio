// Copyright (c) 2015 The SQLECTRON Team
import fs from 'fs'
import path from 'path'
import rawLog from "@bksLogger";
import { Options, SSHConnection } from '../../vendor/node-ssh-forward/index'
import appConfig from '@/common/platform_info'
import pf from 'portfinder'

import { IDbConnectionServerConfig, IDbConnectionServerSSHConfig } from './types';
import { resolveHomePathToAbsolute } from '@/handlers/utils';
import { IDbSshTunnel } from './backendTypes';
import { loadAllowedPublicKeys } from '@/lib/ssh/sshKeyUtils';
import { createFilteringAgent } from '@/lib/ssh/identitiesOnlyAgent';
import type { AuthenticationType, BaseAgent } from 'ssh2';

const isWindows = process.platform === 'win32';

function buildAuthHandler(opts: { useAgent: boolean; hasPrivateKey: boolean; hasPassword: boolean }): AuthenticationType[] {
  const methods: AuthenticationType[] = [];
  if (opts.useAgent) methods.push('agent');
  if (opts.hasPrivateKey) methods.push('publickey');
  if (opts.hasPassword) methods.push('password');
  return methods;
}

function maybeBuildFilteringAgent(
  identityFiles: string[] | undefined,
  identitiesOnly: boolean | undefined,
  socketPath: string | undefined,
  passphrase: string | undefined,
): BaseAgent | string | undefined {
  if (!socketPath) return undefined;
  if (!identitiesOnly || !identityFiles?.length) {
    return socketPath;
  }
  const allowed = loadAllowedPublicKeys(identityFiles, passphrase);
  return createFilteringAgent({
    socketPath,
    isWindows,
    allowedPublicKeys: allowed,
  });
}

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

        const ssh: IDbConnectionServerSSHConfig = config.ssh

        const sshConfig: Options = {
          endHost: ssh.host || '',
          endPort: ssh.port || undefined,
          bastionHost: ssh.bastionHost || '',
          bastionPort: ssh.bastionPort || undefined,
          bastionUsername: ssh.bastionUser || undefined,
          bastionPassword: ssh.bastionPassword || undefined,
          bastionPassphrase: ssh.bastionPassphrase || undefined,
          bastionAgentForward: ssh.bastionMode === 'agent',
          agentForward: ssh.useAgent,
          passphrase: ssh.passphrase || undefined,
          username: ssh.user || undefined,
          password: ssh.password || undefined,
          skipAutoPrivateKey: true,
          noReadline: true,
          keepaliveInterval: ssh.keepaliveInterval,
          // TODO: Move this to configuration defaults in the ini file
          bindHost: '127.0.0.1'
        }

        const socketPath = appConfig.sshAuthSock || undefined

        if (ssh.privateKey) {
          sshConfig.privateKey = fs.readFileSync(path.resolve(resolveHomePathToAbsolute(ssh.privateKey)))
        }

        if (ssh.bastionPrivateKey) {
          sshConfig.bastionPrivateKey = fs.readFileSync(path.resolve(resolveHomePathToAbsolute(ssh.bastionPrivateKey)))
        }

        if (ssh.useAgent) {
          sshConfig.agent = maybeBuildFilteringAgent(
            ssh.identityFiles,
            ssh.identitiesOnly,
            socketPath,
            ssh.passphrase || undefined,
          )
        }
        if (ssh.bastionMode === 'agent') {
          sshConfig.bastionAgent = maybeBuildFilteringAgent(
            ssh.bastionIdentityFiles,
            ssh.bastionIdentitiesOnly,
            socketPath,
            ssh.bastionPassphrase || undefined,
          )
        }

        sshConfig.authHandler = buildAuthHandler({
          useAgent: ssh.useAgent,
          hasPrivateKey: !!sshConfig.privateKey,
          hasPassword: !!ssh.password,
        })
        sshConfig.bastionAuthHandler = buildAuthHandler({
          useAgent: ssh.bastionMode === 'agent',
          hasPrivateKey: !!sshConfig.bastionPrivateKey,
          hasPassword: !!ssh.bastionPassword,
        })

        // if (config.ssh.privateKey && !config.ssh.useAgent) {
        //   sshConfig.privateKey = fs.readFileSync(path.resolve(resolveHomePathToAbsolute(config.ssh.privateKey)))
        // } else {
        //   sshConfig.privateKey = undefined
        // }

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
