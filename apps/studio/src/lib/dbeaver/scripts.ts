import fs from 'fs'
import path from 'path'
import { ParsedQuery } from './types'

export async function findScripts(generalDir: string): Promise<ParsedQuery[]> {
  const scriptsDir = path.join(generalDir, 'Scripts')
  if (!fs.existsSync(scriptsDir)) return []
  const results: ParsedQuery[] = []
  try {
    for (const file of fs.readdirSync(scriptsDir)) {
      if (!file.endsWith('.sql')) continue
      const filePath = path.join(scriptsDir, file)
      try {
        if (!fs.statSync(filePath).isFile()) continue
        const text = fs.readFileSync(filePath, 'utf8')
        if (!text.trim()) continue
        results.push({ title: path.basename(file, '.sql'), text, associatedConnectionId: null })
      } catch { /* skip */ }
    }
  } catch { /* dir unreadable */ }
  return results
}
