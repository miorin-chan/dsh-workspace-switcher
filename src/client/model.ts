/**
 * Pure picker state: Workspace rows, recency, filtering, and relative time.
 *
 * These helpers carry the whole data policy and have no React or DSH service
 * dependency, so the test suite exercises them directly through `__test`.
 */

import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'

import type { TranslateSeat } from './labels'

/** Rows in the compact shortlist; the rest live in the expanded dialog. */
export const SHORTLIST = 5

/**
 * The Session summary fields recency reads. Internal shape, verified against
 * 0.2.2-rc.5: the session catalog is a standard share without a published
 * type in the packages this bundle types against.
 */
export interface SessionSummary {
  /** Last activity stamp in ISO form, seconds, or milliseconds. */
  readonly updatedAt?: unknown
  /** Who started the Session; subagent Sessions keep their activity but not the row count. */
  readonly origin?: string
}

/** The registry fields a row needs; a structural subset of the Workspace projection. */
export interface WorkspaceItem {
  readonly workspaceId: WorkspaceId
  readonly title?: string
  readonly path?: string
  readonly updatedAt?: unknown
  readonly sessionIds?: readonly string[]
}

/** One display row of the picker. */
export interface WorkspaceRow {
  readonly id: WorkspaceId
  readonly title: string
  readonly path: string
  /** Latest member-Session activity in epoch ms, or the Workspace stamp when unknown. */
  readonly latest: number
  /** Visible member Sessions; subagent Sessions are excluded. */
  readonly count: number
  /** Whether the path says something the title does not, so the compact row shows it. */
  showPath: boolean
}

/**
 * Normalize an ISO string, seconds stamp, or milliseconds stamp to epoch ms.
 * @param value - raw timestamp from a Host projection.
 * @returns epoch milliseconds, or 0 when the value is not a usable stamp.
 */
export function toMillis(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0
    return value < 1e12 ? value * 1000 : value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

/**
 * Leaf segment of a host path.
 * @param path - absolute path.
 * @returns the leaf name, or the input when it has none.
 */
function leafName(path: string): string {
  const parts = String(path).split(/[\\/]/).filter(Boolean)
  return parts.length === 0 ? String(path) : parts[parts.length - 1]
}

/**
 * Shorten a long host path for the compact row: keep two trailing segments.
 * @param value - absolute path.
 * @returns the display path.
 */
export function shortenPath(value: unknown): string {
  const path = typeof value === 'string' ? value : ''
  if (path === '') return ''
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 3) return path
  const separator = path.includes('\\') ? '\\' : '/'
  return '…' + separator + parts.slice(-2).join(separator)
}

/**
 * Build the picker rows from the Workspace registry and Session catalog.
 *
 * Recency is the latest `updatedAt` among the Workspace's member Sessions,
 * falling back to the Workspace's own last-mutation stamp. Rows sort newest
 * first; equal stamps sort by title so the order stays stable.
 * @param items - Workspace rows.
 * @param byId - Session summaries by Session id.
 * @param defaultName - localized name of the automatic Workspace.
 * @returns display rows.
 */
export function buildRows(
  items: readonly WorkspaceItem[] | undefined,
  byId: Readonly<Record<string, SessionSummary | undefined>> | undefined,
  defaultName: string,
): WorkspaceRow[] {
  const rows: WorkspaceRow[] = []
  for (const workspace of items ?? []) {
    const declared = workspace.sessionIds
    const sessionIds: readonly string[] = Array.isArray(declared) ? declared : []
    let latest = 0
    let count = 0
    let readActivity = false
    for (const id of sessionIds) {
      const session = byId === undefined ? undefined : byId[id]
      if (session === undefined) continue
      readActivity = true
      if (session.origin !== 'subagent') count += 1
      const at = toMillis(session.updatedAt)
      if (at > latest) latest = at
    }
    // A rename bumps the Workspace row's own stamp without using the
    // Workspace; prefer real Session activity and fall back only when the
    // catalog has no summary for any member.
    if (!readActivity || latest === 0) latest = toMillis(workspace.updatedAt)
    const path = typeof workspace.path === 'string' ? workspace.path : ''
    const stored = typeof workspace.title === 'string' ? workspace.title : ''
    rows.push({
      id: workspace.workspaceId,
      title: stored === 'default-workspace'
        ? defaultName
        : stored === '' ? leafName(path) : stored,
      path,
      latest,
      count,
      showPath: false,
    })
  }
  rows.sort((left, right) => right.latest - left.latest || left.title.localeCompare(right.title))
  // The compact row keeps its second line only when the path tells the
  // reader something the title does not: a renamed Workspace, the
  // localized default, or a title shared with another row.
  const titleCounts = new Map<string, number>()
  for (const row of rows) titleCounts.set(row.title, (titleCounts.get(row.title) ?? 0) + 1)
  for (const row of rows) {
    row.showPath = row.path !== ''
      && (leafName(row.path).toLowerCase() !== row.title.toLowerCase()
        || (titleCounts.get(row.title) ?? 0) > 1)
  }
  return rows
}

/**
 * Filter rows by whitespace-separated terms; every term must appear in the
 * title or the path.
 * @param rows - display rows.
 * @param query - raw search text.
 * @returns matching rows in their original order.
 */
export function filterRows<T extends Pick<WorkspaceRow, 'title' | 'path'>>(
  rows: readonly T[],
  query: unknown,
): T[] {
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...rows]
  return rows.filter((row) => {
    const haystack = (row.title + ' ' + row.path).toLowerCase()
    return terms.every(term => haystack.includes(term))
  })
}

/**
 * Localized relative time for an activity stamp.
 * @param at - epoch ms, or 0 when unknown.
 * @param now - current epoch ms.
 * @param t - locale seat.
 * @returns the relative label.
 */
export function relativeTime(at: number, now: number, t: TranslateSeat): string {
  if (!at) return ''
  const diff = now - at
  const minute = 60000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return t('time.now')
  if (diff < hour) return t('time.minutes', { n: Math.max(1, Math.floor(diff / minute)) })
  if (diff < day) return t('time.hours', { n: Math.floor(diff / hour) })
  if (diff < 2 * day) return t('time.yesterday')
  if (diff < 7 * day) return t('time.days', { n: Math.floor(diff / day) })
  if (diff < 30 * day) return t('time.weeks', { n: Math.max(1, Math.floor(diff / (7 * day))) })
  if (diff < 365 * day) return t('time.months', { n: Math.max(1, Math.floor(diff / (30 * day))) })
  return t('time.years', { n: Math.max(1, Math.floor(diff / (365 * day))) })
}
