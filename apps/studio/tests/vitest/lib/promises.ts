export type Outcome = "resolved" | "rejected" | "pending"

/**
 * How `p` looks after `ms`: settled one way or the other, or still pending.
 * Attaches handlers to `p`, so a late rejection never counts as unhandled.
 */
export function outcome(p: Promise<unknown>, ms: number): Promise<Outcome> {
  return new Promise<Outcome>((resolve) => {
    const timer = setTimeout(() => resolve("pending"), ms)
    p.then(
      () => { clearTimeout(timer); resolve("resolved") },
      () => { clearTimeout(timer); resolve("rejected") },
    )
  })
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Polls `check` every `every` ms until it holds or `ms` elapses. */
export async function eventually(check: () => boolean | Promise<boolean>, ms: number, every = 100): Promise<boolean> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await check()) return true
    await sleep(every)
  }
  return check()
}
