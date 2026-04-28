import { shell } from 'electron'
import rawLog from '@bksLogger'

const log = rawLog.scope('safeOpenExternal')

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Single trusted entry point for shell.openExternal in the main process.
 *
 * Other protocols (file:, javascript:, vbs:, ms-…:, etc.) can launch local
 * programs, so any URL that arrives from the renderer, a plugin, the utility
 * process, or a will-navigate event must pass through here. Direct calls to
 * shell.openExternal elsewhere are blocked by the no-restricted-syntax
 * ESLint rule (see .eslintrc.js).
 */
export function safeOpenExternal(url: unknown): boolean {
  if (typeof url !== 'string' || !url) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    log.warn('Refusing to open external URL — invalid URL:', url)
    return false
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    log.warn('Refusing to open external URL — disallowed protocol:', parsed.protocol)
    return false
  }
  shell.openExternal(parsed.toString())
  return true
}
