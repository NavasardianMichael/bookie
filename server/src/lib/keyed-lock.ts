/**
 * An in-process mutex per key: calls with the same key run one after another, in order;
 * different keys never wait on each other. Imports nothing, so a unit test reaches it.
 *
 * Built for billing's read-modify-write (`routes/billing.ts`): a change reads the
 * subscription's items from Paddle and writes back the whole list, and Paddle has no
 * If-Match — two quick clicks would each read the same list, and the second write would undo
 * the first. Per-process, like `lib/rateLimit.ts`: enough while one API process is the design
 * (server/CLAUDE.md). A second instance needs `pg_advisory_xact_lock` instead.
 */
export const createKeyedLock = () => {
  const tails = new Map<string, Promise<unknown>>()

  return async <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const previous = tails.get(key) ?? Promise.resolve()
    // A failure of the call ahead must not fail this one; it already reached its own caller.
    const run = previous.catch(() => undefined).then(task)
    const tail = run.catch(() => undefined)
    tails.set(key, tail)

    try {
      return await run
    } finally {
      if (tails.get(key) === tail) tails.delete(key)
    }
  }
}
