/**
 * Adapted from @deepseek-ai/dsh-client-ui-workspace 0.2.2-rc.5,
 * src/client/rows/Rows.tsx (sessionStatuses) and src/client/tree.ts (live status derivation).
 * Copyright (c) 2026 DeepSeek. MIT License, see ../../LICENSE.deepseek-harness.
 */
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'

type SessionId = SessionListState['ids'][number]
type StatusCatalog = Pick<SessionListState, 'byId'> & Partial<Pick<SessionListState, 'projectionsBySession'>>

/** Presentation fields used from the standard useSessionStatus snapshot. */
export type SessionStatusSnapshot = ReadonlyMap<SessionId, {
  readonly running: boolean | undefined
  readonly pendingInteraction: { readonly kind: string } | undefined
  readonly completionUnread: boolean
}>

const PENDING_LABELS = {
  approval: ['status.waitingApproval', 'status.compact.approval'],
  'plan-review': ['status.planReview', 'status.compact.planReview'],
  question: ['status.waitingAnswer', 'status.compact.answer'],
} as const

type PendingKind = keyof typeof PENDING_LABELS
type SessionStatusLabel = typeof PENDING_LABELS[PendingKind][number]
  | 'status.subagentsRunning.one' | 'status.subagentsRunning.other'
  | 'status.running' | 'status.idle'

export type SessionStatusTranslate = (key: SessionStatusLabel, params?: { n: number }) => string

function completionUnreadLabel(t: SessionStatusTranslate): string {
  // DSH 0.2.3 renamed workspace locale key `status.completed` to `status.unread`.
  const lookup = t as (key: string) => string
  const unread = lookup('status.unread')
  return unread !== 'status.unread' ? unread : lookup('status.completed')
}

interface SessionStatus {
  readonly state: StateDotState
  readonly label: string
  /** Compact text that can replace the row's update time. */
  readonly trailingLabel?: string
}

/** Project the primary status and any secondary subagent activity in display order. */
export function sessionStatuses(
  session: { readonly id: SessionId; readonly running: boolean },
  catalog: StatusCatalog,
  statuses: SessionStatusSnapshot,
  t: SessionStatusTranslate,
): readonly [SessionStatus, ...SessionStatus[]] {
  const live = statuses.get(session.id)
  const runningSubagentCount = catalog.projectionsBySession?.[session.id]?.values.subagentCatalog?.reduce(
    (count, child) => count + ((statuses.get(child.id)?.running ?? catalog.byId[child.id]?.running) === true ? 1 : 0),
    0,
  ) ?? 0
  const subagents: SessionStatus | undefined = runningSubagentCount === 0
    ? undefined
    : {
      state: 'ongoing',
      label: t(runningSubagentCount === 1 ? 'status.subagentsRunning.one' : 'status.subagentsRunning.other', {
        n: runningSubagentCount,
      }),
    }

  const pending = live?.pendingInteraction?.kind
  if (pending === 'approval' || pending === 'plan-review' || pending === 'question') {
    const [label, trailingLabel] = PENDING_LABELS[pending]
    const primary: SessionStatus = { state: 'warning', label: t(label), trailingLabel: t(trailingLabel) }
    return subagents === undefined ? [primary] : [primary, subagents]
  }
  if (live?.running ?? session.running) {
    const primary: SessionStatus = { state: 'ongoing', label: t('status.running') }
    return subagents === undefined ? [primary] : [primary, subagents]
  }
  if (subagents !== undefined) return [subagents]
  if (live?.completionUnread) return [{ state: 'done', label: completionUnreadLabel(t) }]
  return [{ state: 'idle', label: t('status.idle') }]
}
