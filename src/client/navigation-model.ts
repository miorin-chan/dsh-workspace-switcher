import { WORKSPACES, type WorkspaceGrouping, type WorkspaceGroupNode } from './grouping'
import type { SessionListState, SessionSearchResultItem } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
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
}

export interface WorkspaceBranch {
  readonly key: string
  readonly workspace: WorkspaceRow | undefined
  readonly directory?: { readonly title: string; readonly path: string }
  readonly sessions: SessionRow[]
  readonly children: WorkspaceBranch[]
}

export type SearchHit = SessionSearchResultItem

function directoryKey(path: string): string {
  const windows = /^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\')
  return (windows ? path.replaceAll('\\', '/') : path).replace(/\/+$/, '')
}

function parentPath(path: string): string | undefined {
  const separator = path.lastIndexOf('/')
  if (separator < 0 || (path.startsWith('//') && separator <= path.indexOf('/', 2))) return undefined
  return path.slice(0, separator)
}

function workspaceRoots(branches: readonly WorkspaceBranch[]): WorkspaceBranch[] {
  const byPath = new Map<string, WorkspaceBranch>()
  for (const branch of branches) {
    const path = branch.workspace?.path
    if (path) {
      const key = directoryKey(path)
      if (!byPath.has(key)) byPath.set(key, branch)
    }
  }
  const roots: WorkspaceBranch[] = []
  for (const branch of branches) {
    const path = branch.workspace?.path
    let parent = path ? parentPath(directoryKey(path)) : undefined
    while (parent !== undefined && !byPath.has(parent)) parent = parentPath(parent)
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
): { roots: WorkspaceBranch[]; sessions: SessionRow[]; currentId: SessionId | undefined; groupingError: boolean } {
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
  const sessions: SessionRow[] = []
  const currentId = Object.values(byId).find(({ retainedBy }) =>
    'mainView' in retainedBy && typeof retainedBy.mainView === 'number' && retainedBy.mainView > 0)?.id
  for (const id of catalog.ids) {
    const session = byId[id]
    if (session === undefined) continue
    if (session.blank || session.origin === 'subagent' || archived.has(session.id)) continue
    const workspace = workspaceBySession.get(session.id)
    sessions.push({
      id: session.id, title: session.title?.trim() || untitled,
      path: workspace?.path || session.cwd || '', workspace: workspace?.title ?? '',
      workspaceId: workspace?.id, latest: toMillis(session.updatedAt), running: session.running === true,
    })
  }
  sessions.sort((a, b) => b.latest - a.latest || a.id.localeCompare(b.id))

  const ungrouped: WorkspaceBranch = { key: 'ungrouped', workspace: undefined, children: [], sessions: [] }
  for (const session of sessions) {
    const branch = session.workspaceId === undefined ? ungrouped : branchById.get(session.workspaceId) ?? ungrouped
    branch.sessions.push(session)
  }
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
  return { roots, sessions, currentId, groupingError }
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

export function initialExpansion(roots: readonly WorkspaceBranch[], workspaceId: WorkspaceId | undefined, currentId: SessionId | undefined): string[] {
  for (const branch of roots) {
    if ((workspaceId !== undefined && branch.workspace?.id === workspaceId)
      || branch.sessions.some(session => session.id === currentId)) return [branch.key]
    const descendants = initialExpansion(branch.children, workspaceId, currentId)
    if (descendants.length > 0) return [branch.key, ...descendants]
  }
  return []
}
