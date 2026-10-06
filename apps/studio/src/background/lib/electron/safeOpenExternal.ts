import { shell } from 'electron'
import rawLog from '@bksLogger'

const log = rawLog.scope('safeOpenExternal')

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Pure predicate — true iff `url` is a string that parses as an absolute
 * URL with an http(s) scheme. No side effects, no Electron deps; safe to
 * unit-test exhaustively.
 *
 * Other protocols (file:, javascript:, vbs:, smb:, data:, ms-…:, etc.) can
 * launch local programs and must never reach shell.openExternal.
 */
export function isSafeExternalUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url) return false
  try {
    const parsed = new URL(url)
    return ALLOWED_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Single trusted entry point for shell.openExternal in the main process.
 *
 * Any URL that arrives from the renderer, a plugin, the utility process,
 * or a will-navigate event must pass through here. Direct calls to
 * shell.openExternal elsewhere are blocked by the no-restricted-syntax
 * ESLint rule (see .eslintrc.js).
 */
export function safeOpenExternal(url: unknown): boolean {
  if (!isSafeExternalUrl(url)) {
    log.warn('Refusing to open external URL — invalid or disallowed protocol:', url)
    return false
  }
  shell.openExternal(url)
  return true
}
