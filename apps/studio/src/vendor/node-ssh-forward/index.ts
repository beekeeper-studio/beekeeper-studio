
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
import { Client } from 'ssh2'
import * as net from 'net'
import * as fs from 'fs'
import * as os from 'os'
import rawLog from '@bksLogger'

import ElectronFriendlyPageantAgent from '@/vendor/ssh2/ElectronFriendlyPageantAgent'

interface Options {
  username?: string
  password?: string
  privateKey?: string | Buffer
  agentForward?: boolean
  bastionHost?: string
  passphrase?: string
  endPort?: number
  endHost: string
  agentSocket?: string,
  skipAutoPrivateKey?: boolean
  noReadline?: boolean
  keepaliveInterval?: number
  bindHost?: string
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
    if (this.options.bastionHost) {
      connection = await this.connectViaBastion(this.options.bastionHost)
    } else {
      connection = await this.connect(this.options.endHost)
    }
    return connection
  }

  private async connectViaBastion(bastionHost: string) {
    this.debug('Connecting to bastion host "%s"', bastionHost)
    const connectionToBastion = await this.connect(bastionHost)
    return new Promise<Client>((resolve, reject) => {
      connectionToBastion.forwardOut('127.0.0.1', 22, this.options.endHost, this.options.endPort || 22, async (err, stream) => {
        if (err) {
          return reject(err)
        }
        const connection = await this.connect(this.options.endHost, stream)
        return resolve(connection)
      })
    })
  }

  private async connect(host: string, stream?: NodeJS.ReadableStream): Promise<Client> {
    this.debug('Connecting to "%s"', host)
    const connection = new Client()
    return new Promise<Client>((resolve, reject) => {

      const options = {
        host,
        port: this.options.endPort,
        username: this.options.username,
        password: this.options.password,
        privateKey: this.options.privateKey,
        keepaliveInterval: this.options.keepaliveInterval
      }

      if (this.options.keepaliveInterval) {
        // this.options.keepaliveInterval (like ssh.config.keepaliveInterval) contains *seconds* because users
        // enter the value, and we store and display it, in seconds, like users do in their ~/ssh/config files
        this.debug('this.options.keepaliveInterval: ' + this.options.keepaliveInterval + ' seconds');
        // but the ssh2 cient connect() expects it in MILLIseconds, so we convert it to milliseconds internally
        options['keepaliveInterval'] = this.options.keepaliveInterval * 1000
        this.debug('(localized) options.keepaliveInterval: ' + options.keepaliveInterval + 'milliseconds')
      }

      if (this.options.agentForward) {
        options['agentForward'] = true

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
        options['agent'] = agentSock
      }
      if (stream) {
        options['sock'] = stream
      }
      // PPK private keys can be encrypted, but won't contain the word 'encrypted'
      // in fact they always contain a `encryption` header, so we can't do a simple check
      options['passphrase'] = this.options.passphrase
      const looksEncrypted: boolean = this.options.privateKey ? this.options.privateKey.toString().toLowerCase().includes('encrypted') : false
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
        connection.connect(options)
      } catch (error) {
        reject(error)
      }


    })
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
