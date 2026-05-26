import fs from 'fs'
import os from 'os'
import path from 'path'
import log from 'electron-log/node'
import { redactMessage } from '@/lib/log/redact'

const SECRETS = {
  password: 'hunter2-db',
  bastionPassword: 'hunter2-bastion',
  passphrase: 'hunter2-passphrase',
  bastionPassphrase: 'hunter2-bastionpass',
  token: 'tok_topsecret',
  authToken: 'authtok_topsecret',
  clientSecret: 'cs_topsecret',
  secretAccessKey: 'sk_topsecret',
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEowIBAA...\n-----END PRIVATE KEY-----',
}

function fileContents(file: string): string {
  if (!fs.existsSync(file)) return ''
  return fs.readFileSync(file, 'utf8')
}

describe('log redaction (electron-log hooks)', () => {
  let tmpDir: string
  let logFile: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-log-redact-'))
    logFile = path.join(tmpDir, 'utility.log')

    log.hooks.length = 0
    log.transports.console.level = false
    log.transports.file.level = 'silly'
    log.transports.file.resolvePathFn = () => logFile
    log.transports.file.format = '{text}'
    log.hooks.push((message) => redactMessage(message))
  })

  afterEach(() => {
    log.hooks.length = 0
    log.transports.file.level = false
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  function assertNoSecrets(contents: string) {
    for (const [key, value] of Object.entries(SECRETS)) {
      expect(contents).not.toContain(value)
      // Sanity check: the key name (eg "password") may still appear, but the
      // value must not. We just verify the redaction marker shows up at least
      // somewhere so we know the hook ran.
      void key
    }
    expect(contents).toContain('[REDACTED]')
  }

  it('redacts a connection-shaped config object passed positionally', () => {
    const dbConfig = {
      host: 'db.example.com',
      port: 5432,
      user: 'matt',
      password: SECRETS.password,
      ssl: true,
    }

    log.info('CONFIG: ', dbConfig)

    const contents = fileContents(logFile)
    expect(contents).toContain('db.example.com')
    expect(contents).toContain('matt')
    expect(contents).not.toContain(SECRETS.password)
    expect(contents).toContain('[REDACTED]')
  })

  it('redacts ssh tunnel config including bastion fields', () => {
    const sshConfig = {
      host: 'ssh.example.com',
      port: 22,
      user: 'matt',
      password: SECRETS.password,
      passphrase: SECRETS.passphrase,
      bastionHost: 'bastion.example.com',
      bastionPassword: SECRETS.bastionPassword,
      bastionPassphrase: SECRETS.bastionPassphrase,
      privateKey: SECRETS.privateKey,
    }

    log.debug('ssh tunnel config: ', sshConfig)
    const contents = fileContents(logFile)
    assertNoSecrets(contents)
    expect(contents).toContain('ssh.example.com')
    expect(contents).toContain('bastion.example.com')
  })

  it('redacts nested objects (config.ssh.password, iam options)', () => {
    const serverConfig = {
      host: 'db.example.com',
      port: 5432,
      user: 'matt',
      password: SECRETS.password,
      ssh: {
        host: 'ssh.example.com',
        password: SECRETS.password,
        passphrase: SECRETS.passphrase,
      },
      iamAuthOptions: {
        accessKeyId: 'AKIA-public-id',
        secretAccessKey: SECRETS.secretAccessKey,
      },
      azureAuthOptions: {
        tenantId: 'tenant-public',
        clientSecret: SECRETS.clientSecret,
      },
      libsqlOptions: {
        authToken: SECRETS.authToken,
      },
      surrealDbOptions: {
        token: SECRETS.token,
      },
    }

    log.info('create driver client with config %j', serverConfig)
    const contents = fileContents(logFile)
    assertNoSecrets(contents)
    expect(contents).toContain('db.example.com')
    expect(contents).toContain('AKIA-public-id')
    expect(contents).toContain('tenant-public')
  })

  it('handles null/undefined secret fields without throwing', () => {
    const cfg = {
      host: 'db.example.com',
      user: 'matt',
      password: null,
      passphrase: undefined,
    }

    expect(() => log.info('cfg', cfg)).not.toThrow()
    const contents = fileContents(logFile)
    expect(contents).toContain('db.example.com')
  })

  it('does not blow up on circular references', () => {
    const cfg: Record<string, unknown> = {
      host: 'db.example.com',
      password: SECRETS.password,
    }
    cfg.self = cfg

    expect(() => log.info('circular', cfg)).not.toThrow()
    const contents = fileContents(logFile)
    expect(contents).not.toContain(SECRETS.password)
  })

  it('leaves non-sensitive primitive arguments untouched', () => {
    log.info('plain message', 42, 'hello world')
    const contents = fileContents(logFile)
    expect(contents).toContain('plain message')
    expect(contents).toContain('42')
    expect(contents).toContain('hello world')
  })
})
