import * as React from 'react'
import type { ReactNode } from 'react'
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { AddWorkspaceButton, ErrorBanner, SearchField, Skeleton } from './components'
import { SwitcherDialog, trapTab } from './dialog'
import { CheckGlyph, DisclosureGlyph, FolderGlyph, OpenFolderGlyph } from './glyphs'
import { activeGrouping, FLAT, WORKSPACES, WORKSPACE_TREE, type createGroupingPreferences, type createGroupingRegistry } from './grouping'
import type { TranslateSeat } from './labels'
import { filterRows, relativeTime, shortenPath } from './model'
import {
  buildNavigation, filterTree, initialExpansion, searchSessions,
  type NavigationCatalog, type SearchHit, type SessionId, type SessionRow, type TreeMatch,
} from './navigation-model'
import type { createSwitcherControls, SwitcherMode } from './shortcuts'
import type { SnapshotHook } from './view'

const h = React.createElement
const { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } = React
const NO_HITS: readonly SearchHit[] = []

type StatusLabel = 'status.running' | 'status.completed' | 'status.waitingApproval' | 'status.planReview' | 'status.waitingAnswer'
type SessionStatus = { running: boolean | undefined; completionUnread: boolean; pendingInteraction: { kind: string } | undefined }

type Controls = ReturnType<typeof createSwitcherControls>
type Search = (query: string, signal: AbortSignal) => Promise<{
  readonly ok: true
  readonly value: { readonly items: readonly SearchHit[]; readonly hasMore: boolean }
} | { readonly ok: false; readonly error: { readonly message: string } }>

export interface NavigationActions {
  readonly controls: Controls
  readonly groupings: ReturnType<typeof createGroupingRegistry>
  readonly groupingPreferences: ReturnType<typeof createGroupingPreferences>
  readonly statusLabel: (key: StatusLabel) => string
  readonly searchContent: Search
  readonly openSession: (id: SessionId) => void
  readonly renameWorkspace: (id: WorkspaceId, title: string) => Promise<unknown>
  readonly addWorkspace?: (signal: AbortSignal) => Promise<WorkspaceId | undefined>
}

interface OverlayProps extends NavigationActions {
  readonly t: TranslateSeat
  readonly useWorkspaces: SnapshotHook<WorkspaceSnapshot>
  readonly useSessions: SnapshotHook<NavigationCatalog>
  readonly useSessionStatus: SnapshotHook<ReadonlyMap<SessionId, SessionStatus>>
  readonly usePanelInfo: SnapshotHook<{ readonly activePanelId: string | null }>
  readonly useWorkspaceAccess: (id: WorkspaceId, action: 'workspace/rename') => boolean
  readonly useRemoteAccess: (action: 'workspace/create') => boolean
}

export function SwitcherOverlay(props: OverlayProps): ReactNode {
  const mode = useSyncExternalStore(props.controls.subscribe, props.controls.getSnapshot)
  return mode === null ? null : h(NavigationDialog, { ...props, key: mode, mode })
}

function NavigationDialog({ mode, controls, groupings, groupingPreferences, t, useWorkspaces, useSessions, usePanelInfo,
  useWorkspaceAccess, useRemoteAccess, useSessionStatus, statusLabel, searchContent, openSession, renameWorkspace, addWorkspace,
}: OverlayProps & { mode: SwitcherMode }): ReactNode {
  const workspaces = useWorkspaces(state => state)
  const sessions = useSessions(state => state)
  const showMain = usePanelInfo(state => state.activePanelId === null)
  const canAdd = useRemoteAccess('workspace/create')
  const hero = mode === 'workspaces' && showMain ? controls.hero() : undefined
  const choosing = hero !== undefined
  const catalog = useSyncExternalStore(groupings.subscribe, groupings.getSnapshot)
  const [groupId, setGroupId] = useState(() => groupingPreferences.initial(mode, catalog))
  const preferenceChoice = useRef<string | undefined>(undefined)
  const groupBy = activeGrouping(groupId, catalog, choosing)
  const grouping = catalog.find(entry => entry.id === groupBy)
  const tree = groupBy !== FLAT
  const { roots, sessions: sessionRows, currentId, groupingError } = useMemo(
    () => buildNavigation(workspaces, sessions, t('defaultName'), t('untitledSession'), groupBy, grouping),
    [workspaces, sessions, t, groupBy, grouping],
  )
  const displayedGroup = groupingError ? WORKSPACE_TREE : groupBy
  useEffect(() => {
    if (preferenceChoice.current !== groupId) return
    preferenceChoice.current = undefined
    if (displayedGroup === groupId) groupingPreferences.remember(groupId)
  }, [displayedGroup, groupId, groupingPreferences])
  const choices = [
    ...(!choosing ? [{ id: FLAT, label: t('group.flat') }] : []),
    { id: WORKSPACES, label: t('list.label') },
    { id: WORKSPACE_TREE, label: t('workspaceTree') },
    ...catalog.map(entry => ({ id: entry.id, label: entry.label() })),
  ]
  const [query, setQuery] = useState('')
  const [activeKey, setActiveKey] = useState<string>()
  const [addedWorkspaceId, setAddedWorkspaceId] = useState<WorkspaceId>()
  const [expansions, setExpansions] = useState<ReadonlyMap<string, ReadonlyMap<string, boolean>>>(() => new Map())
  const expanded = expansions.get(displayedGroup) ?? new Map<string, boolean>()
  const [renaming, setRenaming] = useState<{ readonly id: WorkspaceId; readonly title: string; readonly original: string }>()
  const [writeKind, setWriteKind] = useState<'add' | 'rename'>()
  const busy = writeKind !== undefined
  const pendingWrite = useRef(false)
  const lifetime = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  const [error, setError] = useState<{ label: string; message: string }>()
  const [now, setNow] = useState(Date.now)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const trimmed = query.trim()
  const remoteQuery = choosing ? '' : trimmed.replaceAll('\0', '')
  const remote = useContentSearch(remoteQuery, searchContent)
  const workspaceToReveal = addedWorkspaceId ?? hero?.selectedId
  const autoExpanded = useMemo(() => new Set(initialExpansion(roots, workspaceToReveal,
    workspaceToReveal === undefined ? currentId : undefined)), [roots, workspaceToReveal, currentId])
  const currentBranches = useMemo(() => new Set(initialExpansion(roots, hero?.selectedId, currentId)),
    [roots, hero?.selectedId, currentId])
  const matches = tree ? filterTree(roots, trimmed, choosing, t('ungrouped'), remote.hits) : []
  const treeRows = tree ? flattenTree(matches, expanded, autoExpanded, trimmed !== '', t) : []
  const flatRows = tree ? [] : searchSessions(sessionRows, trimmed, remote.hits)
  const rows: NavigationRow[] = tree ? treeRows : flatRows.map(session => ({
    kind: 'session', key: `session:${session.id}`, depth: 0, session,
  }))
  const activeIndex = rows.findIndex(row => row.key === activeKey)
  const selectedIndex = rows.findIndex(row => row.kind === 'branch'
    ? row.match.branch.workspace?.id !== undefined && row.match.branch.workspace.id === hero?.selectedId
    : row.session.id === currentId)
  const firstChoice = choosing && trimmed !== '' ? rows.findIndex(row => {
    const workspace = row.kind === 'branch' ? row.match.branch.workspace : undefined
    return workspace !== undefined && filterRows([workspace], trimmed).length > 0
  }) : 0
  const index = activeIndex >= 0 ? activeIndex : trimmed !== '' && rows.length > 0 ? Math.max(firstChoice, 0) : -1
  const active = rows[index]
  const optionId = (i: number) => `${listId}-${i}`
  const title = choosing ? t('dialog.title')
    : tree ? choices.find(choice => choice.id === displayedGroup)?.label ?? t('workspaceTree') : t('sessionSearch')
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
  const renameId = renaming?.id
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(frame)
  }, [renameId])
  React.useLayoutEffect(() => {
    if (document.activeElement === document.body) {
      inputRef.current?.focus({ preventScroll: true })
    }
  }, [displayedGroup])
  useEffect(() => {
    panelRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active?.key])

  const changeQuery = (value: string) => {
    setQuery(value)
    setActiveKey(undefined)
    setExpansions(new Map())
  }
  const toggle = (row: BranchRow, open = !row.expanded) => {
    if (row.expandable) setExpansions(previous => new Map(previous).set(
      displayedGroup, new Map(previous.get(displayedGroup)).set(row.key, open),
    ))
  }
  const choose = (row: NavigationRow) => {
    if (pendingWrite.current) return
    if (row.kind === 'session') {
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
  }
  const write = async (kind: 'add' | 'rename', failed: string, operation: () => Promise<void>) => {
    if (pendingWrite.current) return
    pendingWrite.current = true
    setWriteKind(kind)
    setError(undefined)
    try {
      await operation()
    } catch (reason) {
      if (mounted.current) setError({ label: failed, message: errorMessage(reason) })
    } finally {
      pendingWrite.current = false
      if (mounted.current) setWriteKind(undefined)
    }
  }

  const add = () => {
    if (addWorkspace === undefined) return
    void write('add', t('addFailed'), async () => {
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
      if (!tree) setGroupId(groupingPreferences.initial('workspaces', groupings.getSnapshot()))
      setAddedWorkspaceId(id)
      setActiveKey(`workspace:${id}`)
      inputRef.current?.focus({ preventScroll: true })
    })
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (renaming !== undefined) setRenaming(undefined)
      else controls.close()
      return
    }
    trapTab(event, panelRef.current)
    if (renaming !== undefined || (event.target !== inputRef.current
      && !(event.target instanceof HTMLElement && event.target.matches('[data-wsp-navigation-row]')))) return
    const focusRow = (next: number) => {
      const row = rows[next]
      if (row === undefined) return
      setActiveKey(row.key)
      if (tree) document.getElementById(optionId(next))?.focus({ preventScroll: true })
    }
    const fromSearch = event.target === inputRef.current
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (rows.length === 0) return
      event.preventDefault()
      const down = event.key === 'ArrowDown'
      const next = index < 0 ? selectedIndex >= 0 ? selectedIndex : down ? 0 : rows.length - 1
        : Math.max(0, Math.min(rows.length - 1, index + (down ? 1 : -1)))
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
  const focusedWorkspace = focused?.kind === 'branch' ? focused.match.branch.workspace : undefined
  const status = error ?? (remote.error === undefined ? undefined : { label: t('contentSearchFailed'), message: remote.error })
  const renameTitle = renaming?.title.trim()
  const canSaveRename = renameTitle !== undefined && renameTitle !== '' && renameTitle !== renaming?.original && !busy
  const catalogError = workspaces.state === 'error'
  const empty = pending ? h(Skeleton, { rows: 5 })
    : h('div', { className: 'wsp-empty', role: 'status' }, t(catalogError ? 'listUnavailable'
      : trimmed !== '' ? 'noMatches' : tree ? 'empty.noWorkspacesTitle' : 'noSessions'))

  function renderRows() {
    const children = new Map<string | undefined, number[]>()
    for (const [i, row] of rows.entries()) {
      const siblings = children.get(row.parentKey)
      if (siblings === undefined) children.set(row.parentKey, [i])
      else siblings.push(i)
    }
    const renderGroup = (parentKey?: string): ReactNode[] => (children.get(parentKey) ?? []).map(i => {
      const row = rows[i]
      const id = optionId(i)
      const groupId = children.has(row.key) ? `${id}-children` : undefined
      const option = h(ResultRow, {
        key: row.key, row, id, groupId, t, now, choosing, active: i === index,
        selected: row.kind === 'session' ? row.session.id === currentId
          : row.match.branch.workspace?.id !== undefined && row.match.branch.workspace.id === hero?.selectedId,
        currentBranch: currentBranches.has(row.key), useSessionStatus, statusLabel,
        tree, busy, onChoose: () => choose(row), onFocus: () => setActiveKey(row.key),
        onToggle: row.kind === 'branch' ? () => { setActiveKey(row.key); toggle(row) } : undefined,
      })
      if (row.kind === 'session') return option
      return h('div', { key: row.key, role: 'presentation' }, option,
        groupId === undefined ? null
          : h('div', { id: groupId, role: 'group', className: 'wsp-tree-children' }, renderGroup(row.key)),
      )
    })
    return renderGroup()
  }

  return h(SwitcherDialog, {
    title, panelRef, busy: busy || pending, t, onClose: controls.close, onKeyDown,
    ...(choosing ? { subtitle: t('dialog.subtitle') } : {}),
    search: renaming === undefined ? h(SearchField, {
      t, value: query, onChange: changeQuery, inputRef, tree,
      label: t(tree ? choosing ? 'search.label' : 'searchWorkspaceTree' : 'sessionSearch'),
      listId: rows.length === 0 ? undefined : listId,
      activeOptionId: active === undefined ? undefined : optionId(index),
    }) : h('form', {
      className: 'wsp-rename', onSubmit: (event: React.FormEvent) => {
        event.preventDefault()
        if (!canSaveRename || renameTitle === undefined) return
        void write('rename', t('renameFailed'), async () => {
          await renameWorkspace(renaming.id, renameTitle)
          if (mounted.current) setRenaming(undefined)
        })
      },
    },
      h('div', { className: 'wsp-search' }, h('input', {
        className: 'wsp-search-input', ref: inputRef, 'aria-label': t('renameWorkspace'),
        value: renaming.title, readOnly: busy,
        onChange: event => setRenaming({ ...renaming, title: event.target.value }),
      })),
      h('button', { type: 'submit', className: 'wsp-foot-action', disabled: !canSaveRename }, t('save')),
      h('button', { type: 'button', className: 'wsp-foot-action', onClick: () => setRenaming(undefined) }, t('back')),
    ),
    body: rows.length === 0 ? empty : h('div', {
      className: 'wsp-list wsp-navigation-list', role: tree ? 'tree' : 'listbox', id: listId, 'aria-label': title,
    }, renderRows()),
    status: h(React.Fragment, null,
      groupingError ? h('div', { className: 'wsp-warning', role: 'status' }, t('group.failed')) : null,
      catalogError && rows.length > 0 ? h('div', { className: 'wsp-warning', role: 'status' }, t('listUnavailable')) : null,
      status === undefined ? null : h(ErrorBanner, {
        ...status, dismiss: t('dismiss'), onDismiss: error === undefined ? remote.dismiss : () => setError(undefined),
      }),
    ),
    toolbar: renaming === undefined ? h('div', { className: 'wsp-navigation-toolbar' },
      h('label', { className: 'wsp-group-label' }, t('group.options'),
        h('select', {
          className: 'wsp-group-select', value: displayedGroup, disabled: busy,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
            const id = event.currentTarget.value
            preferenceChoice.current = id
            setGroupId(id)
            setActiveKey(undefined)
          },
        }, choices.map(choice => h('option', { key: choice.id, value: choice.id }, choice.label))),
      ),
      canAdd && addWorkspace !== undefined ? h(AddWorkspaceButton, { busy: writeKind === 'add', t, onClick: add }) : null,
    ) : null,
    footer: h(React.Fragment, null,
      h('div', { className: 'wsp-navigation-actions' },
        choosing || focusedWorkspace === undefined || renaming !== undefined ? null : h(RenameButton, {
          useWorkspaceAccess, workspaceId: focusedWorkspace.id, name: focusedWorkspace.title, t, busy,
          onClick: () => setRenaming({ id: focusedWorkspace.id, title: focusedWorkspace.title, original: focusedWorkspace.title }),
        }),
      ),
      h('span', { className: 'wsp-dialog-count', role: 'status' },
        remote.pending ? t('searching') : remote.hasMore ? t('refineSearch')
          : pending ? t('loadingList') : trimmed === '' && tree ? null : t('countResults', { n: rows.length })),
    ),
  })
}

function RenameButton({ useWorkspaceAccess, workspaceId, name, t, busy, onClick }: {
  useWorkspaceAccess: OverlayProps['useWorkspaceAccess']; workspaceId: WorkspaceId
  name: string; t: TranslateSeat; busy: boolean; onClick: () => void
}): ReactNode {
  return useWorkspaceAccess(workspaceId, 'workspace/rename') ? h('button', {
    type: 'button', className: 'wsp-foot-action wsp-rename-action', disabled: busy, onClick,
    title: t('renameNamedWorkspace', { name }),
  }, h('span', null, t('renameNamedWorkspace', { name }))) : null
}

type BranchRow = {
  kind: 'branch'; key: string; depth: number; parentKey?: string; title: string
  match: TreeMatch; expanded: boolean; expandable: boolean
}
type NavigationRow = BranchRow | {
  kind: 'session'; key: string; depth: number; parentKey?: string
  session: SessionRow & { snippet?: string | undefined }
}

function flattenTree(matches: readonly TreeMatch[], expanded: ReadonlyMap<string, boolean>, auto: ReadonlySet<string>,
  filtering: boolean, t: TranslateSeat, depth = 0, parentKey?: string,
): NavigationRow[] {
  return matches.flatMap(match => {
    const { key, workspace } = match.branch
    const expandable = match.children.length + match.sessions.length > 0
    const open = expandable && (expanded.get(key) ?? (filtering || auto.has(key) || match.branch.directory !== undefined))
    const row: BranchRow = { kind: 'branch', key, depth, ...(parentKey === undefined ? {} : { parentKey }),
      match, title: workspace?.title ?? match.branch.directory?.title ?? t('ungrouped'), expandable, expanded: open }
    if (!open) return [row]
    return [row,
      ...flattenTree(match.children, expanded, auto, filtering, t, depth + 1, key),
      ...match.sessions.map((session): NavigationRow => ({ kind: 'session', key: `session:${session.id}`,
        depth: depth + 1, parentKey: key, session })),
    ]
  })
}

function ResultRow({ row, id, groupId, t, now, choosing, active, selected, currentBranch,
  useSessionStatus, statusLabel, tree, busy, onChoose, onFocus, onToggle,
}: {
  row: NavigationRow; id: string; groupId: string | undefined; t: TranslateSeat; now: number;
  choosing: boolean; active: boolean; selected: boolean; currentBranch: boolean; tree: boolean; busy: boolean;
  useSessionStatus: OverlayProps['useSessionStatus']; statusLabel: NavigationActions['statusLabel'];
  onChoose: () => void; onFocus: () => void; onToggle?: (() => void) | undefined
}): ReactNode {
  const branch = row.kind === 'branch' ? row : undefined
  const session = row.kind === 'session' ? row.session : undefined
  const workspace = branch?.match.branch.workspace
  const directory = branch?.match.branch.directory
  const title = branch?.title ?? session?.title
  const path = workspace?.path ?? directory?.path ?? session?.path
  const splitDisclosure = choosing && workspace !== undefined && branch?.expandable === true
  const hasSearchMeta = Boolean(session?.snippet || (!tree && (session?.workspace || session?.path)))
  const option = h('button', {
    id, type: 'button', role: tree ? 'treeitem' : 'option', tabIndex: -1,
    'aria-level': tree ? row.depth + 1 : undefined, 'aria-owns': groupId,
    'aria-expanded': branch?.expandable ? branch.expanded : undefined,
    'aria-selected': selected, 'aria-disabled': busy || undefined, 'data-wsp-navigation-row': true,
    'data-active': active || undefined, 'data-selected': selected || undefined,
    'data-search-meta': hasSearchMeta || undefined,
    className: 'wsp-row wsp-navigation-row', title: path || title, onClick: onChoose, onFocus,
  },
    branch === undefined ? (session && h(SessionMarker, { session, useSessionStatus, statusLabel }))
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
      ) : h('span', { className: 'wsp-row-title' }, title),
      hasSearchMeta ? h('span', { className: 'wsp-search-meta' },
        tree ? null : h('span', { className: 'wsp-row-path' }, session?.workspace || session?.path),
        session?.snippet ? h('span', { className: 'wsp-row-path wsp-session-snippet' }, session.snippet) : null,
      ) : null,
    ),
    session === undefined ? null : h('span', { className: 'wsp-row-time' }, relativeTime(session.latest, now, t)),
    choosing && selected ? h('span', { className: 'wsp-row-check', 'aria-hidden': true }, h(CheckGlyph, { size: 14 })) : null,
  )
  if (!splitDisclosure) return option
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

function SessionMarker({ session, useSessionStatus, statusLabel }: {
  session: SessionRow; useSessionStatus: OverlayProps['useSessionStatus']; statusLabel: NavigationActions['statusLabel']
}): ReactNode {
  const label = useSessionStatus(statuses => {
    const status = statuses.get(session.id)
    switch (status?.pendingInteraction?.kind) {
      case 'approval': return 'status.waitingApproval'
      case 'plan-review': return 'status.planReview'
      case 'question': return 'status.waitingAnswer'
    }
    if (status?.running ?? session.running) return 'status.running'
    return status?.completionUnread ? 'status.completed' : undefined
  })
  return h('span', { className: 'wsp-row-icon' }, label === undefined ? null : h('span', {
    className: 'wsp-session-dot', role: 'img', 'aria-label': statusLabel(label), title: statusLabel(label),
    'data-state': label === 'status.running' ? 'running' : label === 'status.completed' ? 'done' : 'waiting',
  }))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function useContentSearch(query: string, search: Search) {
  const [result, setResult] = useState<{ query: string; hits: readonly SearchHit[]; hasMore: boolean; error?: string }>()
  useEffect(() => {
    setResult(undefined)
    if (query === '' || query.length > 500) return
    const abort = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await search(query, abort.signal)
        if (abort.signal.aborted) return
        setResult(response.ok ? { query, hits: response.value.items, hasMore: response.value.hasMore }
          : { query, hits: NO_HITS, hasMore: false, error: response.error.message })
      } catch (reason) {
        if (!abort.signal.aborted) setResult({ query, hits: NO_HITS, hasMore: false, error: errorMessage(reason) })
      }
    }, 250)
    return () => { window.clearTimeout(timer); abort.abort() }
  }, [query, search])
  const current = query !== '' && result?.query === query ? result : undefined
  return {
    hits: current?.hits ?? NO_HITS, hasMore: current?.hasMore ?? false, error: current?.error,
    pending: query !== '' && query.length <= 500 && current === undefined,
    dismiss: () => setResult(current === undefined ? undefined : { query, hits: current.hits, hasMore: current.hasMore }),
  }
}
