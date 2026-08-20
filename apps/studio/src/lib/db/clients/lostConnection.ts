import { ConnectionLostError } from '@/lib/errors'

/**
 * Shared helpers for the case where a database connection dies without saying so.
 *
 * A socket dropped by a firewall, a VPN or a suspended machine leaves both ends believing
 * it is still open, so nothing arrives: no result, no error, no close. Every pooled driver
 * Beekeeper uses treats that as an open connection with a slow answer, which is why each
 * of them needs the same three things -- a deadline on the request, a way to say "the
 * connection is gone" that the app can act on, and a teardown that finishes even when the
 * pool is waiting on a request that never will.
 */

/** How long to wait for a well-behaved pool close before forcing it. */
export const POOL_CLOSE_TIMEOUT_MS = 5000

/**
 * Wrap a promise with a JS-level deadline.
 *
 * Used both for driver calls with no timeout of their own and for pool teardown, where the
 * point is to stop waiting rather than to cancel anything: the original promise keeps
 * running, so callers that race it must handle its later settlement themselves.
 */
export function withDeadline<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer)) as Promise<T>
}

/**
 * Build the error that raises the reconnect prompt. `detail` should read as a complete
 * sentence: the prompt appends "Would you like to reconnect?" to it.
 */
export function lostConnection(detail: string, cause?: unknown): ConnectionLostError {
  return new ConnectionLostError(detail, cause === undefined ? undefined : { cause })
}
