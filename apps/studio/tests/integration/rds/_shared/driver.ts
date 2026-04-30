import { IDbConnectionServerConfig, IamAuthOptions, IamAuthType } from '@/lib/db/types'
import { getAWSCLIToken, getIAMPassword } from '@/lib/db/clients/utils'
import { Options } from '../../../lib/db'

type Engine = 'pg' | 'mysql'

interface RdsTestDriverOptions {
  engine: Engine
  authType: IamAuthType
}

const DEFAULT_CLI_PATH = '/usr/bin/aws'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
      `The RDS integration suite expects provisioning outputs to be exported ` +
      `before jest runs — see infrastructure/ci/aws-rds/README.md.`
    )
  }
  return value
}

// IAM auth tokens expire after 15 minutes. DBTestUtil's knex pool is built
// eagerly in the constructor using whatever `config.password` holds, so we
// generate a fresh token up front via the same auth path under test and plant
// it on `config.password`. The primary connection path in DBTestUtil (via
// `createServer(config).createConnection(...)`) re-reads `iamAuthOptions` and
// gets its own fresh token — the knex-side token is only used for DDL during
// `setupdb()`.
export class RdsTestDriver {
  readonly engine: Engine
  readonly authType: IamAuthType
  readonly host: string
  readonly port: number
  readonly user: string
  readonly database: string
  readonly iamOptions: IamAuthOptions

  private _config: IDbConnectionServerConfig | null = null
  private _utilOptions: Options | null = null

  constructor({ engine, authType }: RdsTestDriverOptions) {
    this.engine = engine
    this.authType = authType
    this.database = 'banana'

    const region = requireEnv('BKS_RDS_AWS_REGION')

    if (engine === 'pg') {
      this.host = requireEnv('BKS_RDS_PG_HOST')
      this.port = parseInt(requireEnv('BKS_RDS_PG_PORT'), 10)
      this.user = requireEnv('BKS_RDS_PG_IAM_USER')
    } else {
      this.host = requireEnv('BKS_RDS_MYSQL_HOST')
      this.port = parseInt(requireEnv('BKS_RDS_MYSQL_PORT'), 10)
      this.user = requireEnv('BKS_RDS_MYSQL_IAM_USER')
    }

    this.iamOptions = this.buildIamOptions(region)
  }

  async init(): Promise<void> {
    const token = await this.generateToken()
    this._config = this.buildConfig(token)
    this._utilOptions = this.buildUtilOptions(token)
  }

  async generateToken(): Promise<string> {
    if (this.authType === IamAuthType.CLI) {
      return getAWSCLIToken(this.buildConfig(''), this.iamOptions)
    }
    return getIAMPassword(this.iamOptions, this.host, this.port, this.user)
  }

  get config(): IDbConnectionServerConfig {
    if (!this._config) throw new Error('RdsTestDriver not initialised — call init() first')
    return this._config
  }

  get utilOptions(): Options {
    if (!this._utilOptions) throw new Error('RdsTestDriver not initialised — call init() first')
    return this._utilOptions
  }

  private buildIamOptions(region: string): IamAuthOptions {
    const base: IamAuthOptions = {
      iamAuthenticationEnabled: true,
      awsRegion: region,
      authType: this.authType,
    }

    switch (this.authType) {
      case IamAuthType.Key:
        return {
          ...base,
          accessKeyId: requireEnv('BKS_TEST_ACCESS_KEY_ID'),
          secretAccessKey: requireEnv('BKS_TEST_SECRET_ACCESS_KEY'),
        }
      case IamAuthType.File:
        return {
          ...base,
          awsProfile: process.env.BKS_TEST_AWS_PROFILE || 'bks-ci',
        }
      case IamAuthType.CLI:
        return {
          ...base,
          cliPath: process.env.BKS_TEST_AWS_CLI_PATH || DEFAULT_CLI_PATH,
        }
      default:
        throw new Error(`Unsupported IAM auth type: ${this.authType}`)
    }
  }

  private buildConfig(password: string): IDbConnectionServerConfig {
    return {
      client: this.engine === 'pg' ? 'postgresql' : 'mysql',
      host: this.host,
      port: this.port,
      user: this.user,
      password,
      osUser: 'ci',
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: true,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: false,
      iamAuthOptions: this.iamOptions,
    }
  }

  private buildUtilOptions(_token: string): Options {
    if (this.engine === 'pg') {
      return {
        dialect: 'postgresql',
        defaultSchema: 'public',
        knexConnectionOptions: {
          ssl: { rejectUnauthorized: false },
        },
      }
    }
    return {
      dialect: 'mysql',
      skipGeneratedColumns: true,
      knexConnectionOptions: {
        ssl: { rejectUnauthorized: false },
      },
    }
  }
}
