import { describe, it, expect } from 'vitest'
import { cliArgsFromProcessArgv, extractCliArgs, parseCliArgs, parseEntityTypes, CLI_USAGE } from '@/lib/cli/args'
import { CLI_PROTOCOL_VERSION, CliError } from '@/lib/cli/protocol'

function usageErrorOf(args: string[]): CliError {
  try {
    parseCliArgs(args)
  } catch (error) {
    return error
  }
  throw new Error(`expected ${args.join(' ')} to be rejected`)
}

describe('extractCliArgs', () => {
  it('returns the arguments after a leading cli command', () => {
    expect(extractCliArgs(['cli', 'list-tables', '--schema', 'public'])).toEqual(['list-tables', '--schema', 'public'])
    expect(extractCliArgs(['cli'])).toEqual([])
  })

  it('skips launcher flags that come before cli', () => {
    // the linux launcher script prepends --no-sandbox, bks-flags.conf may add more
    expect(extractCliArgs(['--no-sandbox', 'cli', 'query', 'select 1'])).toEqual(['query', 'select 1'])
    expect(extractCliArgs(['--no-sandbox', '--ozone-platform-hint=auto', 'cli'])).toEqual([])
  })

  it('is null for a normal app launch', () => {
    expect(extractCliArgs([])).toBeNull()
    expect(extractCliArgs(['--no-sandbox'])).toBeNull()
    expect(extractCliArgs(['/home/me/data.db'])).toBeNull()
    // a file called cli opened as a positional after another positional is not the command
    expect(extractCliArgs(['postgres://localhost/db', 'cli'])).toBeNull()
  })
})

describe('parseCliArgs', () => {
  it('builds a list-tables request with a schema', () => {
    const result = parseCliArgs(['list-tables', '--schema', 'public', '-c', 'Prod'])
    expect(result.help).toBe(false)
    expect(result.format).toBe('json')
    expect(result.request).toEqual({
      version: CLI_PROTOCOL_VERSION,
      command: 'list-tables',
      args: { schema: 'public', connection: 'Prod' },
    })
  })

  it('accepts repeated and comma separated entity types', () => {
    expect(parseCliArgs(['list-entities', '-t', 'table,views']).request.args.entityTypes).toEqual(['table', 'view'])
    expect(
      parseCliArgs(['list-entities', '--entity-type', 'routine', '--entity-type', 'materialized-view']).request.args.entityTypes
    ).toEqual(['routine', 'materialized-view'])
    expect(parseCliArgs(['list-entities']).request.args.entityTypes).toBeUndefined()
  })

  it('rejects unknown entity types', () => {
    const error = usageErrorOf(['list-entities', '-t', 'sequence'])
    expect(error.code).toBe('USAGE')
    expect(error.message).toContain('sequence')
    expect(() => parseEntityTypes('')).toThrow()
  })

  it('splits schema.name for structure unless a schema is given explicitly', () => {
    expect(parseCliArgs(['structure', 'public.users']).request.args).toEqual({ schema: 'public', name: 'users' })
    expect(parseCliArgs(['structure', 'public.users', '--schema', 'other']).request.args).toEqual({
      schema: 'other',
      name: 'public.users',
    })
    expect(parseCliArgs(['structure', 'users']).request.args).toEqual({ name: 'users' })
  })

  it('keeps numeric looking names as strings', () => {
    expect(parseCliArgs(['structure', '2024']).request.args.name).toBe('2024')
    expect(parseCliArgs(['query', '1']).request.args.sql).toBe('1')
  })

  it('requires exactly one name for structure', () => {
    expect(usageErrorOf(['structure']).message).toContain('structure needs the name')
    expect(usageErrorOf(['structure', 'a', 'b']).message).toContain('one name')
  })

  it('joins unquoted sql words for query', () => {
    expect(parseCliArgs(['query', 'select', '*', 'from', 'users']).request.args.sql).toBe('select * from users')
    expect(parseCliArgs(['query', 'select 1']).request.args.sql).toBe('select 1')
  })

  it('reads sql from a file or stdin', () => {
    const fromFile = parseCliArgs(['query', '--file', 'report.sql'])
    expect(fromFile.sqlFile).toBe('report.sql')
    expect(fromFile.sqlFromStdin).toBe(false)
    expect(fromFile.request.args.sql).toBeUndefined()

    const fromStdin = parseCliArgs(['query', '-'])
    expect(fromStdin.sqlFromStdin).toBe(true)
    expect(fromStdin.sqlFile).toBeNull()

    expect(usageErrorOf(['query', 'select 1', '--file', 'x.sql']).message).toContain('not both')
    expect(usageErrorOf(['query']).message).toContain('query needs SQL')
  })

  it('handles help and missing commands', () => {
    expect(parseCliArgs(['--help']).help).toBe(true)
    expect(parseCliArgs(['help']).help).toBe(true)
    expect(parseCliArgs(['list-tables', '-h']).help).toBe(true)
    expect(usageErrorOf([]).message).toContain('No command')
    expect(CLI_USAGE).toContain('beekeeper-studio cli <command>')
  })

  it('rejects unknown commands and options', () => {
    expect(usageErrorOf(['frobnicate']).message).toContain('Unknown command "frobnicate"')
    expect(usageErrorOf(['list-tables', '--verbose']).message).toContain('Unknown option --verbose')
    expect(usageErrorOf(['connections', 'extra']).message).toContain('does not take any arguments')
  })

  it('validates the output format', () => {
    expect(parseCliArgs(['connections', '--format', 'markdown']).format).toBe('markdown')
    expect(parseCliArgs(['connections', '-f', 'md']).format).toBe('markdown')
    expect(usageErrorOf(['connections', '--format', 'xml']).message).toContain('Unknown format "xml"')
  })
})

describe('cliArgsFromProcessArgv', () => {
  it('skips the app path only when electron runs the default app', () => {
    expect(cliArgsFromProcessArgv(['/usr/bin/electron', '.', 'cli', 'connections'], true)).toEqual(['connections'])
    expect(cliArgsFromProcessArgv(['/opt/bks/beekeeper-studio-bin', '--no-sandbox', 'cli', 'connections'], false)).toEqual(['connections'])
    expect(cliArgsFromProcessArgv(['/opt/bks/beekeeper-studio-bin'], false)).toBeNull()
    expect(cliArgsFromProcessArgv([], false)).toBeNull()
  })
})
