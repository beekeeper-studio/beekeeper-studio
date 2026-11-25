import { realpathSync, statSync } from 'fs'
import path from 'path'

function real(p: string): string | null {
  try {
    return realpathSync(p)
  } catch {
    return null
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

// An AppImage runs from a temporary mount ($APPDIR) that is removed when this
// process exits, so a restart has to relaunch the AppImage file ($APPIMAGE)
// rather than the binary inside the mount. Trust APPIMAGE only when this process
// really runs from inside APPDIR and APPIMAGE names an existing regular file:
// apps started from another AppImage inherit both variables, and the
// AppImageLauncher rewrite in update_manager.ts can leave APPIMAGE as the text
// "undefined". APPDIR is resolved first, so symlinked or doubled-slash paths
// still match. Any failure falls back to a plain relaunch.
export function appImageRelaunchOptions(): { execPath: string, args: string[] } | null {
  const appImage = process.env.APPIMAGE
  const appDir = process.env.APPDIR
  if (!appImage || !appDir || !path.isAbsolute(appImage) || !path.isAbsolute(appDir)) return null
  const mount = real(appDir)
  if (!mount || mount === path.parse(mount).root) return null
  const execPath = real(process.execPath) ?? process.execPath
  if (!execPath.startsWith(mount + path.sep)) return null
  if (!isFile(appImage)) return null
  return { execPath: appImage, args: process.argv.slice(1) }
}
