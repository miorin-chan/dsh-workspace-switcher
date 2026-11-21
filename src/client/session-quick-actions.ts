/**
 * Adapted from ArchiveSession.tsx and PinSession.tsx in DSH 0.2.2-rc.5.
 * Copyright (c) 2026 DeepSeek. MIT License, see ../../LICENSE.deepseek-harness.
 */
import {
  IconArchiveOutlineRegular, IconUnarchiveOutlineRegular, IconPinFillRegular, IconPinOutlineRegular, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ContextMenuTarget } from '@deepseek-ai/dsh-client-ui-context-menu/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { createElement as h } from 'react'

type SessionTarget = Extract<ContextMenuTarget, { kind: 'session' }>
type ActionId = 'session.archive/archive' | 'session.pin/pin'
type ActionIcon = 'workspace.archive' | 'workspace.unarchive' | 'workspace.pin' | 'workspace.unpin'
export type SessionActionAccess = (sessionId: SessionTarget['value']['sessionId'],
  endpoint: 'workspace/archiveSession' | 'workspace/unarchiveSession' | 'workspace/pinSession' | 'workspace/unpinSession') => boolean
export type RunSessionAction = (target: SessionTarget, id: ActionId, icon: ActionIcon) => void

export function SessionQuickActions({ target, archived, pinned, useSessionAccess, t, runSessionAction }: {
  target: SessionTarget
  archived: boolean
  pinned: boolean
  useSessionAccess: SessionActionAccess
  t: PropsLocale<'workspace'>['t']
  runSessionAction: RunSessionAction
}) {
  const { sessionId } = target.value
  const canArchive = useSessionAccess(sessionId, archived ? 'workspace/unarchiveSession' : 'workspace/archiveSession')
  const canPin = useSessionAccess(sessionId, pinned ? 'workspace/unpinSession' : 'workspace/pinSession')
  const archive = canArchive ? h(Tooltip, {
    label: t(archived ? 'actions.unarchive' : 'actions.archive'), side: 'bottom', align: 'end', delayMs: 500, portal: true,
    children: h('button', {
      type: 'button', className: 'wsp-row-action wsp-row-archive',
      'aria-label': t(archived ? 'menu.unarchiveSession' : 'menu.archiveSession'),
      onClick: () => runSessionAction(target, 'session.archive/archive', archived ? 'workspace.unarchive' : 'workspace.archive'),
    }, h(archived ? IconUnarchiveOutlineRegular : IconArchiveOutlineRegular, { size: 14 })),
  }) : null
  const pin = !archived && canPin ? h(Tooltip, {
    label: t(pinned ? 'actions.unpin' : 'actions.pin'), side: 'bottom', align: 'end', delayMs: 500, portal: true,
    children: h('button', {
      type: 'button', className: 'wsp-row-action wsp-row-pin', 'data-pinned': pinned || undefined,
      'aria-label': t(pinned ? 'menu.unpinSession' : 'menu.pinSession'),
      onClick: () => runSessionAction(target, 'session.pin/pin', pinned ? 'workspace.unpin' : 'workspace.pin'),
    }, h(pinned ? IconPinFillRegular : IconPinOutlineRegular, { size: 14 })),
  }) : null
  return h('span', { className: 'wsp-row-quick-actions' }, archive, pin)
}
