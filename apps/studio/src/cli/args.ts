import yargsParser from 'yargs-parser'
import {
  CLI_COMMANDS,
  CLI_ENTITY_TYPES,
  CLI_PROTOCOL_VERSION,
  CliCommandName,
  CliEntityType,
  CliError,
  CliRequest,
} from './protocol'

export type CliOutputFormat = 'json' | 'markdown'

export const CLI_OUTPUT_FORMATS: CliOutputFormat[] = ['json', 'markdown']

export interface CliInvocation {
  help: boolean
  format: CliOutputFormat
  /** Null when help was requested. */
  request: CliRequest | null
  /** `query --file <path>`: the client reads it and fills in request.args.sql. */
  sqlFile: string | null
  /** `query -`: the client reads stdin and fills in request.args.sql. */
  sqlFromStdin: boolean
}

export const CLI_USAGE = `Usage: bks <command> [options]

Runs read-only commands against a database connection that is already open in
the Beekeeper Studio desktop app. The connection needs "Enable CLI Access"
checked in its connection settings, or [cli] enableForAllConnections = true in
the ini config. Every call is recorded in the app's cli.log file.

Commands:
  connections               List the connections currently open in the app
  list-schemas              List the schemas in the connected database
  list-tables               List tables (same as list-entities --entity-type table)
  list-entities             List tables, views, materialized views and routines
  structure <name>          Columns, keys, indexes, relations, triggers and DDL of a table or view
  query <sql>               Run a read-only SQL statement and print the results
                            (at most 20,000 rows per result)
  help                      Show this help

Options:
  -c, --connection <name>   Open connection to use (its name or id). Required when more
                            than one open connection has CLI access enabled
  -s, --schema <schema>     Only this schema (list-tables, list-entities, structure)
  -t, --entity-type <type>  table, view, materialized-view or routine. Repeat the flag or
                            comma-separate to combine (list-entities)
      --file <path>         Read the SQL for query from a file. Pass - as the sql
                            argument to read it from stdin instead
  -f, --format <format>     Output format: json (default) or markdown
  -h, --help                Show this help

Environment:
  BKS_CLI_SOCKET            Socket the app listens on, when it is not in the default
                            location (beekeeper-studio cli prints it)
  BKS_CLI_DEV=1             Talk to a development build of the app

Examples:
  bks connections
  bks list-tables --schema public
  bks structure users --schema public
  bks query "select id, email from users limit 10"
  bks query --file ./report.sql --format markdown
  echo "select count(*) from orders" | bks query -`

const USAGE_HINT = 'Run `bks --help` for usage.'

/**
 * The binary receives launcher flags ahead of the user's own arguments (the
 * linux launcher script adds --no-sandbox, bks-flags.conf may add more), so
 * `cli` is the first positional argument rather than argv[0]. Returns the
 * arguments after `cli`, or null for a normal app launch.
 */
export function extractCliArgs(appArgs: string[]): string[] | null {
  for (let i = 0; i < appArgs.length; i++) {
    const arg = appArgs[i]
    if (arg === 'cli') return appArgs.slice(i + 1)
    if (!arg.startsWith('-')) return null
  }
  return null
}

/**
 * `extractCliArgs` applied to this process's own argv. `electron <app path>`
 * (dev, e2e) puts the app path at argv[1]; a packaged build does not.
 */
export function cliArgsFromProcessArgv(
  argv: string[] = (typeof process !== 'undefined' && process.argv) || [],
  defaultApp: boolean = typeof process !== 'undefined' && !!(process as any).defaultApp
): string[] | null {
  return extractCliArgs(argv.slice(defaultApp ? 2 : 1))
}

const STRING_OPTIONS = ['connection', 'schema', 'entity-type', 'format', 'file']
const BOOLEAN_OPTIONS = ['help']
const ALIASES: Record<string, string[]> = {
  connection: ['c'],
  schema: ['s'],
  'entity-type': ['t'],
  format: ['f'],
  help: ['h'],
}

function usageError(message: string, hint = USAGE_HINT): CliError {
  return new CliError('USAGE', message, { hint })
}

function singleString(value: unknown, option: string): string | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) {
    throw usageError(`--${option} was given more than once.`)
  }
  const text = String(value).trim()
  if (!text) throw usageError(`--${option} needs a value.`)
  return text
}

const ENTITY_TYPE_ALIASES: Record<string, CliEntityType> = {
  table: 'table',
  tables: 'table',
  view: 'view',
  views: 'view',
  'materialized-view': 'materialized-view',
  'materialized-views': 'materialized-view',
  materialized_view: 'materialized-view',
  matview: 'materialized-view',
  matviews: 'materialized-view',
  routine: 'routine',
  routines: 'routine',
  function: 'routine',
  functions: 'routine',
  procedure: 'routine',
  procedures: 'routine',
}

export function parseEntityTypes(value: unknown): CliEntityType[] | undefined {
  if (value === undefined) return undefined
  const raw = (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  if (raw.length === 0) throw usageError('--entity-type needs a value.')
  const types: CliEntityType[] = []
  for (const item of raw) {
    const type = ENTITY_TYPE_ALIASES[item]
    if (!type) {
      throw usageError(
        `Unknown entity type "${item}". Expected one of: ${CLI_ENTITY_TYPES.join(', ')}.`
      )
    }
    if (!types.includes(type)) types.push(type)
  }
  return types
}

function parseFormat(value: unknown): CliOutputFormat {
  const format = singleString(value, 'format')
  if (format === undefined) return 'json'
  const normalized = format.toLowerCase() === 'md' ? 'markdown' : format.toLowerCase()
  if (!CLI_OUTPUT_FORMATS.includes(normalized as CliOutputFormat)) {
    throw usageError(`Unknown format "${format}". Expected one of: ${CLI_OUTPUT_FORMATS.join(', ')}.`)
  }
  return normalized as CliOutputFormat
}

function assertNoExtraPositionals(command: string, rest: string[]) {
  if (rest.length > 0) {
    throw usageError(`${command} does not take any arguments, got: ${rest.join(' ')}`)
  }
}

export function parseCliArgs(args: string[]): CliInvocation {
  const parsed = yargsParser(args, {
    string: STRING_OPTIONS,
    boolean: BOOLEAN_OPTIONS,
    alias: ALIASES,
    configuration: {
      'parse-numbers': false,
      'parse-positional-numbers': false,
      'camel-case-expansion': false,
      'boolean-negation': false,
      'duplicate-arguments-array': true,
      'strip-aliased': true,
    },
  })

  const known = new Set([...STRING_OPTIONS, ...BOOLEAN_OPTIONS, '_', '--'])
  const unknown = Object.keys(parsed).find((key) => !known.has(key))
  if (unknown) {
    throw usageError(`Unknown option --${unknown}.`)
  }

  const positionals = (parsed._ as unknown[]).map(String)
  const format = parseFormat(parsed.format)
  const [commandName, ...rest] = positionals

  if (parsed.help || !commandName || commandName === 'help') {
    if (!parsed.help && !commandName) {
      throw usageError('No command given.')
    }
    return { help: true, format, request: null, sqlFile: null, sqlFromStdin: false }
  }

  if (!(CLI_COMMANDS as readonly string[]).includes(commandName)) {
    throw usageError(`Unknown command "${commandName}". Commands: ${CLI_COMMANDS.join(', ')}.`)
  }
  const command = commandName as CliCommandName

  const request: CliRequest = {
    version: CLI_PROTOCOL_VERSION,
    command,
    args: {},
  }
  const connection = singleString(parsed.connection, 'connection')
  const schema = singleString(parsed.schema, 'schema')
  if (connection) request.args.connection = connection
  if (schema) request.args.schema = schema

  let sqlFile: string | null = null
  let sqlFromStdin = false

  switch (command) {
    case 'connections':
    case 'list-schemas':
    case 'list-tables':
      assertNoExtraPositionals(command, rest)
      break
    case 'list-entities': {
      assertNoExtraPositionals(command, rest)
      const types = parseEntityTypes(parsed['entity-type'])
      if (types) request.args.entityTypes = types
      break
    }
    case 'structure': {
      if (rest.length === 0) {
        throw usageError('structure needs the name of a table or view, e.g. `structure users`.')
      }
      if (rest.length > 1) {
        throw usageError(`structure takes one name, got: ${rest.join(' ')}. Quote names containing spaces.`)
      }
      let name = rest[0]
      // `schema.table` is a common way to write it; split when no explicit schema was given.
      if (!schema && name.includes('.') && name.split('.').length === 2) {
        const [schemaPart, namePart] = name.split('.')
        if (schemaPart && namePart) {
          request.args.schema = schemaPart
          name = namePart
        }
      }
      request.args.name = name
      break
    }
    case 'query': {
      sqlFile = singleString(parsed.file, 'file') ?? null
      const sql = rest.join(' ').trim()
      if (sqlFile && sql) {
        throw usageError('Pass either SQL text or --file, not both.')
      }
      if (!sqlFile && !sql) {
        throw usageError('query needs SQL text, --file <path>, or - to read stdin.')
      }
      if (sql === '-') {
        sqlFromStdin = true
      } else if (sql) {
        request.args.sql = sql
      }
      break
    }
  }

  return { help: false, format, request, sqlFile, sqlFromStdin }
}
