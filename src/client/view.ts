/**
 * The picker: the shadowing hero chooser with its compact popover and the
 * expanded dialog. All data reads arrive as hook seats; all writes go through
 * the injected Host actions.
 */

import type { ReactNode, RefObject } from 'react'
import * as React from 'react'

import type {
  WorkspaceId, WorkspaceSnapshot, WorkspaceView,
} from '@deepseek-ai/dsh-api-workspace-controller/client'

import type { TranslateSeat } from './labels'
import {
  SHORTLIST, buildRows, filterRows, type SessionSummary, type WorkspaceRow,
} from './model'
import { SwitcherDialog, trapTab } from './dialog'
import { createPortal } from './portal'
import { CSS } from './styles'
import {
  AddWorkspaceButton, EmptyState, ErrorBanner, SearchField, SectionHeader, Skeleton, WorkspaceRowButton,
} from './components'
import {
  ChevronRightGlyph, GridGlyph,
} from './glyphs'

const h = React.createElement
const {
  useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  useSyncExternalStore,
} = React

/**
 * Session catalog fields this module reads. Internal shape, verified against
 * 0.2.2-rc.5: the catalog hook is a standard share without a published type in
 * the packages this bundle types against.
 */
export interface SessionCatalog {
  readonly byId?: Readonly<Record<string, SessionSummary>>
}

/** Selector hook over an external store snapshot. */
export type SnapshotHook<Snapshot> = <Selected>(selector: (snapshot: Snapshot) => Selected) => Selected

/**
 * The keyboard-event fields this handler reads. React's synthetic keyboard type
 * omits `isComposing`; probing the native event and the legacy `keyCode` keeps
 * IME confirmation from choosing a Workspace.
 */
interface KeyEventLike {
  readonly nativeEvent?: { readonly isComposing?: boolean } | undefined
  readonly isComposing?: boolean | undefined
  readonly keyCode: number
  readonly key: string
  readonly target: EventTarget | null
  readonly shiftKey: boolean
  preventDefault(): void
  stopPropagation(): void
}

/** Fixed-position geometry of the compact popover. */
interface Placement {
  readonly left: number
  readonly width: number
  readonly maxHeight: number
  readonly top?: number | undefined
  readonly bottom?: number | undefined
}

/** Props the picker reads: the hero owner share, standard hooks, and injected Host actions. */
export interface WorkspacePickerProps {
  readonly open: boolean
  readonly anchorRef?: RefObject<HTMLElement> | undefined
  readonly selectedId?: WorkspaceId | undefined
  readonly onPick: (workspaceId: WorkspaceId) => void
  readonly onClose: () => void
  /** Locale seat of this bundle's dictionary. */
  readonly t: TranslateSeat
  /** Workspace registry selector hook; a missing standard share degrades to an empty list. */
  readonly useWorkspaces?: SnapshotHook<WorkspaceSnapshot> | undefined
  /** Session catalog selector hook; a missing standard share falls back to Workspace stamps. */
  readonly useSessions?: SnapshotHook<SessionCatalog> | undefined
  /** Occupancy of the hero's directory-flow hole; missing means no add action. */
  readonly useDirectoryFlow?: SnapshotHook<boolean> | undefined
  /** Host-native folder chooser. */
  readonly pickDirectory?: (() => Promise<string | null | undefined>) | undefined
  /** Adopt a picked path as a real Workspace. */
  readonly createWorkspace?: ((input: { path: string }) => Promise<WorkspaceView | null | undefined>) | undefined
  /** Whether the connected Host runs on this machine. */
  readonly localHost?: boolean | undefined
}

const EMPTY_WORKSPACES: WorkspaceSnapshot = {
  items: [],
  archivedSessionIds: [],
  pinnedSessionIds: [],
  state: 'idle',
  phase: 'ready',
  error: null,
}
const EMPTY_SESSIONS: SessionCatalog = { byId: {} }
const NOOP_SUBSCRIBE = (): (() => void) => () => {}

/**
 * A stand-in selector hook for a missing standard share. It still runs one
 * external-store hook, so the component's hook order never changes when a
 * standard provider appears or disappears.
 * @param snapshot - constant value.
 * @param selector - selector to apply.
 * @returns the selected constant.
 */
function useEmptySnapshot<Snapshot, Selected>(
  snapshot: Snapshot,
  selector: (value: Snapshot) => Selected,
): Selected {
  useSyncExternalStore(NOOP_SUBSCRIBE, () => snapshot, () => snapshot)
  return selector(snapshot)
}

/**
 * The shadowing hero picker: compact popover plus the expanded chooser.
 * @param props - owner share, standard hooks, injected actions, locale seat.
 * @returns portal content.
 */
export function WorkspacePicker(props: WorkspacePickerProps): ReactNode {
  const {
    open, anchorRef, selectedId, onPick, onClose, t,
    useWorkspaces, useSessions, useDirectoryFlow, pickDirectory, createWorkspace, localHost,
  } = props

  const useWorkspaceRows: SnapshotHook<WorkspaceSnapshot> = typeof useWorkspaces === 'function'
    ? useWorkspaces
    : selector => useEmptySnapshot(EMPTY_WORKSPACES, selector)
  const useSessionRows: SnapshotHook<SessionCatalog> = typeof useSessions === 'function'
    ? useSessions
    : selector => useEmptySnapshot(EMPTY_SESSIONS, selector)
  const useFlow: SnapshotHook<boolean> = typeof useDirectoryFlow === 'function'
    ? useDirectoryFlow
    : selector => useEmptySnapshot(false, selector)

  const snapshot = useWorkspaceRows(state => state)
  const sessionState = useSessionRows(state => state)
  const flowAvailable = useFlow(value => value === true)

  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const closedRef = useRef(false)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const listId = 'wsp-list-' + uid

  const rows = useMemo(
    () => buildRows(snapshot.items, sessionState.byId, t('defaultName')),
    [snapshot.items, sessionState.byId, t],
  )
  const filtered = useMemo(() => filterRows(rows, query), [rows, query])
  const compactRows = filtered.slice(0, SHORTLIST)
  const visibleRows = expanded ? filtered : compactRows
  // No row is highlighted until the user points at one, moves the keyboard
  // highlight, or types a query. Opening the picker and pressing Enter must
  // not silently select the most recent Workspace.
  const activeRow = visibleRows.find(row => row.id === activeId)
    ?? (query.trim() === '' ? undefined : visibleRows[0])
  const activeIndex = activeRow === undefined ? -1 : visibleRows.indexOf(activeRow)
  const optionId = (index: number): string => 'wsp-opt-' + uid + '-' + index

  const pending = snapshot.phase !== 'ready' && snapshot.items.length === 0
  const listError = snapshot.state === 'error'
  const listRendered = !pending && filtered.length > 0 && !(listError && rows.length === 0)
  // The Host's native folder chooser is local-only; a remote or SSH-forwarded
  // Host is served by the in-app browse composition, whose interaction this
  // entry cannot render. Do not offer an action that can only fail there.
  const canAdd = localHost === true
    && flowAvailable
    && typeof pickDirectory === 'function'
    && typeof createWorkspace === 'function'

  // Reset transient state while closed, and hand focus back to the trigger
  // after a dismissal. Resetting while closed keeps the next open frame clean.
  useEffect(() => {
    if (open) {
      wasOpen.current = true
      closedRef.current = false
      setNow(Date.now())
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    closedRef.current = true
    setQuery('')
    setExpanded(false)
    setActiveId(null)
    setPlacement(null)
    setError(null)
    setBusy(false)
    const anchor = anchorRef && anchorRef.current
    if (anchor && typeof anchor.focus === 'function') anchor.focus({ preventScroll: true })
  }, [open, anchorRef])

  // A host-side adoption that finishes after the owner unmounts must not
  // navigate the next screen.
  useEffect(() => () => { closedRef.current = true }, [])

  // Keep relative labels honest while the surface stays open.
  useEffect(() => {
    if (!open) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [open])

  // Focus the search field on open and whenever the compact/dialog surface swaps.
  useLayoutEffect(() => {
    if (!open) return undefined
    const frame = window.requestAnimationFrame(() => {
      const input = inputRef.current
      if (input) input.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, expanded])

  // Anchor the compact popover under the chip, clamped to the viewport, and
  // follow scrolls and resizes while it is open.
  useLayoutEffect(() => {
    if (!open || expanded) return undefined
    let frame = 0
    const update = (): void => {
      const anchor = anchorRef && anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      // Same geometry as the host Menu card: 12px viewport gutters and a
      // 4px gap under the trigger.
      const width = Math.min(360, window.innerWidth - 24)
      const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
      const below = window.innerHeight - rect.bottom >= 300 || rect.top < 300
      const available = below
        ? window.innerHeight - rect.bottom - 16
        : rect.top - 16
      const maxHeight = Math.max(180, Math.min(420, available))
      const next: Placement = below
        ? { left, width, maxHeight, top: rect.bottom + 4 }
        : { left, width, maxHeight, bottom: window.innerHeight - rect.top + 4 }
      setPlacement((previous: Placement | null) => (
        previous !== null
        && previous.left === next.left
        && previous.width === next.width
        && previous.top === next.top
        && previous.bottom === next.bottom
        && previous.maxHeight === next.maxHeight
      ) ? previous : next)
    }
    const schedule = (): void => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open, expanded, anchorRef])

  // Follow the keyboard highlight inside a long list.
  useEffect(() => {
    if (!open) return
    const root = panelRef.current
    if (!root) return
    const active = root.querySelector('[data-active="true"]')
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [open, expanded, activeRow && activeRow.id])

  const requestClose = useCallback(() => {
    closedRef.current = true
    onClose()
  }, [onClose])

  const choose = useCallback((row: WorkspaceRow) => {
    if (busy) return
    onPick(row.id)
    onClose()
  }, [busy, onPick, onClose])

  const addWorkspace = useCallback(async () => {
    if (busy || !canAdd || pickDirectory === undefined || createWorkspace === undefined) return
    setBusy(true)
    setError(null)
    try {
      const path = await pickDirectory()
      if (closedRef.current || path === null || path === undefined || path === '') return
      const workspace = await createWorkspace({ path })
      if (closedRef.current) return
      if (workspace && workspace.workspaceId !== undefined) {
        onPick(workspace.workspaceId)
        onClose()
      }
    } catch (reason) {
      if (!closedRef.current) setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (!closedRef.current) setBusy(false)
    }
  }, [busy, canAdd, pickDirectory, createWorkspace, onPick, onClose])

  /**
   * Shared key handling: Escape steps back, arrows move the highlight,
   * Enter opens the highlighted row from the search field, Tab stays inside
   * the dialog.
   * @param event - React keyboard event.
   */
  const onKeyDown = (event: KeyEventLike): void => {
    // Enter that commits an IME candidate must not choose a workspace.
    if (event.nativeEvent?.isComposing === true || event.isComposing === true || event.keyCode === 229) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (expanded) setExpanded(false)
      else requestClose()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (visibleRows.length === 0) return
      event.preventDefault()
      const next = event.key === 'ArrowDown'
        ? (activeIndex < 0 ? 0 : Math.min(visibleRows.length - 1, activeIndex + 1))
        : (activeIndex < 0 ? visibleRows.length - 1 : Math.max(0, activeIndex - 1))
      setActiveId(visibleRows[next].id)
      return
    }
    if (event.key === 'Enter' && event.target === inputRef.current) {
      if (activeRow === undefined) return
      event.preventDefault()
      choose(activeRow)
      return
    }
    trapTab(event, panelRef.current)
  }

  if (!open) return null
  if (!expanded && placement === null) return null

  /**
   * Render one ordered run of rows with stable option ids.
   * @param run - rows to render.
   * @param offset - index of the first row in the visible list.
   * @returns row elements.
   */
  const renderRows = (run: readonly WorkspaceRow[], offset: number): ReactNode[] => run.map((row, index) => h(WorkspaceRowButton, {
    key: row.id,
    row,
    id: optionId(offset + index),
    active: activeRow !== undefined && activeRow.id === row.id,
    selected: selectedId === row.id,
    now,
    t,
    compact: !expanded,
    busy,
    onChoose: choose,
    onHover: setActiveId,
  }))

  let body: ReactNode
  if (listError && rows.length === 0) {
    body = h(EmptyState, { title: t('error.title'), body: t('error.body') })
  } else if (pending) {
    body = h(React.Fragment, null,
      h('span', { className: 'wsp-sr-only', role: 'status' }, t('loading')),
      h(Skeleton, { rows: expanded ? 6 : 4 }),
    )
  } else if (rows.length === 0) {
    body = h(EmptyState, {
      title: t('empty.noWorkspacesTitle'),
      body: canAdd ? t('empty.noWorkspacesBody') : t('empty.noAddBody'),
    })
  } else if (filtered.length === 0) {
    body = h(EmptyState, { title: t('empty.title'), body: t('empty.body') })
  } else if (expanded) {
    const showRecent = query.trim() === '' && rows.length > SHORTLIST + 1
    const recentRows = showRecent ? filtered.slice(0, SHORTLIST) : []
    const restRows = showRecent ? filtered.slice(SHORTLIST) : filtered
    body = h('div', { role: 'listbox', id: listId, 'aria-label': t('list.label'), className: 'wsp-list' },
      showRecent ? h(SectionHeader, { key: 'recent', label: t('recent'), count: recentRows.length }) : null,
      showRecent ? renderRows(recentRows, 0) : null,
      h(SectionHeader, {
        key: 'rest',
        label: showRecent ? t('others') : query.trim() === '' ? t('all') : t('results'),
        count: restRows.length,
      }),
      renderRows(restRows, showRecent ? SHORTLIST : 0),
    )
  } else {
    const searching = query.trim() !== ''
    body = h('div', { role: 'listbox', id: listId, 'aria-label': t('list.label'), className: 'wsp-list' },
      h(SectionHeader, {
        key: 'head',
        label: searching ? t('results') : t('recent'),
        count: searching ? filtered.length : 0,
      }),
      renderRows(compactRows, 0),
    )
  }

  const banner = error === null ? null : h(ErrorBanner, {
    label: t('addFailed'),
    message: error,
    dismiss: t('dismiss'),
    onDismiss: () => setError(null),
  })
  const staleWarning = listError && rows.length > 0
    ? h('div', { className: 'wsp-warning', role: 'status' }, t('error.stale'))
    : null

  const search = h(SearchField, {
    t,
    value: query,
    onChange: setQuery,
    inputRef,
    listId: listRendered ? listId : undefined,
    activeOptionId: activeRow === undefined ? undefined : optionId(activeIndex),
  })

  const addAction = canAdd ? h(AddWorkspaceButton, { t, busy, onClick: addWorkspace })
    : h('span', { className: 'wsp-foot-note' }, t('sorted'))
  if (expanded) {
    return h(SwitcherDialog, {
      title: t('dialog.title'), subtitle: t('dialog.subtitle'), panelRef, search, body,
      busy: busy || pending, t, onClose: requestClose, onBack: () => setExpanded(false), onKeyDown,
      status: h(React.Fragment, null, staleWarning, banner),
      footer: h(React.Fragment, null,
        addAction,
        h('span', { className: 'wsp-dialog-count' },
          query.trim() === ''
            ? (filtered.length === 1 ? t('count.one') : t('count.other', { n: filtered.length }))
            : t('countResults', { n: filtered.length })),
      ),
    })
  }

  if (placement === null) return null
  const expandable = filtered.length > compactRows.length
  return createPortal(h(React.Fragment, null,
    h('style', null, CSS),
    h('div', {
      className: 'wsp-layer',
      onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) requestClose()
      },
    },
      h('div', {
        ref: panelRef,
        className: 'wsp-popover',
        role: 'dialog',
        'aria-label': t('dialog.title'),
        'aria-busy': busy || pending || undefined,
        style: {
          left: placement.left + 'px',
          width: placement.width + 'px',
          maxHeight: placement.maxHeight + 'px',
          ...(placement.top === undefined
            ? { bottom: (placement.bottom ?? 0) + 'px' }
            : { top: placement.top + 'px' }),
        },
        onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
        onKeyDown,
      },
        h('div', { className: 'wsp-pop-head' }, search),
        h('div', { className: 'wsp-pop-body' }, body),
        staleWarning,
        banner,
        h('div', { className: 'wsp-foot' },
          addAction,
          expandable
            ? h('button', {
              type: 'button',
              className: 'wsp-foot-action',
              onClick: () => setExpanded(true),
            },
              h(GridGlyph, { size: 14 }),
              h('span', null, query.trim() === ''
                ? t('expandCount', { n: filtered.length })
                : t('expandResults', { n: filtered.length })),
              h(ChevronRightGlyph, { size: 12 }),
            )
            : h('span', { className: 'wsp-foot-count' },
              query.trim() === ''
                ? (filtered.length === 1
                  ? t('count.one')
                  : t('count.other', { n: filtered.length }))
                : t('countResults', { n: filtered.length })),
        ),
      ),
    ),
  ), document.body)
}
