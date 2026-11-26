import { app } from 'electron'
import { spawn } from 'child_process'
import { mkdirSync, statSync } from 'fs'
import os from 'os'
import path from 'path'

// AppImage runtime and launcher environment, with sources:
// - The type-2 runtime sets APPIMAGE, ARGV0, APPDIR and OWD for the app inside
//   the image (https://github.com/AppImage/type2-runtime/blob/master/src/runtime/runtime.c).
//   They describe the current mount and are stale for the next launch: the
//   runtime sets fresh values itself, so they are dropped here.
// - AppImageLauncher's binfmt bypass adds TARGET_APPIMAGE, REDIRECT_APPIMAGE and
//   an LD_PRELOAD entry
//   (https://github.com/TheAssassin/AppImageLauncher/blob/master/src/binfmt-bypass/lib.cpp
//   and src/binfmt-bypass/preload.c). Dropping them keeps the child from being
//   redirected at this AppImage when binfmt is not registered for it.
// - DESKTOPINTEGRATION and APPIMAGE_EXTRACT_AND_RUN are kept on purpose: the
//   first preserves platformInfo.isAppImageLauncher for the updater, the second
//   preserves extract-and-run launches.
const RUNTIME_ENV_VARS = ['APPDIR', 'APPIMAGE', 'ARGV0', 'OWD', 'TARGET_APPIMAGE', 'REDIRECT_APPIMAGE']

// Search-path variables that can point inside the old mount or extraction dir.
const PATH_LIST_VARS = ['LD_LIBRARY_PATH', 'PATH', 'XDG_DATA_DIRS', 'GSETTINGS_SCHEMA_DIR']

// AppImageLauncher preloads libbinfmt-bypass-preload*.so (installed next to the
// binfmt-bypass binary) or writes a /tmp/appimagelauncher-preload-XXXXXX.so temp
// file. Only that entry is removed from LD_PRELOAD; other preloads are kept.
function isAppImageLauncherPreload(entry: string): boolean {
  const base = path.basename(entry)
  return base.includes('appimagelauncher-preload-') || base.includes('binfmt-bypass-preload')
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

// Copy of env safe to hand to a relaunched AppImage. Never mutates env.
export function buildRelaunchEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = { ...env }
  for (const name of RUNTIME_ENV_VARS) delete clean[name]

  if (clean.LD_PRELOAD) {
    const kept = clean.LD_PRELOAD.split(path.delimiter).filter(
      (entry) => entry && !isAppImageLauncherPreload(entry)
    )
    if (kept.length > 0) clean.LD_PRELOAD = kept.join(path.delimiter)
    else delete clean.LD_PRELOAD
  }

  // APPDIR is the runtime's mount point (<tmp>/.mount_*) or extract dir
  // (<tmp>/appimage_extracted_<md5>); entries equal to it or below it are stale.
  const mountDir = env.APPDIR?.replace(/\/+$/, '')
  if (mountDir && mountDir !== path.parse(mountDir).root) {
    for (const name of PATH_LIST_VARS) {
      const value = clean[name]
      if (!value) continue
      const kept = value.split(path.delimiter).filter(
        (entry) => entry && entry !== mountDir && !entry.startsWith(`${mountDir}/`)
      )
      if (kept.length > 0) clean[name] = kept.join(path.delimiter)
      else delete clean[name]
    }
  }
  return clean
}

// update_manager's AppImageLauncher rewrite can leave APPIMAGE relative or set
// to the text "undefined"; ARGV0 (what the runtime was invoked as) is the
// fallback. Only absolute paths to existing regular files are trusted.
export function resolveAppImagePath(env: NodeJS.ProcessEnv): string | null {
  for (const candidate of [env.APPIMAGE, env.ARGV0]) {
    if (candidate && path.isAbsolute(candidate) && isFile(candidate)) return candidate
  }
  return null
}

// The type-2 runtime FUSE-mounts under <tmp>/.mount_* but extract-and-run
// extracts under <tmp>/appimage_extracted_<md5> (runtime.c
// build_mount_point and the APPIMAGE_EXTRACT_AND_RUN branch).
function isExtractAndRun(env: NodeJS.ProcessEnv): boolean {
  const appDir = env.APPDIR?.replace(/\/+$/, '')
  return !appDir || !path.basename(appDir).startsWith('.mount_')
}

// The runtime extracts to <TMPDIR>/appimage_extracted_<md5 of the file> — the
// same path the instance being replaced used, and its runtime deletes that tree
// as soon as this instance exits. A relaunch into the same dir races that
// cleanup, so the child gets a private TMPDIR; the ".bks-relaunch-" component is
// stripped again on the next restart to keep the path flat.
function extractAndRunTmpBase(env: NodeJS.ProcessEnv): string {
  const root = (env.TMPDIR || os.tmpdir()).replace(/\/\.bks-relaunch-[^/]*$/, '') || '/'
  const dir = path.join(root, `.bks-relaunch-${process.pid}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

// Replaces app.relaunch() on AppImage. Electron's relauncher helper is started
// through base::LaunchProcess, which sets PR_SET_NO_NEW_PRIVS, and the flag is
// inherited by everything it launches — the new runtime's setuid fusermount
// then cannot mount the image ("Cannot mount AppImage"). Spawning the AppImage
// file directly goes through binfmt/AppRun like a normal launch instead.
export function spawnAppImage(appImagePath: string, args: string[], env: NodeJS.ProcessEnv) {
  const childEnv = buildRelaunchEnv(env)
  let childArgs = args
  if (isExtractAndRun(env)) {
    if (!childArgs.includes('--appimage-extract-and-run')) {
      childArgs = [...childArgs, '--appimage-extract-and-run']
    }
    try {
      childEnv.TMPDIR = extractAndRunTmpBase(env)
    } catch {
      // no writable TMPDIR: keep the inherited one
    }
  }
  const cwd = env.OWD && isDirectory(env.OWD) ? env.OWD : os.homedir()
  const child = spawn(appImagePath, childArgs, {
    detached: true,
    stdio: 'ignore',
    env: childEnv,
    cwd,
  })
  child.on('error', () => {
    // the old instance is exiting either way; a failed spawn just means no restart
  })
  child.unref()
  return child
}

function performRelaunch(): void {
  const appImage = resolveAppImagePath(process.env)
  if (appImage) {
    try {
      spawnAppImage(appImage, process.argv.slice(1), process.env)
      return
    } catch {
      // fall through to Electron's relauncher
    }
  }
  app.relaunch()
}

// app:restart calls app.exit(), which emits no will-quit, so the new instance
// must be spawned before exiting.
export function relaunchNow(): void {
  performRelaunch()
}

let pendingRelaunch = false
let willQuitListener: (() => void) | null = null

function onWillQuit(): void {
  willQuitListener = null
  if (!pendingRelaunch) return
  pendingRelaunch = false
  performRelaunch()
}

// Help > Restart calls app.quit(), which can still be cancelled (WindowCloseGuard
// prevents window closes that would end the quit). The spawn waits for will-quit
// so a cancelled quit leaves the running app untouched.
export function relaunchOnQuit(): void {
  pendingRelaunch = true
  if (!willQuitListener) {
    willQuitListener = onWillQuit
    app.once('will-quit', willQuitListener)
  }
}

export function cancelPendingRelaunch(): void {
  pendingRelaunch = false
  if (willQuitListener) {
    const listener = willQuitListener
    willQuitListener = null
    app.removeListener('will-quit', listener)
  }
}
