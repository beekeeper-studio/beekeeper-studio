import * as path from 'path'
import * as fs from 'fs'
import rawLog from '@bksLogger'

const log = rawLog.scope('resolveTheme')

export async function resolveTheme(root: string, url: URL): Promise<Buffer | null> {
  const themePath = decodeURI(url.pathname)
  if (path.extname(themePath).toLowerCase() !== '.css') {
    return null
  }
  const fullPath = path.resolve(path.join(root, themePath))
  if (fullPath !== root && !fullPath.startsWith(root + path.sep)) {
    return null
  }
  try {
    return await fs.promises.readFile(fullPath)
  } catch (error) {
    if (error.code?.toLowerCase() !== 'enoent') {
      log.error("error reading", fullPath, error)
    }
    return null
  }
}
