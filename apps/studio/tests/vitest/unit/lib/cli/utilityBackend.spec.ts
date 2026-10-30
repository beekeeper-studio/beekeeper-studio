import { describe, it, expect, vi } from 'vitest'
import { resolveCliEnabled } from '@/lib/cli/utilityBackend'
import { CliOpenConnection } from '@/lib/cli/commands'

function connection(config: Record<string, any> | null): CliOpenConnection {
  return { id: 'sid', client: {} as any, database: null, config: config as any }
}

describe('resolveCliEnabled', () => {
  it('is true for every connection when the ini setting is on', async () => {
    const findSaved = vi.fn()
    expect(await resolveCliEnabled(connection({ id: 1, cliEnabled: false }), { enableForAll: true, findSaved })).toBe(true)
    expect(await resolveCliEnabled(connection(null), { enableForAll: true, findSaved })).toBe(true)
    expect(findSaved).not.toHaveBeenCalled()
  })

  it('uses the latest saved copy of a local saved connection', async () => {
    const findSaved = vi.fn(async () => ({ cliEnabled: true }))
    const stale = connection({ id: 7, workspaceId: -1, cliEnabled: false })
    expect(await resolveCliEnabled(stale, { enableForAll: false, findSaved })).toBe(true)
    expect(findSaved).toHaveBeenCalledWith(7)

    const disabledNow = vi.fn(async () => ({ cliEnabled: false }))
    expect(await resolveCliEnabled(connection({ id: 7, cliEnabled: true }), { enableForAll: false, findSaved: disabledNow })).toBe(false)
  })

  it('falls back to the connected config when the saved row is gone', async () => {
    const findSaved = vi.fn(async () => null)
    expect(await resolveCliEnabled(connection({ id: 7, cliEnabled: true }), { enableForAll: false, findSaved })).toBe(true)
    expect(await resolveCliEnabled(connection({ id: 7, cliEnabled: false }), { enableForAll: false, findSaved })).toBe(false)
  })

  it('does not look up cloud workspace connections locally', async () => {
    const findSaved = vi.fn(async () => ({ cliEnabled: true }))
    expect(await resolveCliEnabled(connection({ id: 7, workspaceId: 42, cliEnabled: false }), { enableForAll: false, findSaved })).toBe(false)
    expect(findSaved).not.toHaveBeenCalled()
  })

  it('is false for unsaved connections without the flag and for missing configs', async () => {
    const findSaved = vi.fn()
    expect(await resolveCliEnabled(connection({ connectionType: 'sqlite' }), { enableForAll: false, findSaved })).toBe(false)
    expect(await resolveCliEnabled(connection({ connectionType: 'sqlite', cliEnabled: true }), { enableForAll: false, findSaved })).toBe(true)
    expect(await resolveCliEnabled(connection(null), { enableForAll: false, findSaved })).toBe(false)
    expect(findSaved).not.toHaveBeenCalled()
  })
})
