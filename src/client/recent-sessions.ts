import type { SessionId } from './navigation-model'

const HISTORY_LIMIT = 32

/** Window-local visits to the displayed conversation, in most-recent-first order. */
export function createRecentSessions(openSession: (id: SessionId) => void) {
  let visits: SessionId[] = []
  let current: SessionId | undefined
  let available = (_id: SessionId) => false
  return {
    observe(id: SessionId | undefined, isAvailable: typeof available) {
      available = isAvailable
      current = id
      if (id !== undefined && available(id) && visits[0] !== id) {
        visits = [id, ...visits.filter(previous => previous !== id)].slice(0, HISTORY_LIMIT)
      }
    },
    previous() {
      const id = visits.find(candidate => candidate !== current && available(candidate))
      if (id === undefined) return undefined
      return () => { openSession(id) }
    },
  }
}
