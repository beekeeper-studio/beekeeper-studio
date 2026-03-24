import fs from 'fs'
import path from 'path'
import os from 'os'
import { DBeaverInstallation } from './types'

const DATA_DIR_NAMES = ['DBeaverData', 'DBeaver Enterprise', 'DBeaver Ultimate']

export function buildSearchPaths(): string[] {
  const home = os.homedir()
  const platform = process.platform
  const bases: string[] = []
  if (platform === 'linux') {
    for (const dirName of DATA_DIR_NAMES) bases.push(path.join(home, '.local', 'share', dirName))
    bases.push(path.join(home, '.var', 'app', 'io.dbeaver.DBeaverCommunity', 'data', 'DBeaverData'))
    bases.push(path.join(home, 'snap', 'dbeaver-ce', 'current', '.local', 'share', 'DBeaverData'))
  } else if (platform === 'darwin') {
    for (const dirName of DATA_DIR_NAMES) bases.push(path.join(home, 'Library', dirName))
  } else if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    for (const dirName of DATA_DIR_NAMES) bases.push(path.join(appData, dirName))
  }
  return bases
}

function findWorkspaces(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) return []
  try {
    return fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('workspace'))
      .map(e => path.join(baseDir, e.name))
  } catch { return [] }
}

function editionFromPath(basePath: string): string {
  if (basePath.includes('Enterprise')) return 'Enterprise'
  if (basePath.includes('Ultimate')) return 'Ultimate'
  if (basePath.includes('Flatpak') || basePath.includes('io.dbeaver')) return 'Community (Flatpak)'
  if (basePath.includes('snap')) return 'Community (Snap)'
  return 'Community'
}

export async function detectInstallations(): Promise<DBeaverInstallation[]> {
  const installations: DBeaverInstallation[] = []
  for (const basePath of buildSearchPaths()) {
    for (const workspace of findWorkspaces(basePath)) {
      const generalDir = path.join(workspace, 'General')
      const dbeaverDir = path.join(generalDir, '.dbeaver')
      if (!fs.existsSync(dbeaverDir)) continue
      const hasDataSources = fs.existsSync(path.join(dbeaverDir, 'data-sources.json')) ||
        fs.existsSync(path.join(dbeaverDir, '.dbeaver-data-sources.xml'))
      const scriptsDir = path.join(generalDir, 'Scripts')
      const hasScripts = fs.existsSync(scriptsDir) && fs.readdirSync(scriptsDir).some(f => f.endsWith('.sql'))
      if (hasDataSources || hasScripts) {
        installations.push({ path: dbeaverDir, edition: editionFromPath(basePath), hasDataSources, hasScripts })
      }
    }
  }
  return installations
}
