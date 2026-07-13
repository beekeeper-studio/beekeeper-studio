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
import os from 'os';
import { loadAllowedPublicKeys } from '@/lib/ssh/sshKeyUtils';
import { createFilteringAgent } from '@/lib/ssh/identitiesOnlyAgent';
import type { AuthenticationType, BaseAgent } from 'ssh2';

const isWindows = process.platform === 'win32';

// Default OpenSSH identity files, in the same priority order ssh(1) uses.
const DEFAULT_IDENTITY_FILES = [
  'id_ed25519',
  'id_ecdsa',
  'id_rsa',
  'id_dsa',
];

function findDefaultIdentityFile(): string | undefined {
  const sshDir = path.join(os.homedir(), '.ssh');
  for (const name of DEFAULT_IDENTITY_FILES) {
    const candidate = path.join(sshDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

// Read a single identity file, returning undefined (rather than throwing) when
// the file is missing or unreadable. Mirrors ssh(1), which skips IdentityFile
// entries it cannot use instead of aborting. See #4366.
function tryReadKeyFile(candidate: string): Buffer | undefined {
  const resolved = path.resolve(resolveHomePathToAbsolute(candidate));
  if (!fs.existsSync(resolved)) {
    log.warn(`Skipping IdentityFile that does not exist: ${resolved}`);
    return undefined;
  }
  try {
    return fs.readFileSync(resolved);
  } catch (err) {
    log.warn(`Skipping unreadable IdentityFile ${resolved}: ${err.message}`);
    return undefined;
  }
}

// Resolve the key used for publickey auth.
//
// Automatic mode mirrors ssh(1): the ~/.ssh/config IdentityFile entries are
// tried in order, skipping any that can't be read (e.g. the file doesn't
// exist), then falling back to the OpenSSH default identity files. A bad entry
// must never abort the connection (#4366).
//
// Key File mode honours the user's explicit choice exactly — if they picked a
// key that can't be read, that's a real error and is left to surface.
function resolveKeyForAuth(opts: {
  explicitKey?: string;
  identityFiles?: string[];
  useAgent: boolean;
}): Buffer | undefined {
  const { explicitKey, identityFiles, useAgent } = opts;

  if (!useAgent) {
    return explicitKey
      ? fs.readFileSync(path.resolve(resolveHomePathToAbsolute(explicitKey)))
      : undefined;
  }

  const ordered = identityFiles && identityFiles.length
    ? identityFiles
    : (explicitKey ? [explicitKey] : []);
  for (const candidate of ordered) {
    const buf = tryReadKeyFile(candidate);
    if (buf) return buf;
  }
  const fallback = findDefaultIdentityFile();
  return fallback ? tryReadKeyFile(fallback) : undefined;
}

function buildAuthHandler(opts: { useAgent: boolean; hasPrivateKey: boolean; hasPassword: boolean }): AuthenticationType[] {
  const methods: AuthenticationType[] = ['none'];// always add none as a fallback for things like tailscale, #4358
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

        const socketPath = appConfig.sshAuthSock || undefined
        const haveAgent = ssh.useAgent && !!socketPath
        const bastionHaveAgent = ssh.bastionMode === 'agent' && !!socketPath

        const sshConfig: Options = {
          endHost: ssh.host || '',
          endPort: ssh.port || undefined,
          bastionHost: ssh.bastionHost || '',
          bastionPort: ssh.bastionPort || undefined,
          bastionUsername: ssh.bastionUser || undefined,
          bastionPassword: ssh.bastionPassword || undefined,
          bastionPassphrase: ssh.bastionPassphrase || undefined,
          bastionAgentForward: bastionHaveAgent,
          agentForward: haveAgent,
          passphrase: ssh.passphrase || undefined,
          username: ssh.user || undefined,
          password: ssh.password || undefined,
          skipAutoPrivateKey: true,
          noReadline: true,
          keepaliveInterval: ssh.keepaliveInterval,
          // TODO: Move this to configuration defaults in the ini file
          bindHost: '127.0.0.1'
        }

        const privateKey = resolveKeyForAuth({
          explicitKey: ssh.privateKey || undefined,
          identityFiles: ssh.identityFiles,
          useAgent: ssh.useAgent,
        })
        if (privateKey) {
          sshConfig.privateKey = privateKey
        }

        const bastionPrivateKey = resolveKeyForAuth({
          explicitKey: ssh.bastionPrivateKey || undefined,
          identityFiles: ssh.bastionIdentityFiles,
          useAgent: ssh.bastionMode === 'agent',
        })
        if (bastionPrivateKey) {
          sshConfig.bastionPrivateKey = bastionPrivateKey
        }

        if (haveAgent) {
          sshConfig.agent = maybeBuildFilteringAgent(
            ssh.identityFiles,
            ssh.identitiesOnly,
            socketPath,
            ssh.passphrase || undefined,
          )
        }
        if (bastionHaveAgent) {
          sshConfig.bastionAgent = maybeBuildFilteringAgent(
            ssh.bastionIdentityFiles,
            ssh.bastionIdentitiesOnly,
            socketPath,
            ssh.bastionPassphrase || undefined,
          )
        }

        sshConfig.authHandler = buildAuthHandler({
          useAgent: haveAgent,
          hasPrivateKey: !!sshConfig.privateKey,
          hasPassword: !!ssh.password,
        })
        sshConfig.bastionAuthHandler = buildAuthHandler({
          useAgent: bastionHaveAgent,
          hasPrivateKey: !!sshConfig.bastionPrivateKey,
          hasPassword: !!ssh.bastionPassword,
        })

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
