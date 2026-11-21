/** A workspace path supplied to a grouping projection in the switcher's display order. */
export interface GroupingWorkspace {
  readonly workspaceId: string
  readonly path: string
}

export type WorkspaceGroupNode =
  | { readonly kind: 'workspace'; readonly workspaceId: string; readonly children?: readonly WorkspaceGroupNode[] }
  | { readonly kind: 'directory'; readonly key: string; readonly title: string; readonly path: string; readonly children: readonly WorkspaceGroupNode[] }

export interface WorkspaceGrouping {
  readonly id: string
  readonly label: () => string
  readonly project: (workspaces: readonly GroupingWorkspace[]) => readonly WorkspaceGroupNode[]
}

export const FLAT = 'flat'
export const WORKSPACES = 'workspace'
export const WORKSPACE_TREE = 'workspace-tree'
// Keep the persisted key stable across package renames.
const preferenceKey = 'dsh-workspace-welcome-switcher.grouping'

export function createGroupingRegistry() {
  let snapshot: readonly WorkspaceGrouping[] = []
  const listeners = new Set<() => void>()
  const publish = (next: readonly WorkspaceGrouping[]) => {
    snapshot = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    register(grouping: WorkspaceGrouping) {
      if (!/^[a-z][a-z0-9-]*$/.test(grouping.id) || [FLAT, WORKSPACES, WORKSPACE_TREE].includes(grouping.id)
        || snapshot.some(entry => entry.id === grouping.id)) {
        throw new Error(`Invalid or already registered switcher grouping: ${grouping.id}`)
      }
      const entry = { ...grouping }
      publish([...snapshot, entry])
      return () => {
        if (snapshot.includes(entry)) publish(snapshot.filter(current => current !== entry))
      }
    },
  }
}

export function activeGrouping(id: string, catalog: readonly WorkspaceGrouping[], choosing: boolean): string {
  if (id === WORKSPACES || id === WORKSPACE_TREE || (!choosing && id === FLAT)
    || catalog.some(grouping => grouping.id === id)) return id
  return WORKSPACE_TREE
}

export function createGroupingPreferences(storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  let remembered = WORKSPACE_TREE
  try {
    const saved = storage().getItem(preferenceKey)
    if (saved && saved !== FLAT) remembered = saved
  } catch (error) {
    // The dialog still works with in-memory preferences when storage is unavailable.
  }
  return {
    initial(mode: 'sessions' | 'workspaces', catalog: readonly WorkspaceGrouping[]) {
      return mode === 'sessions' ? FLAT : activeGrouping(remembered, catalog, true)
    },
    remember(id: string) {
      if (id === FLAT) return
      remembered = id
      try {
        storage().setItem(preferenceKey, id)
      } catch (error) {
        // Retain the user's selection for this page lifetime.
      }
    },
  }
}
