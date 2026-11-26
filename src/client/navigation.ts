import {
  IconArchiveOutlineRegular, IconChevronDownOutlineRegular, IconChevronUpOutlineRegular, IconPinFillRegular,
  IconNewChatOutlineRegular, IconProjectAddOutlineRegular, StateDot, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import * as React from 'react'
import type { ReactNode } from 'react'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ContextMenuTarget, ContextMenuTriggerProps } from '@deepseek-ai/dsh-client-ui-context-menu/client'
import type { PropsLocale, PropsRenderFactories, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { ErrorBanner, SearchField, Skeleton } from './components'
import { SwitcherDialog, trapTab } from './dialog'
import { CheckGlyph, DisclosureGlyph, FolderGlyph, OpenFolderGlyph } from './glyphs'
import { GroupingMenu } from './grouping-menu'
import { FLAT, WORKSPACES, WORKSPACE_TREE, isGrouping, type GroupBy, type createGroupingPreferences } from './grouping'
import type { TranslateSeat } from './labels'
import { filterRows, relativeTime, shortenPath } from './model'
import {
  buildNavigation, contentHits, filterTree, flattenTree, initialExpansion, mainSessionId, searchSessions, stepNavigationIndex,
  type BranchRow, type ContentHits, type ContentSearch, type NavigationCatalog, type NavigationRow, type SearchHit,
  type SessionId, type SessionResult,
} from './navigation-model'
import type { createRecentSessions } from './recent-sessions'
import { SessionQuickActions, type RunSessionAction, type SessionActionAccess } from './session-quick-actions'
import { sessionStatuses, type SessionStatusSnapshot } from './session-presentation'
import type { createSwitcherControls, SwitcherMode } from './shortcuts'
import { useTitleMarquee } from './title-marquee'
import type { SnapshotHook } from './view'
import { FLAT_ORDER, createViewPreferences, isArchiveFilter, isOrderBy, moveSession } from './view-preferences'

const h = React.createElement
const { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } = React
const NO_EXPANSIONS: ReadonlyMap<string, boolean> = new Map()
const NO_HITS: readonly SearchHit[] = []

type Controls = ReturnType<typeof createSwitcherControls>

export interface NavigationActions {
  readonly controls: Controls
  readonly groupingPreferences: ReturnType<typeof createGroupingPreferences>
  readonly viewPreferences: ReturnType<typeof createViewPreferences>
  readonly workspaceLabel: PropsLocale<'workspace'>['t']
  readonly searchContent: ContentSearch
  readonly openSession: (id: SessionId) => void
  readonly startSession: (id: WorkspaceId) => void
  readonly runSessionAction: RunSessionAction
  readonly addWorkspace?: (signal: AbortSignal) => Promise<WorkspaceId | undefined>
}

interface OverlayProps extends NavigationActions, PropsRenderFactories,
  Pick<PropsRuntime<'shell.overlay'>, 'useContextMenu' | 'useWorkspaceAccess'> {
  readonly t: TranslateSeat
  readonly recent: ReturnType<typeof createRecentSessions>
  readonly useSessionAccess: SessionActionAccess
  readonly useRowMenuTarget: SnapshotHook<ContextMenuTarget | null>
  readonly useWorkspaces: SnapshotHook<WorkspaceSnapshot>
  readonly useSessions: SnapshotHook<NavigationCatalog & Partial<Pick<SessionListState, 'projectionsBySession'>>>
  readonly useSessionStatus: SnapshotHook<SessionStatusSnapshot>
  readonly usePanelInfo: SnapshotHook<{ readonly activePanelId: string | null }>
  readonly useRemoteAccess: (action: 'workspace/create') => boolean
}

export function SwitcherOverlay(props: OverlayProps): ReactNode {
  const { controls, recent, usePanelInfo, useSessions, useWorkspaces } = props
  const mode = useSyncExternalStore(controls.subscribe, controls.getSnapshot)
  const catalog = useSessions(state => state.byId)
  const archived = useWorkspaces(state => state.archivedSessionIds)
  const showConversation = usePanelInfo(state => state.activePanelId === null)
  const current = showConversation ? mainSessionId(catalog) : undefined
  React.useLayoutEffect(() => {
    const archivedIds = new Set(archived)
    recent.observe(current, id => {
      const session = catalog[id]
      return session !== undefined && !session.blank && session.origin !== 'subagent' && !archivedIds.has(id)
    })
  }, [recent, current, catalog, archived])
  if (mode === null) return null
  return h(NavigationDialog, { ...props, key: mode, mode })
}

function NavigationDialog({ mode, controls, groupingPreferences, viewPreferences, t, useWorkspaces, useSessions, usePanelInfo,
  useContextMenu, renderFactorySlot, useRemoteAccess, useSessionAccess, useSessionStatus, useRowMenuTarget, useWorkspaceAccess,
  workspaceLabel, searchContent, openSession, startSession, addWorkspace, runSessionAction,
}: OverlayProps & { mode: SwitcherMode }): ReactNode {
  const workspaces = useWorkspaces(state => state)
  const sessions = useSessions(state => state)
  const statuses = useSessionStatus(state => state)
  const showMain = usePanelInfo(state => state.activePanelId === null)
  const { getTriggerProps } = useContextMenu()
  const openMenuTarget = useRowMenuTarget(value => value)
  const canAdd = useRemoteAccess('workspace/create')
  const hero = mode === 'workspaces' && showMain ? controls.hero() : undefined
  const choosing = hero !== undefined
  const [groupId, setGroupId] = useState(() => groupingPreferences.initial(mode))
  const groupBy = choosing && groupId === FLAT ? WORKSPACE_TREE : groupId
  const tree = groupBy !== FLAT
  const [view, setView] = useState(viewPreferences.get)
  const changeView = useCallback((next: typeof view) => {
    setView(next)
    viewPreferences.set(next)
  }, [viewPreferences])
  const { roots, sessions: sessionRows, currentId, orders } = useMemo(
    () => buildNavigation(workspaces, sessions, t('defaultName'), t('untitledSession'), groupBy, choosing ? undefined : view),
    [workspaces, sessions, t, groupBy, choosing, view],
  )
  const choices = [
    ...(!choosing ? [{ id: FLAT, label: t('group.flat') }] : []),
    { id: WORKSPACES, label: t('list.label') },
    { id: WORKSPACE_TREE, label: t('workspaceTree') },
  ]
  const [query, setQuery] = useState('')
  const [activeKey, setActiveKey] = useState<string>()
  const [addedWorkspaceId, setAddedWorkspaceId] = useState<WorkspaceId>()
  const [expansions, setExpansions] = useState<ReadonlyMap<GroupBy, ReadonlyMap<string, boolean>>>(() => new Map())
  const expanded = expansions.get(groupBy) ?? NO_EXPANSIONS
  const [busy, setBusy] = useState(false)
  const pendingWrite = useRef(false)
  const lifetime = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const [error, setError] = useState<{ label: string; message: string }>()
  const [now, setNow] = useState(Date.now)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const activeNewSessionButton = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const trimmed = query.trim()
  const remoteQuery = choosing ? '' : trimmed.replaceAll('\0', '')
  const remote = useContentSearch(remoteQuery, searchContent)
  const workspaceToReveal = addedWorkspaceId ?? hero?.selectedId
  const autoExpanded = useMemo(() => new Set(initialExpansion(roots, workspaceToReveal,
    workspaceToReveal === undefined ? currentId : undefined)), [roots, workspaceToReveal, currentId])
  const currentBranches = useMemo(() => new Set(initialExpansion(roots, hero?.selectedId, currentId)),
    [roots, hero?.selectedId, currentId])
  const ungrouped = t('ungrouped')
  const rows = useMemo<NavigationRow[]>(() => {
    if (tree) {
      const matches = filterTree(roots, trimmed, choosing, ungrouped, remote.hits)
      return flattenTree(matches, expanded, autoExpanded, trimmed !== '', ungrouped)
    }
    return searchSessions(sessionRows, trimmed, remote.hits).map(session => ({
      kind: 'session', key: `session:${session.id}`, depth: 0, session, followsBranches: false,
    }))
  }, [tree, roots, trimmed, choosing, ungrouped, remote.hits, expanded, autoExpanded, sessionRows])
  const indices = useMemo(() => new Map(rows.map((row, i) => [row.key, i])), [rows])
  const activeIndex = activeKey === undefined ? -1 : indices.get(activeKey) ?? -1
  const selectedWorkspaceId = hero?.selectedId
  const selectedIndex = useMemo(() => rows.findIndex(row => row.kind === 'branch'
    ? selectedWorkspaceId !== undefined && row.match.branch.workspace?.id === selectedWorkspaceId
    : row.session.id === currentId), [rows, selectedWorkspaceId, currentId])
  const firstChoice = useMemo(() => choosing && trimmed !== '' ? rows.findIndex(row => {
    const workspace = row.kind === 'branch' ? row.match.branch.workspace : undefined
    return workspace !== undefined && filterRows([workspace], trimmed).length > 0
  }) : 0, [choosing, trimmed, rows])
  const index = activeIndex >= 0 ? activeIndex : trimmed !== '' && rows.length > 0 ? Math.max(firstChoice, 0) : -1
  const active = rows[index]
  const optionId = useCallback((i: number) => `${listId}-${i}`, [listId])
  const title = choosing ? t('dialog.title')
    : tree ? choices.find(choice => choice.id === groupBy)?.label ?? t('workspaceTree') : t('sessionSearch')
  const pending = rows.length === 0 && (remote.pending
    || (workspaces.phase !== 'ready' && workspaces.state !== 'error')
    || (!choosing && sessions.phase !== 'ready'))

  React.useLayoutEffect(() => {
    const abort = new AbortController()
    lifetime.current = abort
    mounted.current = true
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => {
      abort.abort()
      mounted.current = false
      window.clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [])
  React.useLayoutEffect(() => {
    if (document.activeElement === document.body) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [groupBy, activeIndex])
  const activeOptionId = active === undefined ? undefined : optionId(index)
  useLayoutEffect(() => {
    if (activeOptionId === undefined) return
    document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }, [activeOptionId, active?.key])

  const changeQuery = (value: string) => {
    setQuery(value)
    setActiveKey(undefined)
    setExpansions(new Map())
  }
  const toggle = useCallback((row: BranchRow, open = !row.expanded) => {
    if (row.expandable) setExpansions(previous => new Map(previous).set(
      groupBy, new Map(previous.get(groupBy)).set(row.key, open),
    ))
  }, [groupBy])
  const choose = useCallback((row: NavigationRow) => {
    if (pendingWrite.current) return
    if (row.kind === 'session') {
      if (row.session.archived) {
        setActiveKey(row.key)
        return
      }
      try {
        openSession(row.session.id)
        controls.close()
      } catch (reason) {
        setError({ label: t('openFailed'), message: errorMessage(reason) })
      }
    } else if (choosing && row.match.branch.workspace !== undefined) {
      controls.pickWorkspace(row.match.branch.workspace.id)
      controls.close()
    } else {
      setActiveKey(row.key)
      toggle(row)
    }
  }, [choosing, controls, openSession, t, toggle])
  const startWorkspaceSession = useCallback((id: WorkspaceId) => {
    if (pendingWrite.current) return
    startSession(id)
    controls.close()
  }, [startSession, controls])
  const add = async () => {
    if (addWorkspace === undefined || pendingWrite.current) return
    pendingWrite.current = true
    setBusy(true)
    setError(undefined)
    try {
      const signal = lifetime.current?.signal
      if (signal === undefined) return
      const id = await addWorkspace(signal)
      if (!mounted.current || id === undefined) return
      if (choosing && controls.hero() !== undefined) {
        controls.pickWorkspace(id)
        controls.close()
        return
      }
      changeQuery('')
      if (!tree) setGroupId(groupingPreferences.initial('workspaces'))
      setAddedWorkspaceId(id)
      setActiveKey(`workspace:${id}`)
      inputRef.current?.focus({ preventScroll: true })
    } catch (reason) {
      if (mounted.current) setError({ label: t('addFailed'), message: errorMessage(reason) })
    } finally {
      pendingWrite.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = event => {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      controls.close()
      return
    }
    trapTab(event, panelRef.current)
    if (event.target !== inputRef.current
      && !(event.target instanceof HTMLElement && event.target.matches('[data-wsp-navigation-row]'))) return
    const focusRow = (next: number) => {
      const row = rows[next]
      if (row === undefined) return
      setActiveKey(row.key)
      if (tree) document.getElementById(optionId(next))?.focus({ preventScroll: true })
    }
    const fromSearch = event.target === inputRef.current
    if (!fromSearch && mode === 'workspaces' && active?.kind === 'branch' && active.match.branch.workspace !== undefined) {
      if (event.key === ' ') {
        event.preventDefault()
        if (!event.repeat && !pendingWrite.current) toggle(active)
        return
      }
      const newSessionButton = activeNewSessionButton.current
      if (event.key === 'Enter' && newSessionButton !== null) {
        event.preventDefault()
        if (!event.repeat) newSessionButton.click()
        return
      }
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (rows.length === 0) return
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      // In the flat list the current Session is already marked. Step from it on the first key.
      // Tree navigation retains its initial focus on the selected item before stepping.
      const next = tree && index < 0 && selectedIndex >= 0 ? selectedIndex
        : stepNavigationIndex(rows.length, index >= 0 ? index : selectedIndex, direction)
      focusRow(next)
    } else if (event.key === 'Enter' && fromSearch && active !== undefined) {
      event.preventDefault()
      choose(active)
    } else if (tree && !fromSearch && active !== undefined) {
      if (event.key === 'ArrowRight' && active.kind === 'branch' && active.expandable) {
        event.preventDefault()
        if (!active.expanded) toggle(active, true)
        else focusRow(index + 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (active.kind === 'branch' && active.expanded) toggle(active, false)
        else if (active.parentKey !== undefined) focusRow(rows.findIndex(row => row.key === active.parentKey))
      }
    }
  }

  const focused = active ?? rows[selectedIndex] ?? (tree ? rows[0] : undefined)
  const focusedSession = focused?.kind === 'session' ? focused : undefined
  const reorderable = view.orderBy === 'manual' && trimmed === '' && !busy
  const siblings = reorderable && focusedSession !== undefined && !focusedSession.session.archived
    ? rows.filter(row => row.kind === 'session' && row.parentKey === focusedSession.parentKey
      && !row.session.archived && row.session.pinned === focusedSession.session.pinned) : []
  const position = siblings.findIndex(row => row === focusedSession)
  const shiftSession = (target: NavigationRow | undefined) => {
    if (focusedSession === undefined || target?.kind !== 'session') return
    reorder(focusedSession, target)
  }
  const dragged = useRef<SessionResult | null>(null)
  const [dropTarget, setDropTarget] = useState<{ key: string; half: DropHalf }>()
  const clearDrag = useCallback(() => { dragged.current = null; setDropTarget(undefined) }, [])
  const canDrop = useCallback((target: NavigationRow) => {
    const from = dragged.current
    return reorderable && from !== null && target.kind === 'session' && from.key !== target.key
      && from.parentKey === target.parentKey && !target.session.archived && from.session.pinned === target.session.pinned
  }, [reorderable])
  const reorder = useCallback((from: SessionResult, to: SessionResult, half?: DropHalf) => {
    const key = from.parentKey ?? FLAT_ORDER
    const order = orders[key]
    if (order === undefined) return
    const next = moveSession(order, from.session.id, to.session.id, half)
    if (order === next) return
    setActiveKey(from.key)
    changeView({ ...view, orders: { ...view.orders, [key]: next } })
  }, [orders, view, changeView])
  const catalogError = workspaces.state === 'error'
  const empty = pending ? h(Skeleton, { rows: 5 })
    : h('div', { className: 'wsp-empty', role: 'status' }, t(catalogError ? 'listUnavailable'
      : trimmed !== '' ? 'noMatches'
        : tree && (choosing || view.archiveFilter !== 'only-archived') ? 'empty.noWorkspacesTitle' : 'noSessions'))

  // Reuse the exact React elements for unaffected rows so cursor movement never rebuilds their
  // status or action controls, and React can skip rendering those rows entirely.
  const { children, options } = useMemo(() => {
    const children = new Map<string | undefined, number[]>()
    for (const [i, row] of rows.entries()) {
      const siblings = children.get(row.parentKey)
      if (siblings === undefined) children.set(row.parentKey, [i])
      else siblings.push(i)
    }
    const options = rows.map((row, i) => {
      const id = optionId(i)
      const groupId = children.has(row.key) ? `${id}-children` : undefined
      const target = busy || choosing ? undefined : rowMenuTarget(row, sessions.byId)
      const workspace = row.kind === 'branch' ? row.match.branch.workspace : undefined
      const newSessionAction = mode === 'workspaces' && !busy && !choosing && workspace !== undefined
        ? h(WorkspaceNewSessionAction, {
          workspaceId: workspace.id, name: workspace.title, rowId: id, t: workspaceLabel,
          buttonRef: undefined,
          useWorkspaceAccess, onStart: startWorkspaceSession,
        }) : undefined
      const option = h(ResultRow, {
        key: row.key, row, id, groupId, t, now, choosing, active: false,
        selected: i === selectedIndex,
        currentBranch: !choosing && currentBranches.has(row.key),
        statuses: row.kind === 'session' ? sessionStatuses(row.session, sessions, statuses, workspaceLabel) : undefined,
        pinnedLabel: workspaceLabel('row.pinned'),
        menuTrigger: getTriggerProps(target, { tabIndex: -1 }),
        menuOpen: target?.kind === 'session' && openMenuTarget?.kind === 'session'
          ? target.value.sessionId === openMenuTarget.value.sessionId
          : target?.kind === 'workspace' && openMenuTarget?.kind === 'workspace'
            && target.value.workspaceId === openMenuTarget.value.workspaceId,
        quickActions: target?.kind === 'session' && row.kind === 'session' ? h(SessionQuickActions, {
          target, archived: row.session.archived, pinned: row.session.pinned,
          useSessionAccess, t: workspaceLabel, runSessionAction,
        }) : newSessionAction,
        rowMenu: target === undefined ? undefined : renderFactorySlot('contextMenu.button', {
          target, className: 'wsp-row-action wsp-row-menu',
          label: workspaceLabel(target.kind === 'session' ? 'actions.session.aria' : 'actions.workspace.aria',
            { name: row.kind === 'session' ? row.session.title : row.title }),
        }),
        dropTarget: undefined,
        ...(reorderable && row.kind === 'session' && !row.session.archived ? { drag: {
          draggable: true,
          onDragStart: (event: React.DragEvent<HTMLButtonElement>) => {
            dragged.current = row
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', row.session.id)
          },
          onDragOver: (event: React.DragEvent<HTMLButtonElement>) => {
            if (!canDrop(row)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            const half = sessionDropHalf(event)
            setDropTarget(current => current?.key === row.key && current.half === half ? current : { key: row.key, half })
          },
          onDragLeave: (event: React.DragEvent<HTMLButtonElement>) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
              setDropTarget(target => target?.key === row.key ? undefined : target)
            }
          },
          onDrop: (event: React.DragEvent<HTMLButtonElement>) => {
            if (!canDrop(row) || dragged.current === null) return
            event.preventDefault()
            reorder(dragged.current, row, sessionDropHalf(event))
            clearDrag()
          },
          onDragEnd: clearDrag,
        } } : {}),
        tree, busy, onChoose: () => choose(row), onFocus: () => setActiveKey(row.key),
        onToggle: row.kind === 'branch' ? () => { setActiveKey(row.key); toggle(row) } : undefined,
      })
      return { row, option, groupId, newSessionAction }
    })
    return { children, options }
  }, [rows, optionId, busy, choosing, sessions, mode, workspaceLabel, useWorkspaceAccess, startWorkspaceSession,
    t, now, selectedIndex, currentBranches, statuses, getTriggerProps, openMenuTarget, useSessionAccess,
    runSessionAction, renderFactorySlot, reorderable, canDrop, reorder, clearDrag, tree, choose, toggle])

  function renderGroup(parentKey?: string): ReactNode[] {
    return (children.get(parentKey) ?? []).map(i => {
      const { row, option, groupId, newSessionAction } = options[i]
      const active = i === index
      const drop = dropTarget?.key === row.key ? dropTarget.half : undefined
      const element = active || drop !== undefined ? React.cloneElement(option, {
        active, dropTarget: drop,
        ...(active && newSessionAction !== undefined ? {
          quickActions: React.cloneElement(newSessionAction, { buttonRef: activeNewSessionButton }),
        } : {}),
      }) : option
      if (row.kind === 'session') {
        // A decorative divider, outside `rows`, so keyboard order and the tree's owned items stay unchanged.
        return row.followsBranches
          ? h(React.Fragment, { key: row.key }, h('div', { className: 'wsp-tree-divider', 'aria-hidden': true }), element)
          : element
      }
      return h('div', { key: row.key, role: 'presentation' }, element,
        groupId === undefined ? null
          : h('div', { id: groupId, role: 'group', className: 'wsp-tree-children' }, renderGroup(row.key)),
      )
    })
  }

  return h(SwitcherDialog, {
    title, panelRef, busy: busy || pending, t, onClose: controls.close, onKeyDown,
    ...(choosing ? { subtitle: t('dialog.subtitle') } : {}),
    search: h(SearchField, {
      t, value: query, onChange: changeQuery, inputRef, tree,
      label: t(tree ? choosing ? 'search.label' : 'searchWorkspaceTree' : 'sessionSearch'),
      listId: rows.length === 0 ? undefined : listId,
      activeOptionId,
      onKeyDown: busy || choosing || active === undefined ? undefined : getTriggerProps(rowMenuTarget(active, sessions.byId)).onKeyDown,
    }),
    body: rows.length === 0 ? empty : h('div', {
      className: 'wsp-list wsp-navigation-list', 'data-mode': mode,
      role: tree ? 'tree' : 'listbox', id: listId, 'aria-label': title,
    }, renderGroup()),
    status: h(React.Fragment, null,
      catalogError && rows.length > 0 ? h('div', { className: 'wsp-warning', role: 'status' }, t('listUnavailable')) : null,
      error === undefined ? null : h(ErrorBanner, {
        ...error, dismiss: t('dismiss'), onDismiss: () => setError(undefined),
      }),
    ),
    toolbar: h('div', { className: 'wsp-navigation-toolbar' },
      h(GroupingMenu, {
        label: t('group.options'), disabled: busy,
        sections: [{
          heading: t('group.heading'), choices, selected: groupBy,
          onSelect: (id: string) => {
            if (!isGrouping(id)) return
            setGroupId(id)
            setActiveKey(undefined)
            groupingPreferences.remember(id)
          },
        }, ...(!choosing ? [{
          heading: t('order.heading'), selected: view.orderBy,
          choices: [{ id: 'manual', label: t('order.manual') }, { id: 'updated', label: t('order.updated') }],
          onSelect: (id: string) => {
            if (!isOrderBy(id) || id === view.orderBy) return
            changeView({ ...view, orderBy: id, orders: id === 'manual' ? { ...orders, ...view.orders } : view.orders })
          },
        }, {
          heading: t('filter.heading'), selected: view.archiveFilter,
          choices: [
            { id: 'hide-archived', label: t('filter.hideArchived') },
            { id: 'show-archived', label: t('filter.showArchived') },
            { id: 'only-archived', label: t('filter.onlyArchived') },
          ],
          onSelect: (id: string) => {
            if (!isArchiveFilter(id)) return
            setActiveKey(undefined)
            changeView({ ...view, archiveFilter: id })
          },
        }] : [])],
      }),
      canAdd && addWorkspace !== undefined ? h('button', {
        type: 'button', className: 'wsp-icon-btn wsp-tool-button',
        title: t(busy ? 'adding' : 'add'), 'aria-label': t('add'),
        'aria-busy': busy || undefined, 'aria-disabled': busy || undefined, onClick: () => { void add() },
      }, h(IconProjectAddOutlineRegular, { size: 16 })) : null,
    ),
    footer: h(React.Fragment, null,
      h('div', { className: 'wsp-navigation-actions' },
        position >= 0 && siblings.length > 1 ? h(React.Fragment, null,
          h('button', {
            type: 'button', className: 'wsp-icon-btn wsp-tool-button', title: t('session.moveUp'),
            'aria-label': t('session.moveUp'), 'aria-disabled': position === 0 || undefined,
            onClick: () => { if (position > 0) shiftSession(siblings[position - 1]) },
          }, h(IconChevronUpOutlineRegular, { size: 16 })),
          h('button', {
            type: 'button', className: 'wsp-icon-btn wsp-tool-button', title: t('session.moveDown'),
            'aria-label': t('session.moveDown'), 'aria-disabled': position === siblings.length - 1 || undefined,
            onClick: () => shiftSession(siblings[position + 1]),
          }, h(IconChevronDownOutlineRegular, { size: 16 })),
        ) : null,
      ),
      h('span', { className: 'wsp-dialog-count', role: 'status' },
        remote.pending ? t('searching') : remote.hasMore ? t('refineSearch')
          : pending ? t('loadingList') : trimmed === '' && tree ? null : t('countResults', { n: rows.length })),
    ),
  })
}

function rowMenuTarget(row: NavigationRow, byId: NavigationCatalog['byId']): ContextMenuTarget | undefined {
  if (row.kind === 'session') {
    const { id } = row.session
    return { kind: 'session', value: { sessionId: id, displayTitle: byId[id]?.title ?? '' } }
  }
  const workspace = row.match.branch.workspace
  if (workspace?.path) return { kind: 'workspace', value: { workspaceId: workspace.id, path: workspace.path, displayTitle: row.title } }
}

type DropHalf = 'before' | 'after'

function sessionDropHalf(event: React.DragEvent<HTMLButtonElement>): DropHalf {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
}

/**
 * Adapted from ProjectRow in @deepseek-ai/dsh-client-ui-workspace 0.2.2-rc.5, src/client/rows/Rows.tsx.
 * Copyright (c) 2026 DeepSeek. MIT License, see ../../LICENSE.deepseek-harness.
 */
function WorkspaceNewSessionAction({ workspaceId, name, rowId, t, buttonRef, useWorkspaceAccess, onStart }: {
  readonly workspaceId: WorkspaceId
  readonly name: string
  readonly rowId: string
  readonly t: PropsLocale<'workspace'>['t']
  readonly buttonRef: React.Ref<HTMLButtonElement> | undefined
  readonly useWorkspaceAccess: OverlayProps['useWorkspaceAccess']
  readonly onStart: (id: WorkspaceId) => void
}): ReactNode {
  const canStart = useWorkspaceAccess(workspaceId, 'session/create')
  const focused = useRef(false)
  React.useLayoutEffect(() => {
    // A permission change can remove the button while it owns keyboard focus.
    if (canStart || !focused.current) return
    focused.current = false
    if (document.activeElement === document.body) document.getElementById(rowId)?.focus({ preventScroll: true })
  }, [canStart, rowId])
  if (!canStart) return null
  return h(Tooltip, {
    label: t('actions.newSession'), side: 'bottom', align: 'end', delayMs: 500, portal: true,
    children: h('button', {
      ref: buttonRef, type: 'button', className: 'wsp-row-action wsp-row-new-session',
      'aria-label': t('actions.newSession.aria', { name }),
      onFocus: () => { focused.current = true },
      onBlur: () => { focused.current = false },
      onClick: () => onStart(workspaceId),
    }, h(IconNewChatOutlineRegular, { size: 14 })),
  })
}

function ResultRow({ row, id, groupId, t, now, choosing, active, selected, currentBranch,
  statuses, pinnedLabel, tree, busy, dropTarget, drag, menuTrigger, menuOpen, rowMenu, quickActions, onChoose, onFocus, onToggle,
}: {
  row: NavigationRow; id: string; groupId: string | undefined; t: TranslateSeat; now: number;
  choosing: boolean; active: boolean; selected: boolean; currentBranch: boolean; tree: boolean; busy: boolean;
  statuses: ReturnType<typeof sessionStatuses> | undefined; pinnedLabel: string;
  drag?: React.HTMLAttributes<HTMLButtonElement>; dropTarget: DropHalf | undefined;
  menuTrigger: ContextMenuTriggerProps; menuOpen: boolean; rowMenu: ReactNode; quickActions: ReactNode;
  onChoose: () => void; onFocus: () => void; onToggle?: (() => void) | undefined
}): ReactNode {
  const rowRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const marquee = useTitleMarquee(titleRef)
  useEffect(() => {
    if (menuOpen || rowRef.current?.matches(':hover')) marquee.enter()
    else marquee.leave()
  }, [menuOpen, marquee])
  const branch = row.kind === 'branch' ? row : undefined
  const session = row.kind === 'session' ? row.session : undefined
  const workspace = branch?.match.branch.workspace
  const title = branch?.title ?? session?.title
  const path = workspace?.path ?? session?.path
  const splitDisclosure = choosing && workspace !== undefined && branch?.expandable === true
  const hasSearchMeta = Boolean(session?.snippet || (!tree && (session?.workspace || session?.path)))
  const status = statuses?.[0]
  const statusTitle = statuses?.map(item => item.label).join(' · ')
  const option = h('button', {
    id, type: 'button', role: tree ? 'treeitem' : 'option', ...menuTrigger,
    'aria-level': tree ? row.depth + 1 : undefined, 'aria-owns': groupId,
    'aria-expanded': branch?.expandable ? branch.expanded : undefined,
    'aria-selected': selected, 'aria-current': session !== undefined && selected || undefined,
    'aria-disabled': busy || undefined, 'data-wsp-navigation-row': true,
    'data-active': active || undefined, 'data-selected': selected || undefined,
    'data-archived': session?.archived || undefined, 'data-drop-target': dropTarget || undefined,
    'aria-label': session?.archived ? `${title} · ${t('session.archived')}` : undefined,
    ...drag,
    'data-search-meta': hasSearchMeta || undefined,
    className: 'wsp-row wsp-navigation-row', title: path || title, onClick: onChoose, onFocus,
  },
    branch === undefined ? session?.archived ? h('span', { className: 'wsp-row-icon' }, h(IconArchiveOutlineRegular, { size: 14 }))
      : h('span', { className: 'wsp-row-icon' }, status === undefined || status.state === 'idle' ? null
        : h('span', { role: 'img', 'aria-label': statusTitle, title: statusTitle }, h(StateDot, { state: status.state, size: 12 })))
      : h('span', {
        className: 'wsp-row-icon wsp-tree-icon', 'data-current': currentBranch || undefined,
        'data-swap': branch.expandable && !splitDisclosure || undefined, 'data-expanded': branch.expanded,
      },
        h(branch.expanded ? OpenFolderGlyph : FolderGlyph, { className: 'wsp-tree-folder' }),
        branch.expandable && !splitDisclosure ? h(DisclosureGlyph, { className: 'wsp-tree-arrow' }) : null,
      ),
    h('span', { className: 'wsp-row-text' },
      workspace?.showPath ? h('span', { className: 'wsp-row-line' },
        h('span', { className: 'wsp-row-title' }, title),
        h('span', { className: 'wsp-row-suffix' }, shortenPath(workspace.path)),
      ) : h('span', {
        className: session === undefined ? 'wsp-row-title' : 'wsp-row-title wsp-session-title',
        ref: session === undefined ? undefined : titleRef,
      }, title),
      hasSearchMeta ? h('span', { className: 'wsp-search-meta' },
        tree ? null : h('span', { className: 'wsp-row-path' }, session?.workspace || session?.path),
        session?.snippet ? h('span', { className: 'wsp-row-path wsp-session-snippet' }, session.snippet) : null,
      ) : null,
    ),
    session === undefined ? null : h('span', { className: 'wsp-row-resting' },
      h('span', { className: 'wsp-row-time', 'data-timestamp': status?.trailingLabel === undefined || session.archived || undefined,
        title: status?.trailingLabel ? statusTitle : undefined },
        session.archived ? relativeTime(session.latest, now, t) : status?.trailingLabel ?? relativeTime(session.latest, now, t)),
      session.pinned && !session.archived ? h('span', { className: 'wsp-row-icon wsp-row-pin-indicator', role: 'img',
        title: pinnedLabel, 'aria-label': pinnedLabel }, h(IconPinFillRegular, { size: 12 })) : null,
    ),
    choosing && selected ? h('span', { className: 'wsp-row-check', 'aria-hidden': true }, h(CheckGlyph, { size: 14 })) : null,
  )
  if (!splitDisclosure) return rowMenu === undefined && quickActions === undefined ? option : h('div', {
    className: 'wsp-tree-option wsp-menu-row', role: 'presentation', 'data-menu-open': menuOpen || undefined,
    ref: rowRef,
    onPointerEnter: session === undefined ? undefined : marquee.enter,
    onPointerLeave: session === undefined ? undefined : () => { if (!menuOpen) marquee.leave() },
    'data-collapsed-workspace': workspace !== undefined && branch?.expandable && !branch.expanded || undefined,
    onFocus,
  }, option, h('span', { className: 'wsp-row-actions' }, rowMenu, quickActions))
  const action = t(branch.expanded ? 'collapseBranch' : 'expandBranch')
  return h('div', { className: 'wsp-tree-option', role: 'presentation' },
    option,
    h('button', {
      type: 'button', className: 'wsp-icon-btn wsp-tree-disclosure', tabIndex: -1,
      'aria-label': `${action} ${title}`, 'aria-expanded': branch.expanded,
      'data-expanded': branch.expanded, disabled: busy,
      onClick: () => { onToggle?.(); document.getElementById(id)?.focus({ preventScroll: true }) },
    }, h(DisclosureGlyph, { className: 'wsp-tree-arrow' })),
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** One settled content search, or `undefined` when it rejected. */
async function settledSearch(
  search: ContentSearch, query: string, signal: AbortSignal,
): Promise<Awaited<ReturnType<ContentSearch>> | undefined> {
  try {
    return await search(query, signal)
  } catch {
    return undefined
  }
}

/**
 * Debounced message-content search for the current query. A search the Host
 * refuses, or that rejects, contributes no hits and raises no notice, so the
 * dialog keeps its local title, path, and ID matches as the shipped sidebar does.
 */
function useContentSearch(query: string, search: ContentSearch) {
  const [result, setResult] = useState<{ query: string } & ContentHits>()
  useEffect(() => {
    setResult(undefined)
    if (query === '' || query.length > 500) return
    const abort = new AbortController()
    const timer = window.setTimeout(async () => {
      const response = await settledSearch(search, query, abort.signal)
      if (abort.signal.aborted) return
      setResult({ query, ...contentHits(response) })
    }, 250)
    return () => { window.clearTimeout(timer); abort.abort() }
  }, [query, search])
  const current = query !== '' && result?.query === query ? result : undefined
  return {
    hits: current?.hits ?? NO_HITS, hasMore: current?.hasMore ?? false,
    pending: query !== '' && query.length <= 500 && current === undefined,
  }
}
