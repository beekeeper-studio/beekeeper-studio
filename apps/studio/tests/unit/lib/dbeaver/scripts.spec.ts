import { findScripts } from '@/lib/dbeaver/scripts'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('DBeaver script discovery', () => {
  let tmpDir: string
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbeaver-scripts-')) })
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true }) })

  it('finds .sql files in the Scripts directory', async () => {
    const scriptsDir = path.join(tmpDir, 'Scripts')
    fs.mkdirSync(scriptsDir)
    fs.writeFileSync(path.join(scriptsDir, 'create_users.sql'), 'CREATE TABLE users (id INT);')
    fs.writeFileSync(path.join(scriptsDir, 'seed_data.sql'), 'INSERT INTO users VALUES (1);')
    fs.writeFileSync(path.join(scriptsDir, 'notes.txt'), 'not a sql file')
    const result = await findScripts(tmpDir)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.title).sort()).toEqual(['create_users', 'seed_data'])
    expect(result[0].text).toBeTruthy()
  })

  it('returns empty array when Scripts directory does not exist', async () => {
    const result = await findScripts(tmpDir)
    expect(result).toEqual([])
  })

  it('handles empty Scripts directory', async () => {
    fs.mkdirSync(path.join(tmpDir, 'Scripts'))
    const result = await findScripts(tmpDir)
    expect(result).toEqual([])
  })
})
