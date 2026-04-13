
/*
 * Copyright 2018 Stocard GmbH.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path'
import { Client, type ConnectConfig } from 'ssh2'
import * as net from 'net'
import * as fs from 'fs'
import * as os from 'os'
import rawLog from '@bksLogger'
import _ from 'lodash'

import ElectronFriendlyPageantAgent from '@/vendor/ssh2/ElectronFriendlyPageantAgent'

export type BaseSshOptions = {
  host: string;
  port?: number;
  username?: string;
  mode: 'password' | 'keyfile' | 'agent';
};

export type PasswordAuthSshOptions = BaseSshOptions & {
  mode: 'password';
  password?: string;
};

export type KeyFileAuthSshOptions = BaseSshOptions & {
  mode: 'keyfile';
  privateKey?: string | Buffer;
  passphrase?: string;
};

export type AgentAuthSshOptions = BaseSshOptions & {
  mode: 'agent';
  agentSocket?: string;
}

export type SshOptions = PasswordAuthSshOptions | KeyFileAuthSshOptions | AgentAuthSshOptions;

type Options = {
  username?: string
  password?: string
  privateKey?: string | Buffer
  agentForward?: boolean
  /** @deprecated Use jumpHosts instead */
  bastionHost?: string
  bastionPort?: number
  bastionUsername?: string
  bastionPassword?: string
  bastionPrivateKey?: string | Buffer
  bastionPassphrase?: string
  bastionAgentForward?: boolean
  passphrase?: string
  endPort?: number
  endHost: string
  agentSocket?: string,
  skipAutoPrivateKey?: boolean
  noReadline?: boolean
  keepaliveInterval?: number
  bindHost?: string
  jumpHosts?: SshOptions[]
}

type ConnectOptions = ConnectConfig & {
  stream?: NodeJS.ReadableStream
}

interface ForwardingOptions {
  fromPort: number
  toPort: number
  toHost?: string
}

class SSHConnection {

  private log: rawLog.LogFunctions
  private server
  private connections: Client[] = []
  private isWindows = process.platform === 'win32'

  constructor(private options: Options) {
    this.log = rawLog.scope('vendor/node-ssh-forward')
    if (!options.username) {
      this.options.username = process.env['SSH_USERNAME'] || process.env['USER']
    }

    if (!options.bindHost) {
      this.options.bindHost = '127.0.0.1'
    }
    if (!options.endPort) {
      this.options.endPort = 22
    }
    if (!options.privateKey && !options.agentForward && !options.skipAutoPrivateKey) {
      const defaultFilePath = path.join(os.homedir(), '.ssh', 'id_rsa')
      if (fs.existsSync(defaultFilePath)) {
        this.options.privateKey = fs.readFileSync(defaultFilePath)
      }
    }
  }

  private debug(...stuff: any) {
    this.log.debug(...stuff)
  }

  public async shutdown() {
    this.debug("Shutdown connections")
    for (const connection of this.connections) {
      connection.removeAllListeners()
      connection.end()
    }
    return new Promise<void>((resolve) => {
      if (this.server) {
        this.server.close(resolve)
      }
      return resolve()
    })
  }

  public async tty() {
    const connection = await this.establish()
    this.debug("Opening tty")
    await this.shell(connection)
  }

  public async executeCommand(command) {
    const connection = await this.establish()
    this.debug('Executing command "%s"', command)
    await this.shell(connection, command)
  }

  private async shell(connection: Client, command?: string) {
    return new Promise<void>((resolve, reject) => {
      connection.shell((err, stream) => {
        if (err) {
          return reject(err)
        }
        stream.on('exit', (code) => this.debug('EVENT exit:', code))
        stream.on('close', async (...args) => {
          this.debug('EVENT close:', ...args)
          stream.end()
          process.stdin.unpipe(stream)
          process.stdin.destroy()
          connection.end()
          await this.shutdown()
          return resolve()
        }).stderr.on('data', (data) => {
          return reject(data)
        })
        stream.pipe(process.stdout)

        if (command) {
          stream.end(`${command}\nexit\n`)
        } else {
          process.stdin.pipe(stream)
        }
      })
    })
  }

  private async establish() {
    let connection: Client
    this.debug("establish with options", this.options)

    // Collect the ordered list of jump hosts.
    // Support both the new jumpHosts array and the legacy bastionHost string.
    const jumpHosts: SshOptions[] = this.options.jumpHosts && this.options.jumpHosts.length > 0
      ? this.options.jumpHosts
      : (this.options.bastionHost ? [{ host: this.options.bastionHost, mode: 'agent' as const }] : [])

    if (jumpHosts.length > 0) {
      connection = await this.connectViaBastion(jumpHosts)
    } else {
      connection = await this.connect(this.getEndOptions())
    }
    return connection
  }

  /**
   * Chain through jump hosts:
   *   jumpHosts[0] -> jumpHosts[1] -> ... -> endHost
   *
   * Each hop opens a TCP-forward stream through the previous connection, which
   * becomes the `sock` for the next ssh2 Client.
   */
  private async connectViaBastion(jumpHosts: SshOptions[]): Promise<Client> {
    let stream: NodeJS.ReadableStream | undefined = undefined

    for (let i = 0; i < jumpHosts.length; i++) {
      const hop = jumpHosts[i]
      const nextHost = i + 1 < jumpHosts.length ? jumpHosts[i + 1].host : this.options.endHost
      const nextPort = i + 1 < jumpHosts.length ? (jumpHosts[i + 1].port ?? 22) : (this.options.endPort ?? 22)

      this.debug('Connecting to jump host [%d] "%s"', i, hop.host)
      const conn = await this.connectWithHopOptions(hop, stream)

      // Open a TCP forward to the next hop through this connection
      stream = await this.openForwardStream(conn, nextHost, nextPort)
    }

    // Final connection to the real endHost, through the stream from the last jump
    this.debug('Connecting to final endHost "%s" through jump chain', this.options.endHost)
    return await this.connect(this.options.endHost, stream)
  }

  /**
   * Open a forwardOut stream from the given connection to (host, port).
   * Returns the duplex stream that will be used as the `sock` for the next hop.
   */
  private openForwardStream(connection: Client, toHost: string, toPort: number): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      connection.forwardOut('127.0.0.1', 0, toHost, toPort, (err, stream) => {
        if (err) return reject(err)
        resolve(stream)
      })
    })
  }

  /**
   * Connect to a single jump host using that hop's own credentials.
   * Falls back to the global options fields when hop-specific values are absent.
   */
  private async connectWithHopOptions(hop: SshOptions, sock?: NodeJS.ReadableStream): Promise<Client> {
    const connection = new Client()
    return new Promise<Client>((resolve, reject) => {
      const options: ConnectConfig = {
        host: hop.host,
        port: hop.port ?? 22,
        username: hop.username,
      }

      if (this.options.keepaliveInterval) {
        options.keepaliveInterval = this.options.keepaliveInterval * 1000
      }

      if (hop.mode === 'password') {
        options.password = (hop as PasswordAuthSshOptions).password
      } else if (hop.mode === 'keyfile') {
        options.privateKey = hop.privateKey
        options.passphrase = hop.passphrase
      } else {
        // agent
        options.agentForward = true
        let agentDefault: any = process.env['SSH_AUTH_SOCK']
        if (this.isWindows && agentDefault == null) {
          agentDefault = ElectronFriendlyPageantAgent
        }
        const agentSock = hop.agentSocket || agentDefault
        if (agentSock == null) {
          return reject(new Error('SSH Agent Socket is not provided, or is not set in the SSH_AUTH_SOCK env variable'))
        }
        options.agent = agentSock
      }

      if (sock) {
        options.sock = sock
      }

      connection.on('ready', () => {
        this.connections.push(connection)
        resolve(connection)
      })
      connection.on('error', reject)
      try {
        connection.connect(options)
      } catch (err) {
        reject(err)
      }
    })
  }

  private async connect(host: string, stream?: NodeJS.ReadableStream): Promise<Client> {
    this.debug('Connecting to "%s"', host)
    const connection = new Client()
    return new Promise<Client>((resolve, reject) => {

      const options: ConnectOptions = {
        host,
        port: this.options.endPort,
        username: this.options.username,
        password: this.options.password,
        privateKey: this.options.privateKey,
        passphrase: this.options.passphrase,
        agentForward: this.options.agentForward,
      }

      const config: ConnectConfig = _.clone(options);

      if (this.options.keepaliveInterval) {
        // this.options.keepaliveInterval (like ssh.config.keepaliveInterval) contains *seconds* because users
        // enter the value, and we store and display it, in seconds, like users do in their ~/ssh/config files
        this.debug('this.options.keepaliveInterval: ' + this.options.keepaliveInterval + ' seconds');
        // but the ssh2 cient connect() expects it in MILLIseconds, so we convert it to milliseconds internally
        config['keepaliveInterval'] = this.options.keepaliveInterval * 1000
        this.debug('(localized) options.keepaliveInterval: ' + options.keepaliveInterval + 'milliseconds')
      }

      if (options.agentForward) {
        // see https://github.com/mscdex/ssh2#client for agents on Windows
        // guaranteed to give the ssh agent sock if the agent is running (posix)
        let agentDefault: any = process.env['SSH_AUTH_SOCK']
        if (this.isWindows) {
          // null or undefined
          if (agentDefault == null) {
            agentDefault = ElectronFriendlyPageantAgent
          }
        }

        const agentSock = this.options.agentSocket ? this.options.agentSocket : agentDefault
        if (agentSock == null) {
          throw new Error('SSH Agent Socket is not provided, or is not set in the SSH_AUTH_SOCK env variable')
        }
        config['agent'] = agentSock
      }
      if (stream) {
        config['sock'] = stream
      } else if (options.stream) {
        config['sock'] = options.stream
      }
      // PPK private keys can be encrypted, but won't contain the word 'encrypted'
      // in fact they always contain a `encryption` header, so we can't do a simple check
      // options['passphrase'] = options?.passphrase ?? this.options.passphrase
      const looksEncrypted: boolean = options.privateKey ? options.privateKey.toString().toLowerCase().includes('encrypted') : false
      if (looksEncrypted && !options['passphrase'] && !this.options.noReadline) {
        // I disable this as not used in the terminal
        // options['passphrase'] = await this.getPassphrase()
      }
      connection.on('ready', () => {
        this.connections.push(connection)
        return resolve(connection)
      })

      connection.on('error', (error) => {
        reject(error)
      })
      try {
        connection.connect(config)
      } catch (error) {
        reject(error)
      }


    })
  }

  private getEndOptions(): ConnectOptions {
    return {
      host: this.options.endHost,
      port: this.options.endPort,
      username: this.options.username,
      password: this.options.password,
      privateKey: this.options.privateKey,
      passphrase: this.options.passphrase,
      agentForward: this.options.agentForward,
    }
  }

  private getBastionOptions(): ConnectOptions {
    return {
      host: this.options.bastionHost,
      port: this.options.bastionPort,
      username: this.options.bastionUsername,
      password: this.options.bastionPassword,
      privateKey: this.options.bastionPrivateKey,
      passphrase: this.options.bastionPassphrase,
      agentForward: this.options.bastionAgentForward,
    }
  }

  async forward(options: ForwardingOptions) {
    this.debug("Starting forward")
    const connection = await this.establish()
    this.debug("connection established")
    return new Promise<any>((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.debug('Forwarding connection from "localhost:%d" to "%s:%d"', options.fromPort, options.toHost, options.toPort)
        connection.forwardOut(this.options.bindHost, options.fromPort, options.toHost || '127.0.0.1', options.toPort, (error, stream) => {
          if (error) {
            return reject(error)
          }
          socket.pipe(stream)
          stream.pipe(socket)
        })
      }).listen(options.fromPort, this.options.bindHost, () => {
        this.debug("Tunnel listening configured")
        resolve({})
      })

    })
  }
}

export { SSHConnection, Options }
