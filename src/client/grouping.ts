import type { SwitcherMode } from './shortcuts'

export const FLAT = 'flat'
export const WORKSPACES = 'workspace'
export const WORKSPACE_TREE = 'workspace-tree'
export type GroupBy = typeof FLAT | typeof WORKSPACES | typeof WORKSPACE_TREE

// Keep the persisted key stable across package renames.
const preferenceKey = 'dsh-workspace-welcome-switcher.grouping'

export function isGrouping(id: string): id is GroupBy {
  return id === FLAT || id === WORKSPACES || id === WORKSPACE_TREE
}

export function createGroupingPreferences(storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  let remembered: Exclude<GroupBy, typeof FLAT> = WORKSPACE_TREE
  try {
    const saved = storage().getItem(preferenceKey)
    if (saved === WORKSPACES || saved === WORKSPACE_TREE) remembered = saved
  } catch {
    // The dialog still works with in-memory preferences when storage is unavailable.
  }
  return {
    initial(mode: SwitcherMode): GroupBy {
      return mode === 'sessions' ? FLAT : remembered
    },
    remember(id: GroupBy) {
      if (id === FLAT) return
      remembered = id
      try {
        storage().setItem(preferenceKey, id)
      } catch {
        // Retain the user's selection for this page lifetime.
      }
    },
  }
}
