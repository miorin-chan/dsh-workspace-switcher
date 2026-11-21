import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Capture the module registration the browser module loader would receive. */
let registration
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      registration = entry
    },
  },
}
await import('../client.js')

assert.equal(registration.id, 'dsh-workspace-welcome-switcher')
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
  name === 'react' ? ReactStub : name === 'react-dom' ? { default: ReactDOMStub } : undefined
))
const { buildRows, filterRows, shortenPath, relativeTime, toMillis, SHORTLIST } = plugin.__test

/** A minimal host: recorded effects, a locale service, and a slot registry. */
function fakeContext() {
  const effects = []
  const dictionaries = new Map()
  const entries = { 'conversation.hero.workspace.directoryFlow': [] }
  const registrations = []
  const ctx = {
    effect(install, label) {
      const dispose = install()
      effects.push({ label, dispose })
      return dispose
    },
    locale: {
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
    remote: { $host: { home: '/Users/tester', isLoopback: true } },
    uiWorkspace: { pickDirectory: async () => null },
    workspaces: { create: async input => ({ workspaceId: 'ws-created', path: input.path }) },
  }
  return { ctx, effects, dictionaries, registrations }
}

test('declares the services it injects', () => {
  assert.deepEqual(plugin.inject, ['slots', 'locale', 'uiWorkspace', 'workspaces', 'remote'])
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

  assert.equal(registrations.length, 1)
  const { options, component } = registrations[0]
  assert.equal(options.name, 'conversation.hero.workspace')
  assert.equal(options.priority, -1)
  assert.equal(options.locale, 'dsh-workspace-welcome-switcher')
  assert.equal(typeof component, 'function')
  assert.equal(registrations[0].disposed, false)

  const injected = options.inject()
  assert.equal(typeof injected.pickDirectory, 'function')
  assert.equal(typeof injected.createWorkspace, 'function')
  assert.equal(injected.localHost, true)
  assert.equal(typeof injected.hooks.directoryFlow.getSnapshot, 'function')
  assert.equal(typeof injected.hooks.directoryFlow.subscribe, 'function')

  for (const effect of effects) effect.dispose()
  assert.equal(registrations[0].disposed, true)
})

test('marks a remote carrier as unable to add workspaces', () => {
  const { ctx, registrations } = fakeContext()
  ctx.remote.$host.isLoopback = false
  plugin.apply(ctx)
  const injected = registrations[0].options.inject()
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
