import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Capture the module registration the browser module loader would receive. */
let registration
globalThis.HTMLElement = class HTMLElement {}
globalThis.document = { activeElement: null }
globalThis.window = {
  requestAnimationFrame: callback => callback(),
  __ModuleLoader__: {
    load(entry) {
      registration = entry
    },
  },
}
await import('../client.js')

assert.equal(registration.id, '@miorin/dsh-workspace-welcome-switcher')
const ReactStub = {
  Fragment: Symbol('Fragment'),
  createElement: () => null,
  useCallback: fn => fn,
  useEffect: () => {},
  useId: () => 'test',
  useLayoutEffect: () => {},
  useMemo: fn => fn(),
  useRef: value => ({ current: value }),
  useState: value => [value, () => {}],
  useSyncExternalStore: () => {},
}
const ReactDOMStub = { createPortal: () => null }
const plugin = registration.factory(name => (
  name === 'react' ? ReactStub : name === 'react-dom' ? { default: ReactDOMStub }
    : name === '@deepseek-ai/dsh-client-ui-primitives' ? {} : undefined
))
const {
  buildRows, filterRows, shortenPath, relativeTime, toMillis, SHORTLIST,
  buildNavigation, filterTree, initialExpansion, searchSessions,
  activeGrouping, createGroupingPreferences, createGroupingRegistry, createViewPreferences, moveSession,
} = plugin.__test

/** A minimal host: recorded effects, a locale service, and a slot registry. */
function fakeContext() {
  const effects = []
  const dictionaries = new Map()
  const services = new Map()
  const entries = { 'conversation.hero.workspace.directoryFlow': [] }
  const registrations = []
  const catalogListeners = new Set()
  const commands = new Map()
  const register = command => {
    commands.set(command.id, command)
    for (const listener of catalogListeners) listener()
    return () => {
      commands.delete(command.id)
      for (const listener of catalogListeners) listener()
    }
  }
  const ctx = {
    effect(install, label) {
      const dispose = install()
      effects.push({ label, dispose })
      return dispose
    },
    provide(name, service) {
      services.set(name, service)
      const dispose = () => { services.delete(name) }
      effects.push({ label: `provide ${name}`, dispose })
      return dispose
    },
    locale: {
      bind: () => key => key,
      register(namespace, labels) {
        dictionaries.set(namespace, labels)
        return () => {
          dictionaries.delete(namespace)
        }
      },
    },
    slots: {
      entries(key) {
        return entries[key] ?? []
      },
      subscribe() {
        return () => {}
      },
      inject(key, callback) {
        const dispose = callback()
        effects.push({ label: `inject ${key}`, dispose })
        return dispose
      },
      register(options, component) {
        const record = { options, component, disposed: false }
        registrations.push(record)
        return () => { record.disposed = true }
      },
    },
    shortcuts: {
      runtime: 'desktop', platform: 'macos', registry: { commands }, register,
      catalog: { subscribe: listener => {
        catalogListeners.add(listener)
        return () => { catalogListeners.delete(listener) }
      } },
    },
    remote: { $host: { home: '/Users/tester', isLoopback: true } },
    uiWorkspace: { pickDirectory: async () => null },
    workspaces: { create: async input => ({ workspaceId: 'ws-created', path: input.path }) },
  }
  return { ctx, effects, dictionaries, registrations, commands, services }
}

test('declares the services it injects', () => {
  assert.deepEqual(plugin.inject, ['slots', 'locale', 'uiWorkspace', 'workspaces', 'remote', 'sessions', 'shortcuts'])
})

test('registers the eight locale dictionaries and releases them on unload', () => {
  const { ctx, effects, dictionaries } = fakeContext()
  plugin.apply(ctx)

  assert.ok(dictionaries.has('dsh-workspace-welcome-switcher'))
  const labels = dictionaries.get('dsh-workspace-welcome-switcher')
  assert.deepEqual(
    Object.keys(labels).sort(),
    ['de', 'en', 'es', 'fr', 'ja', 'pt', 'ru', 'zh'],
  )
  assert.equal(labels.zh['dialog.title'], '选择工作区')

  for (const effect of effects) effect.dispose()
  assert.equal(dictionaries.has('dsh-workspace-welcome-switcher'), false)
})

test('shadows the shipped hero picker at a lower priority', () => {
  const { ctx, effects, registrations } = fakeContext()
  plugin.apply(ctx)

  assert.equal(registrations.length, 2)
  const hero = registrations.find(record => record.options.name === 'conversation.hero.workspace')
  const { options, component } = hero
  assert.ok(registrations.some(record => record.options.name === 'shell.overlay'))
  assert.equal(options.name, 'conversation.hero.workspace')
  assert.equal(options.priority, -1)
  assert.equal(options.locale, 'dsh-workspace-welcome-switcher')
  assert.equal(typeof component, 'function')
  assert.equal(hero.disposed, false)

  const injected = options.inject()
  assert.equal(typeof injected.pickDirectory, 'function')
  assert.equal(typeof injected.createWorkspace, 'function')
  assert.equal(injected.localHost, true)
  assert.equal(typeof injected.hooks.directoryFlow.getSnapshot, 'function')
  assert.equal(typeof injected.hooks.directoryFlow.subscribe, 'function')

  for (const effect of effects) effect.dispose()
  assert.ok(registrations.every(record => record.disposed))
})

test('marks a remote carrier as unable to add workspaces', () => {
  const { ctx, registrations } = fakeContext()
  ctx.remote.$host.isLoopback = false
  plugin.apply(ctx)
  const injected = registrations.find(record => record.options.name === 'conversation.hero.workspace').options.inject()
  assert.equal(injected.localHost, false)
})

test('normalizes seconds, milliseconds, and ISO stamps', () => {
  assert.equal(toMillis(1700000000), 1700000000000)
  assert.equal(toMillis(1700000000000), 1700000000000)
  assert.equal(toMillis('2026-11-20T00:00:00.000Z'), Date.parse('2026-11-20T00:00:00.000Z'))
  assert.equal(toMillis(undefined), 0)
  assert.equal(toMillis('not a date'), 0)
})

test('builds recently used rows from session activity', () => {
  const now = Date.parse('2026-11-20T12:00:00.000Z')
  const items = [
    { workspaceId: 'a', title: 'Alpha', path: '/work/alpha', updatedAt: '2026-11-01T00:00:00.000Z', sessionIds: ['s1', 's2'] },
    { workspaceId: 'b', title: 'default-workspace', path: '/work/default', updatedAt: '2026-11-02T00:00:00.000Z', sessionIds: ['s3'] },
    { workspaceId: 'c', title: '', path: '/work/gamma', updatedAt: '2026-11-03T00:00:00.000Z', sessionIds: [] },
  ]
  const byId = {
    s1: { updatedAt: now - 60_000, origin: 'user' },
    s2: { updatedAt: now - 10 * 60_000, origin: 'subagent' },
    s3: { updatedAt: now - 3 * 60 * 60_000, origin: 'user' },
  }

  const rows = buildRows(items, byId, '默认工作区')
  assert.deepEqual(rows.map(row => row.id), ['a', 'b', 'c'])
  assert.equal(rows[0].count, 1, 'subagent sessions do not inflate the visible count')
  assert.equal(rows[0].latest, now - 60_000)
  assert.equal(rows[1].title, '默认工作区')
  assert.equal(rows[2].title, 'gamma', 'an untitled workspace falls back to its leaf directory')
  assert.equal(rows[0].showPath, false, 'a title that matches its leaf needs no second line')
  assert.equal(rows[1].showPath, true, 'the localized default workspace keeps its path line')
})

test('duplicate titles keep the path line for disambiguation', () => {
  const rows = buildRows([
    { workspaceId: 'a', title: 'Project', path: '/clients/a/project', updatedAt: '2026-11-01T00:00:00.000Z', sessionIds: [] },
    { workspaceId: 'b', title: 'Project', path: '/clients/b/project', updatedAt: '2026-11-02T00:00:00.000Z', sessionIds: [] },
    { workspaceId: 'c', title: 'Solo', path: '/solo/solo', updatedAt: '2026-11-03T00:00:00.000Z', sessionIds: [] },
  ], {}, 'Default')
  assert.equal(rows.find(row => row.id === 'a').showPath, true)
  assert.equal(rows.find(row => row.id === 'b').showPath, true)
  assert.equal(rows.find(row => row.id === 'c').showPath, false)
})

test('a blank New Session falls back to the Workspace creation stamp', () => {
  const now = Date.parse('2026-11-20T12:00:00.000Z')
  const rows = buildRows([
    { workspaceId: 'fresh', title: 'Fresh', path: '/work/fresh', updatedAt: new Date(now).toISOString(), sessionIds: ['blank'] },
    { workspaceId: 'old', title: 'Old', path: '/work/old', updatedAt: new Date(now - 86400000).toISOString(), sessionIds: ['used'] },
  ], {
    blank: { updatedAt: 0, origin: 'user' },
    used: { updatedAt: now - 86400000, origin: 'user' },
  }, 'Default')
  assert.deepEqual(rows.map(row => row.id), ['fresh', 'old'])
})

test('prefers session activity over a Workspace rename stamp', () => {
  const now = Date.parse('2026-11-20T12:00:00.000Z')
  const rows = buildRows([
    { workspaceId: 'renamed', title: 'Renamed', path: '/work/renamed', updatedAt: new Date(now).toISOString(), sessionIds: ['s1'] },
    { workspaceId: 'active', title: 'Active', path: '/work/active', updatedAt: '2026-11-01T00:00:00.000Z', sessionIds: ['s2'] },
  ], {
    s1: { updatedAt: now - 60 * 60_000, origin: 'user' },
    s2: { updatedAt: now - 60_000, origin: 'user' },
  }, 'Default')
  assert.deepEqual(rows.map(row => row.id), ['active', 'renamed'])
})

test('orders equal activity by title', () => {
  const stamp = '2026-11-19T00:00:00.000Z'
  const items = [
    { workspaceId: 'z', title: 'Zeta', path: '/z', updatedAt: stamp, sessionIds: [] },
    { workspaceId: 'a', title: 'Alpha', path: '/a', updatedAt: stamp, sessionIds: [] },
  ]
  assert.deepEqual(buildRows(items, {}, 'Default').map(row => row.id), ['a', 'z'])
})

test('filters by every whitespace-separated term across title and path', () => {
  const rows = [
    { id: 'a', title: 'DeepSeek Harness', path: '/work/deepseek-harness/default-workspace' },
    { id: 'b', title: 'Research', path: '/work/research/dsh' },
  ]
  assert.deepEqual(filterRows(rows, 'harness deepseek').map(row => row.id), ['a'])
  assert.deepEqual(filterRows(rows, 'dsh').map(row => row.id), ['b'])
  assert.deepEqual(filterRows(rows, '  ').map(row => row.id), ['a', 'b'])
  assert.deepEqual(filterRows(rows, 'missing').map(row => row.id), [])
})

test('shortens long paths to the two trailing segments', () => {
  assert.equal(shortenPath('/Users/me/work/deepseek-harness'), '…/work/deepseek-harness')
  assert.equal(shortenPath('/work/research'), '/work/research')
  assert.equal(shortenPath(''), '')
})

test('formats relative time with the caller locale seat', () => {
  const now = 10_000_000
  const t = (key, params) => params === undefined ? key : `${key}:${params.n}`
  assert.equal(relativeTime(0, now, t), '')
  assert.equal(relativeTime(now - 10_000, now, t), 'time.now')
  assert.equal(relativeTime(now - 5 * 60_000, now, t), 'time.minutes:5')
  assert.equal(relativeTime(now - 3 * 60 * 60_000, now, t), 'time.hours:3')
  assert.equal(relativeTime(now - 30 * 60 * 60_000, now, t), 'time.yesterday')
  assert.equal(relativeTime(now - 3 * 24 * 60 * 60_000, now, t), 'time.days:3')
})

test('keeps the compact shortlist at five rows', () => {
  assert.equal(SHORTLIST, 5)
})

test('routes sidebar search to the switcher and restores the owner on reload and unload', () => {
  const { ctx, effects, registrations, commands } = fakeContext()
  let sidebarCalls = 0
  const original = () => ({ status: 'handled', run: () => { sidebarCalls++ } })
  const search = { id: 'session.search', modals: ['sidebar'], resolve: original }
  const unregister = ctx.shortcuts.register(search)
  plugin.apply(ctx)
  const { controls } = registrations.find(record => record.options.name === 'shell.overlay').options.inject()
  const tree = commands.get('workspace.switcher')
  const page = { modal: null, region: 'editable' }

  assert.deepEqual(tree.defaults['desktop:macos'], { code: 'KeyK', modifiers: ['primary', 'shift'] })
  search.resolve(page).run()
  assert.equal(controls.getSnapshot(), 'sessions')
  assert.equal(sidebarCalls, 0)
  assert.ok(search.modals.includes('workspace-switcher'))
  tree.resolve({ ...page, modal: 'workspace-switcher' }).run()
  assert.equal(controls.getSnapshot(), 'workspaces')
  assert.equal(tree.resolve({ ...page, modal: 'other' }).status, 'pass')
  assert.equal(tree.resolve({ ...page, region: 'terminal' }).status, 'pass')

  unregister()
  assert.equal(search.resolve, original)
  const updated = { id: 'session.search', modals: ['sidebar'], resolve: original }
  ctx.shortcuts.register(updated)
  assert.notEqual(updated.resolve, original)
  for (const { dispose } of effects.reverse()) dispose()
  assert.equal(updated.resolve, original)
  assert.deepEqual(updated.modals, ['sidebar'])
  assert.equal(commands.has('workspace.switcher'), false)
})

test('web routes the primary key when delivered and leaves composing or consumed events alone', () => {
  const { ctx, effects, registrations } = fakeContext()
  let receive
  ctx.shortcuts.runtime = 'web'
  ctx.shortcuts.observeFixedInput = listener => {
    receive = listener
    return () => { receive = undefined }
  }
  plugin.apply(ctx)
  const { controls } = registrations.find(record => record.options.name === 'shell.overlay').options.inject()
  let consumed = 0
  const gesture = { code: 'KeyK', meta: true, control: false, alt: false, shift: false, composing: false, repeat: false }
  const input = { type: 'keydown', gesture, context: { modal: null, region: 'editable' }, consume: () => { consumed++ } }
  receive({ ...input, gesture: { ...gesture, composing: true } })
  receive({ ...input, gesture: { ...gesture, defaultPrevented: true } })
  assert.equal(controls.getSnapshot(), null)
  assert.equal(consumed, 0)
  receive(input)
  assert.equal(controls.getSnapshot(), 'sessions')
  receive({ ...input, gesture: { ...gesture, repeat: true } })
  assert.equal(controls.getSnapshot(), 'sessions')
  receive(input)
  assert.equal(controls.getSnapshot(), null)
  assert.equal(consumed, 3)
  for (const { dispose } of effects.reverse()) dispose()
  assert.equal(receive, undefined)
})

test('the workspace chooser delegates selection to the live New Session owner', () => {
  const { ctx, registrations } = fakeContext()
  plugin.apply(ctx)
  const { controls } = registrations.find(record => record.options.name === 'shell.overlay').options.inject()
  const picked = []
  const unbind = controls.bindHero(() => ({ selectedId: 'old', onPick: id => picked.push(id) }))
  assert.equal(controls.hero().selectedId, 'old')
  controls.pickWorkspace('new')
  unbind()
  controls.pickWorkspace('ignored')
  assert.deepEqual(picked, ['new'])
})

function navigationFixture(groupId, view) {
  const items = [
    { workspaceId: 'project', path: '/project', title: 'Project', sessionIds: ['root-session'] },
    { workspaceId: 'nested', path: '/project/app/src', title: 'Code', sessionIds: ['code', 'archived', 'draft', 'subagent'] },
    { workspaceId: 'near', path: '/project-copy', title: 'Copy', sessionIds: [] },
    { workspaceId: 'drive', path: 'D:\\', title: 'Drive', sessionIds: [] },
    { workspaceId: 'windows', path: 'D:\\project', title: 'Windows', sessionIds: [] },
  ]
  const list = [
    ['code', { title: 'Fix checkout', updatedAt: 30, retainedBy: { mainView: 1 } }],
    ['root-session', { title: 'Start release', updatedAt: 10 }],
    ['loose', { title: 'Personal', updatedAt: 20 }],
    ['archived', { updatedAt: 40 }],
    ['draft', { blank: true }],
    ['subagent', { origin: 'subagent' }],
  ].map(([id, fields]) => [id, { id, blank: false, retainedBy: {}, ...fields }])
  return buildNavigation({ items, archivedSessionIds: ['archived'] },
    { ids: list.map(([id]) => id), byId: Object.fromEntries(list) }, 'Default workspace', 'Untitled session', groupId, undefined, view)
}

test('nests registered directories, preserves ancestors in search, and omits drafts and archives', () => {
  const { roots, sessions, currentId } = navigationFixture()
  const project = roots.find(root => root.key === 'workspace:project')
  assert.deepEqual(project.children.map(child => child.key), ['workspace:nested'])
  assert.ok(roots.some(root => root.key === 'workspace:near'))
  assert.equal(roots.find(root => root.key === 'workspace:drive').children[0].key, 'workspace:windows')
  assert.equal(currentId, 'code')
  assert.deepEqual(initialExpansion(roots, undefined, currentId), ['workspace:project', 'workspace:nested'])
  assert.deepEqual(sessions.map(row => row.id), ['code', 'loose', 'root-session'])
  const [match] = filterTree(roots, 'fix checkout', false, 'Ungrouped')
  assert.equal(match.branch.key, 'workspace:project')
  assert.deepEqual(match.children[0].sessions.map(session => session.id), ['code'])
  assert.deepEqual(filterTree(roots, 'fix checkout', true, 'Ungrouped'), [])
  assert.ok(filterTree(roots, '', true, 'Ungrouped').every(result => result.branch.workspace !== undefined))
})

const DIRECTORY_GROUP = {
  id: 'workspace-file-tree',
  label: () => 'Directory tree',
  project: input => [{ kind: 'directory', key: '/project', title: 'project', path: '/project',
    children: input.map(({ workspaceId }) => ({ kind: 'workspace', workspaceId })) }],
}

const groupedItems = [
  { workspaceId: 'app', path: '/project/apps/mobile', title: 'Mobile', sessionIds: [] },
  { workspaceId: 'web', path: '/project/apps/web', title: 'Web', sessionIds: ['test-session'] },
]
const treeFixture = (groupId, grouping) => buildNavigation({ items: groupedItems, archivedSessionIds: [] },
  { ids: ['test-session'], byId: { 'test-session': { id: 'test-session', title: 'Build', retainedBy: {} } } },
  'Default', 'Untitled', groupId, grouping)

test('renders extension directories with existing workspace operations and search ancestry', () => {
  assert.ok(treeFixture('workspace-tree').roots.every(root => root.workspace !== undefined))
  const { roots, groupingError } = treeFixture(DIRECTORY_GROUP.id, DIRECTORY_GROUP)
  const [project] = roots
  assert.equal(groupingError, false)
  assert.equal(project.directory.path, '/project')
  assert.deepEqual(project.children.map(branch => branch.workspace.id), ['app', 'web'])
  assert.deepEqual(initialExpansion(roots, 'web', undefined), [project.key, 'workspace:web'])
  const [match] = filterTree(roots, 'web', true, 'Ungrouped')
  assert.deepEqual(match.children.map(child => child.branch.workspace.id), ['web'])
  const [content] = filterTree(roots, 'keywords', false, 'Ungrouped', [
    { sessionId: 'test-session', snippet: 'Found in the conversation' },
  ])
  assert.equal(content.children[0].sessions[0].snippet, 'Found in the conversation')
})

test('invalid projections fall back without losing workspace rows or sessions', t => {
  const warn = t.mock.method(console, 'warn', () => {})
  for (const project of [() => [], () => [{ kind: 'workspace', workspaceId: 'unknown' }],
    () => Array(2).fill({ kind: 'workspace', workspaceId: 'app' }),
    () => {
      const node = { kind: 'directory', key: '/x', title: 'x', path: '/x', children: [] }
      node.children.push(node)
      return [node]
    },
    () => { throw new Error('projection error') }]) {
    const { roots, groupingError } = treeFixture(DIRECTORY_GROUP.id, { ...DIRECTORY_GROUP, project })
    assert.equal(groupingError, true)
    assert.deepEqual(roots.map(root => root.workspace.id), ['app', 'web'])
    assert.equal(roots[1].sessions[0].id, 'test-session')
  }
  assert.equal(warn.mock.callCount(), 5)
})

test('workspace list keeps all real workspace rows at the root', () => {
  const { roots } = navigationFixture('workspace')
  assert.ok(roots.some(root => root.key === 'workspace:nested'))
  assert.ok(roots.every(root => root.children.length === 0))
})

test('the overlay sees grouping registrations and their disposal immediately', () => {
  const { ctx, effects, registrations, services } = fakeContext()
  plugin.apply(ctx)
  const { register } = services.get('workspaceSwitcherGrouping')
  const { groupings } = registrations.find(entry => entry.options.name === 'shell.overlay').options.inject()
  const initial = groupings.getSnapshot()
  const changes = []
  const unsubscribe = groupings.subscribe(() => changes.push(groupings.getSnapshot().map(entry => entry.id)))
  const dispose = register(DIRECTORY_GROUP)
  assert.deepEqual(initial, [])
  assert.equal(groupings.getSnapshot(), groupings.getSnapshot())
  assert.throws(() => register(DIRECTORY_GROUP), /already registered/)
  assert.throws(() => register({ ...DIRECTORY_GROUP, id: 'workspace-tree' }), /Invalid/)
  dispose()
  dispose()
  assert.deepEqual(changes, [['workspace-file-tree'], []])
  unsubscribe()
  for (const effect of effects) effect.dispose()
  assert.equal(services.has('workspaceSwitcherGrouping'), false)
})

test('remembered non-flat grouping survives disposal, flat openings, and page reload', () => {
  const registry = createGroupingRegistry()
  const values = new Map()
  const storage = () => ({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) })
  const prefs = createGroupingPreferences(storage)
  assert.equal(prefs.initial('workspaces', registry.getSnapshot()), 'workspace-tree')
  const dispose = registry.register(DIRECTORY_GROUP)
  prefs.remember('workspace-file-tree')
  prefs.remember('flat')
  const restored = createGroupingPreferences(storage)
  assert.equal(restored.initial('sessions', registry.getSnapshot()), 'flat')
  assert.equal(restored.initial('workspaces', registry.getSnapshot()), 'workspace-file-tree')
  dispose()
  assert.equal(activeGrouping('workspace-file-tree', registry.getSnapshot(), false), 'workspace-tree')
  assert.equal(restored.initial('workspaces', registry.getSnapshot()), 'workspace-tree')
  registry.register(DIRECTORY_GROUP)
  assert.equal(restored.initial('workspaces', registry.getSnapshot()), 'workspace-file-tree')
  assert.equal(activeGrouping('flat', registry.getSnapshot(), true), 'workspace-tree')
  const volatile = createGroupingPreferences(() => { throw Error('restricted storage') })
  volatile.remember('workspace')
  assert.equal(volatile.initial('workspaces', []), 'workspace')
})

test('merges metadata and content hits without duplicate or non-openable rows', () => {
  const { sessions } = navigationFixture()
  const results = searchSessions(sessions, 'fix project', [
    { sessionId: 'root-session', snippet: 'body-only match' },
    { sessionId: 'archived', snippet: 'hidden' },
    { sessionId: 'code', snippet: 'metadata plus content' },
  ])
  assert.deepEqual(results.map(({ id, snippet }) => [id, snippet]), [
    ['code', 'metadata plus content'], ['root-session', 'body-only match'],
  ])
})


test('archive filter controls paths, metadata search and message matches', () => {
  const only = navigationFixture('workspace-tree', { orderBy: 'updated', archiveFilter: 'only-archived', orders: {} })
  assert.deepEqual(only.sessions.map(({ id, archived }) => [id, archived]), [['archived', true]])
  assert.deepEqual(only.roots.map(root => root.key), ['workspace:project'])
  assert.deepEqual(only.roots[0].children[0].sessions.map(row => row.id), ['archived'])
  assert.deepEqual(searchSessions(only.sessions, 'message', [
    { sessionId: 'archived', snippet: 'match' }, { sessionId: 'code', snippet: 'other match' },
  ]).map(row => row.id), ['archived'])
  const all = navigationFixture('flat', { orderBy: 'updated', archiveFilter: 'show-archived', orders: {} })
  assert.deepEqual(all.sessions.map(row => row.id), ['archived', 'code', 'loose', 'root-session'])
})

test('manual ordering retains hidden archive positions and reconciles missing IDs', () => {
  const savedOrder = ['root-session', 'archived', 'loose', 'missing']
  const view = { orderBy: 'manual', archiveFilter: 'hide-archived', orders: { flat: savedOrder } }
  const { sessions, orders } = navigationFixture('flat', view)
  assert.deepEqual(sessions.map(row => row.id), ['root-session', 'loose', 'code'])
  assert.deepEqual(orders.flat, ['root-session', 'archived', 'loose', 'code'])
  const moved = moveSession(orders.flat, 'loose', 'root-session')
  assert.deepEqual(moved, ['loose', 'root-session', 'archived', 'code'])
  assert.equal(moveSession(orders.flat, 'loose', 'missing'), orders.flat)
  assert.equal(moveSession(orders.flat, 'loose', 'code', 'before'), orders.flat)
  assert.deepEqual(moveSession(orders.flat, 'loose', 'code', 'after'), ['root-session', 'archived', 'code', 'loose'])
  const shown = navigationFixture('flat', { ...view, archiveFilter: 'show-archived', orders: { flat: moved } })
  assert.deepEqual(shown.sessions.map(row => row.id), moved)
})

test('view preferences survive reload and reject malformed values', () => {
  let saved = ''
  const storage = () => ({ getItem: () => saved, setItem: (_key, value) => { saved = value } })
  const first = createViewPreferences(storage)
  assert.deepEqual(first.get(), { orderBy: 'updated', archiveFilter: 'hide-archived', orders: {} })
  const next = { orderBy: 'manual', archiveFilter: 'only-archived', orders: { flat: ['session'] } }
  first.set(next)
  assert.deepEqual(createViewPreferences(storage).get(), next)
  saved = '{"orderBy":"invalid","archiveFilter":"invalid","orders":{"flat":[5]}}'
  assert.deepEqual(createViewPreferences(storage).get(), { orderBy: 'updated', archiveFilter: 'hide-archived', orders: {} })
})
