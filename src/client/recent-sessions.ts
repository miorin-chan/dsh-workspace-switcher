import type { SessionId } from './navigation-model'

const HISTORY_LIMIT = 32

export interface RecentSelection {
  readonly ids: readonly SessionId[]
  readonly index: number
  readonly confirmOnControlRelease: boolean
  readonly failed: boolean
}

/** Window-local visits and the frozen order for one keyboard gesture. */
export function createRecentSessions(openSession: (id: SessionId) => void) {
  let visits: SessionId[] = []
  let current: SessionId | undefined
  let available = (_id: SessionId) => false
  let selection: RecentSelection | null = null
  const listeners = new Set<() => void>()
  const publish = (next: RecentSelection | null) => {
    selection = next
    for (const listener of listeners) listener()
  }
  const cancel = () => { if (selection !== null) publish(null) }
  return {
    getSnapshot: () => selection,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    observe(id: SessionId | undefined, isAvailable: typeof available) {
      available = isAvailable
      if (current !== id) cancel()
      current = id
      if (id !== undefined && available(id) && visits[0] !== id) {
        visits = [id, ...visits.filter(previous => previous !== id)].slice(0, HISTORY_LIMIT)
      }
      if (selection === null) return
      const nextIndex = selection.ids.findIndex(candidate => candidate !== current && available(candidate))
      if (nextIndex < 0) cancel()
      else if (!available(selection.ids[selection.index])) {
        // Keep the surviving rows in place and require an explicit choice after a target disappears.
        publish({ ...selection, index: nextIndex, confirmOnControlRelease: false })
      }
    },
    canStep: () => visits.some(id => id !== current && available(id)),
    step(direction: 1 | -1, confirmOnControlRelease: boolean) {
      const ids = selection?.ids ?? visits.filter(available)
      if (ids.length === 0) return
      const start = selection?.index ?? (current === undefined ? -1 : ids.indexOf(current))
      const initial = start >= 0 ? start : direction === 1 ? -1 : 0
      for (let offset = 1; offset <= ids.length; offset++) {
        const index = (initial + direction * offset + ids.length * 2) % ids.length
        if (available(ids[index])) {
          publish({ ids, index, confirmOnControlRelease, failed: false })
          return
        }
      }
    },
    confirm(id = selection?.ids[selection.index]) {
      if (selection === null) return
      if (id === undefined || !available(id) || id === current) {
        cancel()
        return
      }
      // The navigation itself may synchronously publish a new selection.
      const pending = selection
      try {
        openSession(id)
        cancel()
      } catch {
        if (selection === pending) publish({ ...pending, confirmOnControlRelease: false, failed: true })
      }
    },
    cancel,
  }
}
