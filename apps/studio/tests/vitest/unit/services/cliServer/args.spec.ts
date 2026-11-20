import { describe, it, expect } from 'vitest'
import { cliArgsFromProcessArgv, extractCliArgs } from '@/services/cliServer/args'

describe('extractCliArgs', () => {
  it('returns the arguments after a leading cli command', () => {
    expect(extractCliArgs(['cli', 'tables', '--schema', 'public'])).toEqual(['tables', '--schema', 'public'])
    expect(extractCliArgs(['cli'])).toEqual([])
  })

  it('skips launcher flags that come before cli', () => {
    // the linux launcher script prepends --no-sandbox, bks-flags.conf may add more
    expect(extractCliArgs(['--no-sandbox', 'cli', 'open-query-tab', 'select 1'])).toEqual(['open-query-tab', 'select 1'])
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

describe('cliArgsFromProcessArgv', () => {
  it('skips the app path only when electron runs the default app', () => {
    expect(cliArgsFromProcessArgv(['/usr/bin/electron', '.', 'cli', 'connections'], true)).toEqual(['connections'])
    expect(cliArgsFromProcessArgv(['/opt/bks/beekeeper-studio-bin', '--no-sandbox', 'cli', 'connections'], false)).toEqual(['connections'])
    expect(cliArgsFromProcessArgv(['/opt/bks/beekeeper-studio-bin'], false)).toBeNull()
    expect(cliArgsFromProcessArgv([], false)).toBeNull()
  })
})
