import { WORKSPACES, type WorkspaceGrouping, type WorkspaceGroupNode } from './grouping'
import type { SessionListState, SessionSearchResultItem } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import { orderByRecency, reconcileManualOrder } from './session-order'
import { FLAT_ORDER, UNGROUPED_ORDER, type ArchiveFilter, type OrderBy, type SessionOrders } from './view-preferences'
import { buildRows, filterRows, toMillis, type WorkspaceRow } from './model'

export type SessionId = SessionListState['ids'][number]
export type NavigationCatalog = Pick<SessionListState, 'ids' | 'byId' | 'phase'>

export interface SessionRow {
  readonly id: SessionId
  readonly title: string
  readonly path: string
  readonly workspace: string
  readonly workspaceId: WorkspaceId | undefined
  readonly latest: number
  readonly running: boolean
  readonly archived: boolean
  readonly pinned: boolean
}

export interface WorkspaceBranch {
  readonly key: string
  readonly workspace: WorkspaceRow | undefined
  readonly directory?: { readonly title: string; readonly path: string }
  readonly sessions: SessionRow[]
  readonly children: WorkspaceBranch[]
}

export type SearchHit = SessionSearchResultItem

/** The Host message-content search the dialog drives: a settled page, or the refusal it reports. */
export type ContentSearch = (query: string, signal: AbortSignal) => Promise<{
  readonly ok: true
  readonly value: { readonly items: readonly SearchHit[]; readonly hasMore: boolean }
} | { readonly ok: false; readonly error: { readonly message: string } }>

/** The content hits one query shows, and whether the Host bounded its page. */
export interface ContentHits {
  readonly hits: readonly SearchHit[]
  readonly hasMore: boolean
}

const NO_CONTENT_HITS: ContentHits = { hits: [], hasMore: false }

/**
 * The content hits a settled search contributes to its query. DSH ships
 * content search switched off (`openAt: never`), and its sidebar drops a
 * refused or rejected search without a notice and keeps the local title,
 * path, and ID matches. The dialog follows the same rule.
 * @param response - the settled search result, or `undefined` when it rejected.
 * @returns the hits to merge, empty when the search did not answer.
 */
export function contentHits(response: Awaited<ReturnType<ContentSearch>> | undefined): ContentHits {
  return response?.ok ? { hits: response.value.items, hasMore: response.value.hasMore } : NO_CONTENT_HITS
}

/**
 * folderPath, owningParentFolder, and mainSessionId are adapted from DeepSeek Harness dsh-v0.2.2-rc.5,
 * packages/client/ui-workspace/src/client/tree.ts. Copyright (c) 2026 DeepSeek.
 * Distributed under the MIT license in LICENSE.deepseek-harness.
 */
export function mainSessionId(byId: NavigationCatalog['byId']): SessionId | undefined {
  return Object.values(byId).find(({ retainedBy }) =>
    'mainView' in retainedBy && typeof retainedBy.mainView === 'number' && retainedBy.mainView > 0)?.id
}

/** Normalize separators for comparison without interpreting POSIX backslashes as separators. */
function folderPath(path: string): string {
  const windows = /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\')
  return (windows ? path.replaceAll('\\', '/') : path).replace(/\/+$/, '')
}

/** Find the nearest registered ancestor, excluding the Workspace directory itself. */
function owningParentFolder(path: string, parents: readonly string[]): string | undefined {
  const child = folderPath(path)
  let owner: string | undefined
  let length = -1
  for (const parent of parents) {
    const root = folderPath(parent)
    if (root.length > length && child !== root && child.startsWith(`${root}/`)) {
      owner = parent
      length = root.length
    }
  }
  return owner
}

function workspaceRoots(branches: readonly WorkspaceBranch[]): WorkspaceBranch[] {
  const byPath = new Map<string, WorkspaceBranch>()
  const localPaths: string[] = []
  const uncPaths: string[] = []
  for (const branch of branches) {
    const path = branch.workspace?.path
    if (!path) continue
    const key = folderPath(path)
    const unc = key.startsWith('//')
    // UNC shares start their own trees. A bare server cannot own a share.
    if ((unc && key.indexOf('/', 2) < 0) || byPath.has(key)) continue
    byPath.set(key, branch)
    if (unc) uncPaths.push(key)
    else localPaths.push(key)
  }
  const roots: WorkspaceBranch[] = []
  for (const branch of branches) {
    const path = branch.workspace?.path ?? ''
    const key = folderPath(path)
    const parents = key.startsWith('//') && key.indexOf('/', 2) >= 0 ? uncPaths : localPaths
    const parent = owningParentFolder(key, parents)
    const owner = parent === undefined ? undefined : byPath.get(parent)
    if (owner === undefined) roots.push(branch)
    else owner.children.push(branch)
  }
  return roots
}

function projectedRoots(grouping: WorkspaceGrouping, branches: ReadonlyMap<string, WorkspaceBranch>): WorkspaceBranch[] {
  const input = [...branches.values()].flatMap(({ workspace }) => workspace === undefined
    ? [] : [{ workspaceId: workspace.id, path: workspace.path }])
  const seen = new Set<string>()
  const convert = (node: WorkspaceGroupNode): WorkspaceBranch => {
    const key = node.kind === 'workspace' ? `workspace:${node.workspaceId}` : `directory:${node.key}`
    if (seen.has(key)) throw new Error(`Repeated node: ${key}`)
    seen.add(key)
    const children = (node.children ?? []).map(convert)
    if (node.kind === 'directory') {
      return { key, directory: { title: node.title, path: node.path }, workspace: undefined, sessions: [], children }
    }
    const branch = branches.get(node.workspaceId)
    if (branch === undefined) throw new Error(`Unknown workspace: ${node.workspaceId}`)
    return { ...branch, children }
  }
  const roots = grouping.project(input).map(convert)
  if (input.some(({ workspaceId }) => !seen.has(`workspace:${workspaceId}`))) {
    throw new Error('A registered workspace is missing from the grouping')
  }
  return roots
}

export function buildNavigation(
  snapshot: WorkspaceSnapshot, catalog: NavigationCatalog, defaultName: string, untitled: string,
  groupId?: string, grouping?: WorkspaceGrouping,
  view: { orderBy: OrderBy; archiveFilter: ArchiveFilter; orders: SessionOrders } = {
    orderBy: 'updated', archiveFilter: 'hide-archived', orders: {},
  },
) {
  const { byId } = catalog
  const workspaceRows = buildRows(snapshot.items, byId, defaultName)
  const branchById = new Map<string, WorkspaceBranch>(workspaceRows.map(workspace => [workspace.id, {
    key: `workspace:${workspace.id}`, workspace, children: [], sessions: [],
  }]))
  const workspaceBySession = new Map<SessionId, WorkspaceRow>()
  for (const item of snapshot.items) {
    const row = branchById.get(item.workspaceId)?.workspace
    if (row === undefined) continue
    for (const id of item.sessionIds) {
      if (!workspaceBySession.has(id)) workspaceBySession.set(id, row)
    }
  }

  const archived = new Set(snapshot.archivedSessionIds)
  const pinned = new Set(snapshot.pinnedSessionIds)
  const rowsById = new Map<SessionId, SessionRow>()
  const members = new Map<string, SessionId[]>([[FLAT_ORDER, []], [UNGROUPED_ORDER, []]])
  const currentId = mainSessionId(byId)
  for (const id of catalog.ids) {
    const session = byId[id]
    if (session === undefined || session.blank || session.origin === 'subagent') continue
    const workspace = workspaceBySession.get(session.id)
    const isArchived = archived.has(id)
    rowsById.set(id, {
      id, title: session.title?.trim() || untitled,
      path: workspace?.path || session.cwd || '', workspace: workspace?.title ?? '',
      workspaceId: workspace?.id, latest: toMillis(session.updatedAt), running: session.running === true,
      archived: isArchived, pinned: !isArchived && pinned.has(id),
    })
    members.get(FLAT_ORDER)?.push(id)
    const key = workspace === undefined ? UNGROUPED_ORDER : `workspace:${workspace.id}`
    const account = members.get(key)
    if (account === undefined) members.set(key, [id])
    else account.push(id)
  }
  const orders = Object.fromEntries([...members].map(([key, ids]) => {
    const order = view.orderBy === 'manual'
      ? reconcileManualOrder(ids, view.orders[key], byId, snapshot)
      : orderByRecency(ids, byId)
    return [key, order]
  }))
  const visible = (key: string) => {
    const leading: SessionRow[] = []
    const rest: SessionRow[] = []
    for (const id of orders[key] ?? []) {
      const row = rowsById.get(id)
      if (row === undefined || (view.archiveFilter === 'hide-archived' && row.archived)
        || (view.archiveFilter === 'only-archived' && !row.archived)) continue
      if (row.pinned) leading.push(row)
      else rest.push(row)
    }
    return [...leading, ...rest]
  }
  const sessions = visible(FLAT_ORDER)
  const ungrouped: WorkspaceBranch = {
    key: UNGROUPED_ORDER, workspace: undefined, children: [], sessions: visible(UNGROUPED_ORDER),
  }
  for (const branch of branchById.values()) branch.sessions.push(...visible(branch.key))
  const branches = [...branchById.values()]
  let roots: WorkspaceBranch[] | undefined
  let groupingError = false
  if (grouping !== undefined) {
    try {
      roots = projectedRoots(grouping, branchById)
    } catch (error) {
      console.warn(`[workspace switcher] Grouping ${grouping.id} failed`, error)
      groupingError = true
    }
  }
  roots ??= groupId === WORKSPACES ? branches : workspaceRoots(branches)
  if (ungrouped.sessions.length > 0) roots.push(ungrouped)
  if (view.archiveFilter === 'only-archived') roots = keepArchivedBranches(roots)
  return { roots, sessions, currentId, groupingError, orders }
}

function keepArchivedBranches(roots: WorkspaceBranch[]): WorkspaceBranch[] {
  return roots.flatMap(branch => {
    const children = keepArchivedBranches(branch.children)
    return branch.sessions.length > 0 || children.length > 0 ? [{ ...branch, children }] : []
  })
}

export function searchSessions(rows: readonly SessionRow[], query: string, hits: readonly SearchHit[]) {
  const snippets = new Map(hits.map(hit => [hit.sessionId, hit.snippet]))
  const metadata = query === '' ? rows : filterRows(rows.map(row => ({
    id: row.id, title: row.title, path: `${row.workspace} ${row.path} ${row.id}`, row,
  })), query).map(match => match.row)
  const localIds = new Set(metadata.map(row => row.id))
  const byId = new Map(rows.map(row => [row.id, row]))
  return [...metadata, ...[...snippets.keys()].flatMap(id => {
    const row = byId.get(id)
    return row === undefined || localIds.has(id) ? [] : [row]
  })].map(row => ({ ...row, snippet: snippets.get(row.id) }))
}

export interface TreeMatch {
  readonly branch: WorkspaceBranch
  readonly children: TreeMatch[]
  readonly sessions: (SessionRow & { snippet?: string | undefined })[]
}

export function filterTree(
  roots: readonly WorkspaceBranch[], query: string, choosing: boolean, ungrouped: string,
  hits: readonly SearchHit[] = [],
): TreeMatch[] {
  const bySession = new Map(hits.map(hit => [hit.sessionId, hit.snippet]))
  return matchBranches(roots, query)

  function matchBranches(branches: readonly WorkspaceBranch[], text: string): TreeMatch[] {
    return branches.flatMap(branch => {
      if (choosing && branch.workspace === undefined && branch.directory === undefined) return []
      const matches = filterRows([branch.workspace ?? branch.directory ?? { title: ungrouped, path: '' }], text).length > 0
      const children = matchBranches(branch.children, matches ? '' : text)
      const hits = choosing ? [] : branch.sessions.filter(session => matches || bySession.has(session.id)
        || filterRows([session], text).length > 0)
        .map(session => ({ ...session, snippet: bySession.get(session.id) }))
      return matches || children.length > 0 || hits.length > 0 ? [{ branch, children, sessions: hits }] : []
    })
  }
}

export type BranchRow = {
  kind: 'branch'; key: string; depth: number; parentKey?: string; title: string
  match: TreeMatch; expanded: boolean; expandable: boolean
}
export type SessionResult = {
  kind: 'session'; key: string; depth: number; parentKey?: string
  session: SessionRow & { snippet?: string | undefined }
  /**
   * The row opens its parent's own sessions after a block of child branches.
   * The native sidebar runs the two blocks together; the switcher draws a
   * divider here so an expanded child subtree visibly ends before them.
   */
  followsBranches: boolean
}
export type NavigationRow = BranchRow | SessionResult

/**
 * Flatten the visible tree in display order: each open branch lists its child
 * branches first, as the native sidebar does, then its own sessions.
 */
export function flattenTree(matches: readonly TreeMatch[], expanded: ReadonlyMap<string, boolean>, auto: ReadonlySet<string>,
  filtering: boolean, ungrouped: string, depth = 0, parentKey?: string,
): NavigationRow[] {
  return matches.flatMap(match => {
    const { key, workspace } = match.branch
    const expandable = match.children.length + match.sessions.length > 0
    const open = expandable && (expanded.get(key) ?? (filtering || auto.has(key) || match.branch.directory !== undefined))
    const row: BranchRow = { kind: 'branch', key, depth, ...(parentKey === undefined ? {} : { parentKey }),
      match, title: workspace?.title ?? match.branch.directory?.title ?? ungrouped, expandable, expanded: open }
    if (!open) return [row]
    return [row,
      ...flattenTree(match.children, expanded, auto, filtering, ungrouped, depth + 1, key),
      ...match.sessions.map((session, i): NavigationRow => ({ kind: 'session', key: `session:${session.id}`,
        depth: depth + 1, parentKey: key, session, followsBranches: i === 0 && match.children.length > 0 })),
    ]
  })
}

export function initialExpansion(roots: readonly WorkspaceBranch[], workspaceId: WorkspaceId | undefined, currentId: SessionId | undefined): string[] {
  for (const branch of roots) {
    if ((workspaceId !== undefined && branch.workspace?.id === workspaceId)
      || branch.sessions.some(session => session.id === currentId)) return [branch.key]
    const descendants = initialExpansion(branch.children, workspaceId, currentId)
    if (descendants.length > 0) return [branch.key, ...descendants]
  }
  return []
}
