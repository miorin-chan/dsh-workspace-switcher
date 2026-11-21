import type { SessionId } from './navigation-model'

export type OrderBy = 'updated' | 'manual'
export type ArchiveFilter = 'hide-archived' | 'show-archived' | 'only-archived'
export type SessionOrders = Readonly<Record<string, readonly string[]>>
export const FLAT_ORDER = 'flat'
export const UNGROUPED_ORDER = 'ungrouped'

const key = 'dsh-workspace-welcome-switcher.session-view'
interface ViewPreferences {
  readonly orderBy: OrderBy
  readonly archiveFilter: ArchiveFilter
  readonly orders: SessionOrders
}

export function isOrderBy(value: unknown): value is OrderBy {
  return value === 'updated' || value === 'manual'
}

export function isArchiveFilter(value: unknown): value is ArchiveFilter {
  return value === 'hide-archived' || value === 'show-archived' || value === 'only-archived'
}

export function createViewPreferences(storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  let value: ViewPreferences = { orderBy: 'updated', archiveFilter: 'hide-archived', orders: {} }
  try {
    const saved: unknown = JSON.parse(storage().getItem(key) ?? 'null')
    if (saved !== null && typeof saved === 'object') {
      const { orderBy, archiveFilter, orders } = saved as Partial<Record<keyof ViewPreferences, unknown>>
      const validOrders: SessionOrders = orders !== null && typeof orders === 'object' && !Array.isArray(orders)
        ? Object.fromEntries(Object.entries(orders).filter((entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every(id => typeof id === 'string'))) : {}
      value = {
        orderBy: isOrderBy(orderBy) ? orderBy : value.orderBy,
        archiveFilter: isArchiveFilter(archiveFilter) ? archiveFilter : value.archiveFilter,
        orders: validOrders,
      }
    }
  } catch (error) {
    // Start with defaults when storage is unavailable or damaged.
  }
  return {
    get: () => value,
    set(next: ViewPreferences) {
      value = next
      try { storage().setItem(key, JSON.stringify(next)) } catch (error) {
        // Keep the current page's preferences if storage is unavailable.
      }
    },
  }
}

/** Apply a visible move to the complete account, including rows the filter hides. */
export function moveSession(
  order: readonly string[], from: SessionId, to: SessionId, side?: 'before' | 'after',
): readonly string[] {
  const fromIndex = order.indexOf(from)
  const toIndex = order.indexOf(to)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return order
  const next = order.filter(id => id !== from)
  const after = side === undefined ? fromIndex < toIndex : side === 'after'
  const index = next.indexOf(to) + Number(after)
  if (index === fromIndex) return order
  next.splice(index, 0, from)
  return next
}
