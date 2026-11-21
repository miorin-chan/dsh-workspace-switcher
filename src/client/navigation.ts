import * as React from 'react'
import type { ReactNode } from 'react'
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { AddWorkspaceButton, ErrorBanner, SearchField, Skeleton } from './components'
import { SwitcherDialog, trapTab } from './dialog'
import { CheckGlyph, ChevronRightGlyph, FolderGlyph } from './glyphs'
import type { TranslateSeat } from './labels'
import { relativeTime } from './model'
import {
  buildNavigation, filterTree, initialExpansion, searchSessions,
  type NavigationCatalog, type SearchHit, type SessionId, type SessionRow, type TreeMatch,
} from './navigation-model'
import type { createSwitcherControls, SwitcherMode } from './shortcuts'
import type { SnapshotHook } from './view'

const h = React.createElement
const { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } = React
const NO_HITS: readonly SearchHit[] = []

type Controls = ReturnType<typeof createSwitcherControls>
type Search = (query: string, signal: AbortSignal) => Promise<{
  readonly ok: true
  readonly value: { readonly items: readonly SearchHit[]; readonly hasMore: boolean }
} | { readonly ok: false; readonly error: { readonly message: string } }>

export interface NavigationActions {
  readonly controls: Controls
  readonly searchContent: Search
  readonly openSession: (id: SessionId) => void
  readonly renameWorkspace: (id: WorkspaceId, title: string) => Promise<unknown>
  readonly addWorkspace?: (signal: AbortSignal) => Promise<WorkspaceId | undefined>
}

interface OverlayProps extends NavigationActions {
  readonly t: TranslateSeat
  readonly useWorkspaces: SnapshotHook<WorkspaceSnapshot>
  readonly useSessions: SnapshotHook<NavigationCatalog>
  readonly usePanelInfo: SnapshotHook<{ readonly activePanelId: string | null }>
  readonly useWorkspaceAccess: (id: WorkspaceId, action: 'workspace/rename') => boolean
  readonly useRemoteAccess: (action: 'workspace/create') => boolean
}

export function SwitcherOverlay(props: OverlayProps): ReactNode {
  const mode = useSyncExternalStore(props.controls.subscribe, props.controls.getSnapshot)
  return mode === null ? null : h(NavigationDialog, { ...props, key: mode, mode })
}

function NavigationDialog({ mode, controls, t, useWorkspaces, useSessions, usePanelInfo,
  useWorkspaceAccess, useRemoteAccess, searchContent, openSession, renameWorkspace, addWorkspace,
}: OverlayProps & { mode: SwitcherMode }): ReactNode {
  const workspaces = useWorkspaces(state => state)
  const sessions = useSessions(state => state)
  const showMain = usePanelInfo(state => state.activePanelId === null)
  const canAdd = useRemoteAccess('workspace/create')
  const tree = mode === 'workspaces'
  const hero = tree && showMain ? controls.hero() : undefined
  const choosing = hero !== undefined
  const { roots, sessions: sessionRows, currentId } = useMemo(
    () => buildNavigation(workspaces, sessions, t('defaultName'), t('untitledSession')),
    [workspaces, sessions, t],
  )
  const [query, setQuery] = useState('')
  const [activeKey, setActiveKey] = useState<string>()
  const [addedWorkspaceId, setAddedWorkspaceId] = useState<WorkspaceId>()
  const [expanded, setExpanded] = useState<ReadonlyMap<string, boolean>>(() => new Map())
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
  const remoteQuery = tree ? '' : trimmed.replaceAll('\0', '')
  const remote = useContentSearch(remoteQuery, searchContent)
  const workspaceToReveal = addedWorkspaceId ?? hero?.selectedId
  const autoExpanded = useMemo(() => new Set(initialExpansion(roots, workspaceToReveal,
    workspaceToReveal === undefined ? currentId : undefined)), [roots, workspaceToReveal, currentId])
  const matches = tree ? filterTree(roots, trimmed, choosing, t('ungrouped')) : []
  const treeRows = tree ? flattenTree(matches, expanded, autoExpanded, trimmed !== '', t) : []
  const flatRows = tree ? [] : searchSessions(sessionRows, trimmed, remote.hits)
  const rows: NavigationRow[] = tree ? treeRows : flatRows.map(session => ({
    kind: 'session', key: `session:${session.id}`, depth: 0, session,
  }))
  const activeIndex = rows.findIndex(row => row.key === activeKey)
  const selectedIndex = rows.findIndex(row => row.kind === 'branch'
    ? row.match.branch.workspace?.id !== undefined && row.match.branch.workspace.id === hero?.selectedId
    : row.session.id === currentId)
  const index = activeIndex >= 0 ? activeIndex : trimmed !== '' && rows.length > 0 ? 0 : -1
  const active = rows[index]
  const optionId = (i: number) => `${listId}-${i}`
  const title = t(tree ? choosing ? 'dialog.title' : 'workspaceTree' : 'sessionSearch')
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
  useEffect(() => {
    panelRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active?.key])

  const changeQuery = (value: string) => {
    setQuery(value)
    setActiveKey(undefined)
    setExpanded(new Map())
  }
  const toggle = (row: BranchRow, open = !row.expanded) => {
    if (row.expandable) setExpanded(previous => new Map(previous).set(row.key, open))
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
    body: rows.length === 0 ? empty : h('div', { className: 'wsp-list', role: tree ? 'tree' : 'listbox', id: listId, 'aria-label': title },
      rows.map((row, i) => h(ResultRow, {
        key: row.key, row, id: optionId(i), t, now, choosing, active: i === index,
        selected: row.kind === 'session' ? row.session.id === currentId
          : row.match.branch.workspace?.id !== undefined && row.match.branch.workspace.id === hero?.selectedId,
        tree, busy, onChoose: () => choose(row), onFocus: () => setActiveKey(row.key),
        onToggle: row.kind === 'branch' ? () => { setActiveKey(row.key); toggle(row) } : undefined,
      })),
    ),
    status: h(React.Fragment, null,
      catalogError && rows.length > 0 ? h('div', { className: 'wsp-warning', role: 'status' }, t('listUnavailable')) : null,
      status === undefined ? null : h(ErrorBanner, {
        ...status, dismiss: t('dismiss'), onDismiss: error === undefined ? remote.dismiss : () => setError(undefined),
      }),
    ),
    footer: h(React.Fragment, null,
      h('div', { className: 'wsp-navigation-actions' },
        tree && canAdd && addWorkspace !== undefined && renaming === undefined ? h(AddWorkspaceButton, { busy: writeKind === 'add', t, onClick: () => {
          void write('add', t('addFailed'), async () => {
            const signal = lifetime.current?.signal
            if (signal === undefined) return
            const id = await addWorkspace(signal)
            if (!mounted.current || id === undefined) return
            if (choosing && controls.hero() !== undefined) {
              controls.pickWorkspace(id)
              controls.close()
            } else {
              changeQuery('')
              setAddedWorkspaceId(id)
              setActiveKey(`workspace:${id}`)
              inputRef.current?.focus({ preventScroll: true })
            }
          })
        } }) : null,
        choosing || focusedWorkspace === undefined || renaming !== undefined ? null : h(RenameButton, {
          useWorkspaceAccess, workspaceId: focusedWorkspace.id, name: focusedWorkspace.title, t, busy,
          onClick: () => setRenaming({ id: focusedWorkspace.id, title: focusedWorkspace.title, original: focusedWorkspace.title }),
        }),
      ),
      h('div', { className: 'wsp-hints' },
        h('span', { className: 'wsp-hint' }, t(tree ? 'treeKeys' : 'sessionKeys')),
        h('span', { className: 'wsp-dialog-count', role: 'status' },
          remote.pending ? t('searching') : remote.hasMore ? t('refineSearch')
            : pending ? t('loadingList') : trimmed === '' && tree ? null : t('countResults', { n: rows.length })),
      ),
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
    const open = expandable && (expanded.get(key) ?? (filtering || auto.has(key)))
    const row: BranchRow = { kind: 'branch', key, depth, ...(parentKey === undefined ? {} : { parentKey }),
      match, title: workspace?.title ?? t('ungrouped'), expandable, expanded: open }
    if (!open) return [row]
    return [row,
      ...match.sessions.map((session): NavigationRow => ({ kind: 'session', key: `session:${session.id}`,
        depth: depth + 1, parentKey: key, session })),
      ...flattenTree(match.children, expanded, auto, filtering, t, depth + 1, key),
    ]
  })
}

function ResultRow({ row, id, t, now, choosing, active, selected, tree, busy, onChoose, onFocus, onToggle }: {
  row: NavigationRow; id: string; t: TranslateSeat; now: number; choosing: boolean; active: boolean;
  selected: boolean; tree: boolean; busy: boolean; onChoose: () => void; onFocus: () => void;
  onToggle?: (() => void) | undefined
}): ReactNode {
  const branch = row.kind === 'branch' ? row : undefined
  const session = row.kind === 'session' ? row.session : undefined
  const workspace = branch?.match.branch.workspace
  const title = branch?.title ?? session?.title
  const path = workspace?.path || (tree ? undefined : session?.workspace || session?.path)
  const disclosure = branch?.expandable ? h(ChevronRightGlyph, { size: 14 }) : null
  const option = h('button', {
    id, type: 'button', role: tree ? 'treeitem' : 'option', tabIndex: -1,
    'aria-level': tree ? row.depth + 1 : undefined,
    'aria-expanded': branch?.expandable ? branch.expanded : undefined,
    'aria-selected': selected, 'aria-disabled': busy || undefined, 'data-wsp-navigation-row': true,
    'data-active': active || undefined, 'data-selected': selected || undefined,
    className: 'wsp-row wsp-navigation-row', style: { paddingInlineStart: 8 + Math.min(row.depth, 10) * 16 },
    title: path || title, onClick: onChoose, onFocus,
  },
    branch === undefined ? null : h('span', { className: 'wsp-row-icon' },
      !choosing && disclosure !== null ? h('span', { className: 'wsp-tree-chevron', 'data-expanded': branch.expanded }, disclosure)
        : h(FolderGlyph, { size: 16 })),
    h('span', { className: 'wsp-row-text' },
      h('span', { className: 'wsp-row-title' }, title),
      path ? h('span', { className: 'wsp-row-path' }, path) : null,
      session?.snippet ? h('span', { className: 'wsp-row-path' }, session.snippet) : null,
    ),
    branch !== undefined && branch.match.sessions.length > 0 && !choosing ? h('span', { className: 'wsp-row-count' },
      t(branch.match.sessions.length === 1 ? 'sessions.one' : 'sessions.other', { n: branch.match.sessions.length })) : null,
    session === undefined ? null : h('span', { className: 'wsp-row-time' }, relativeTime(session.latest, now, t)),
    selected ? h('span', { className: 'wsp-row-check', 'aria-hidden': true }, h(CheckGlyph, { size: 14 })) : null,
  )
  if (!choosing || branch === undefined || disclosure === null) return option
  const action = t(branch.expanded ? 'collapseBranch' : 'expandBranch')
  return h('div', { className: 'wsp-tree-option', role: 'presentation' },
    option,
    h('button', {
      type: 'button', className: 'wsp-icon-btn wsp-tree-chevron', tabIndex: -1,
      'aria-label': `${action} ${title}`, 'aria-expanded': branch.expanded,
      'data-expanded': branch.expanded, disabled: busy,
      onClick: () => { onToggle?.(); document.getElementById(id)?.focus({ preventScroll: true }) },
    }, disclosure),
  )
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
