import * as React from 'react'
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { SwitcherDialog, trapTab } from './dialog'
import type { TranslateSeat } from './labels'
import { buildNavigation, type NavigationCatalog } from './navigation-model'
import type { SnapshotHook } from './view'
import type { createRecentSessions } from './recent-sessions'

const h = React.createElement

interface RecentDialogProps {
  readonly useSessions: SnapshotHook<NavigationCatalog>
  readonly useWorkspaces: SnapshotHook<WorkspaceSnapshot>
  readonly recent: ReturnType<typeof createRecentSessions>
  readonly t: TranslateSeat
}

export function RecentSessionDialog({ recent, t, useSessions, useWorkspaces }: RecentDialogProps): React.ReactNode {
  const selection = React.useSyncExternalStore(recent.subscribe, recent.getSnapshot)
  const catalog = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const panel = React.useRef<HTMLDivElement>(null)
  const list = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()
  const ids = selection?.ids
  const rows = React.useMemo(() => ids === undefined ? [] : buildNavigation(workspaces,
    { ...catalog, ids: [...ids] }, t('defaultName'), t('untitledSession')).sessions, [catalog, ids, t, workspaces])
  const activeId = selection?.ids[selection.index]
  const activeIndex = rows.some(row => row.id === activeId) ? selection?.index : undefined
  const instructionsId = `${listId}-instructions`

  React.useLayoutEffect(() => {
    list.current?.focus({ preventScroll: true })
  }, [ids === undefined])
  React.useLayoutEffect(() => {
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (selection === null) return null
  const rowsById = new Map(rows.map(row => [row.id, row]))
  const optionId = (index: number) => `${listId}-${index}`
  const instructions = {
    explicit: 'recentSession.confirm',
    'control-release': 'recentSession.release',
    'control-or-pause': 'recentSession.pause',
  } as const
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = event => {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return
    if (event.key === 'Escape') recent.cancel()
    else if (event.target === list.current && event.key === 'Enter') recent.confirm()
    else if (event.target === list.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      recent.step(event.key === 'ArrowDown' ? 1 : -1, 'explicit')
    } else {
      if (!event.ctrlKey && !event.altKey && !event.metaKey) trapTab(event, panel.current)
      return
    }
    event.preventDefault()
    event.stopPropagation()
  }
  return h(SwitcherDialog, {
    title: t('recentSession.title'), compact: true, panelRef: panel, busy: false, t,
    onClose: recent.cancel, onKeyDown,
    body: h('div', {
      ref: list, className: 'wsp-modal-list wsp-list', role: 'listbox', tabIndex: 0,
      'aria-label': t('recentSession.title'), 'aria-describedby': instructionsId,
      'aria-activedescendant': activeIndex === undefined ? undefined : optionId(activeIndex),
    }, selection.ids.map((id, index) => {
      const row = rowsById.get(id)
      if (row === undefined) return null
      const sameName = rows.filter(candidate => candidate.title === row.title && candidate.workspace === row.workspace)
      const workspace = row.workspace || t('ungrouped')
      const details = [workspace]
      if (sameName.length > 1 && row.path !== '') details.push(row.path)
      if (sameName.some(candidate => candidate.id !== id && candidate.path === row.path)) details.push(id.slice(0, 8))
      const subtitle = details.join(' · ')
      return h('div', {
        key: id, id: optionId(index), role: 'option', className: 'wsp-row',
        'aria-selected': id === activeId, 'data-active': id === activeId,
        onClick: () => recent.confirm(id),
      }, h('span', { className: 'wsp-row-text' },
        h('span', { className: 'wsp-row-title' }, row.title),
        h('span', { className: 'wsp-row-path', title: subtitle }, subtitle)))
    })),
    status: selection.failed ? h('div', { className: 'wsp-error', role: 'alert' }, t('openFailed')) : undefined,
    footer: h('span', { id: instructionsId },
      t(instructions[selection.confirmation])),
  })
}
