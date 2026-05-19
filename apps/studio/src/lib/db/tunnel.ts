// Copyright (c) 2015 The SQLECTRON Team
import fs from 'fs'
import path from 'path'
import rawLog from "@bksLogger";
import { SshOptions, Options, SSHConnection, BaseSshOptions } from '../../vendor/node-ssh-forward/index'
import appConfig from '@/common/platform_info'
import pf from 'portfinder'
import _ from 'lodash'
import type { BaseAgent } from 'ssh2'
import { IDbConnectionServerConfig } from './types';
import { resolveHomePathToAbsolute } from '@/handlers/utils';
import { IDbSshTunnel } from './backendTypes';
import { readSshConfig, SshConfigResult } from '../ssh/sshConfigReader';
import { loadAllowedPublicKeys } from '@/lib/ssh/sshKeyUtils';
import { createFilteringAgent } from '@/lib/ssh/identitiesOnlyAgent';

const isWindows = process.platform === 'win32';

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

        // Build jump host options, reading private key files for keyfile-auth hops
        const jumpHosts: SshOptions[] = _.sortBy(
          config.ssh.configs,
          "position"
        ).map(({ sshConfig: ssh }) => {
          if (!ssh.mode) {
            throw new Error(`Invalid SSH mode ${ssh.mode}`);
          }

          // Resolve from ~/.ssh/config for all modes. The resolved HostName
          // always replaces the alias; port/user only fill in missing values.
          // Identity files are only honoured in agent ("Automatic") mode.
          let fileConfig: SshConfigResult | undefined;
          if (ssh.host) {
            try {
              fileConfig = readSshConfig(ssh.host);
            } catch (e) {
              log.error(`Could not read ssh config for ${ssh.host}: ${e.message}`);
            }
          }

          const baseOptions: BaseSshOptions = {
            host: fileConfig?.host || ssh.host,
            port: ssh.port ?? fileConfig?.port ?? 22,
            username: ssh.username ?? fileConfig?.user,
            mode: ssh.mode === 'userpass' ? 'password' : ssh.mode,
          };

          if (ssh.mode === "keyfile") {
            const keyfile = ssh.keyfile ?? "~/.ssh/id_rsa";
            const privateKeyContent = fs.readFileSync(
              path.resolve(resolveHomePathToAbsolute(keyfile))
            );
            return {
              ...baseOptions,
              privateKey: privateKeyContent,
              passphrase: ssh.keyfilePassword,
            };
          }

          if (ssh.mode === "userpass") {
            return {
              ...baseOptions,
              password: ssh.password,
            };
          }

          const agent = maybeBuildFilteringAgent(
            fileConfig?.identityFiles,
            fileConfig?.identitiesOnly,
            appConfig.sshAuthSock,
            undefined,
          );
          return {
            ...baseOptions,
            agentSocket: typeof agent === 'string' ? agent : undefined,
            agent: typeof agent === 'string' ? undefined : agent,
          };
        })

        const end = jumpHosts.pop();
        const sshConfig: Options = {
          endHost: end.host,
          endPort: end.port,
          privateKey: end.mode === 'keyfile' ? end.privateKey : undefined,
          agentForward: end.mode === 'agent',
          passphrase: end.mode === 'keyfile' ? end.passphrase : undefined,
          username: end.username,
          password: end.mode === 'password' ? end.password : undefined,
          skipAutoPrivateKey: true,
          noReadline: true,
          keepaliveInterval: config.ssh.keepaliveInterval,
          // TODO: Move this to configuration defaults in the ini file
          bindHost: '127.0.0.1',
          jumpHosts,
        }

        if (end.mode === 'agent') {
          sshConfig.agent = end.agent || end.agentSocket;
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
