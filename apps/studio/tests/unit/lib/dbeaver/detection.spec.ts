import { buildSearchPaths } from '@/lib/dbeaver/detection'
import os from 'os'

describe('DBeaver detection', () => {
  it('returns platform-appropriate search paths', () => {
    const paths = buildSearchPaths()
    expect(paths.length).toBeGreaterThan(0)
    for (const p of paths) { expect(p).toMatch(/DBeaver/i) }
  })

  it('includes home directory in all paths', () => {
    const home = os.homedir()
    const paths = buildSearchPaths()
    for (const p of paths) { expect(p.startsWith(home) || p.includes('%APPDATA%')).toBe(true) }
  })
})
