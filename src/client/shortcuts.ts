import type { Context } from '@deepseek-ai/cordis'
import type { ShortcutBinding, ShortcutCatalogEntry } from '@deepseek-ai/dsh-client-shortcuts/client'
import { NS } from './labels'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspacePickerProps } from './view'
import type { createRecentSessions, RecentConfirmation } from './recent-sessions'

export const SWITCHER_MODAL = 'workspace-switcher'
export type SwitcherMode = 'sessions' | 'workspaces'
type OverlayMode = SwitcherMode | 'recent'
const RECENT_SWITCH_PAUSE_MS = 650
type HeroPicker = Pick<WorkspacePickerProps, 'onPick' | 'onClose' | 'selectedId'>

export function createSwitcherControls() {
  let mode: OverlayMode | null = null
  let origin: HTMLElement | null = null
  const listeners = new Set<() => void>()
  const heroPickers = new Set<() => HeroPicker>()
  const setMode = (next: OverlayMode | null) => {
    if (mode === next) return
    mode = next
    for (const listener of listeners) listener()
    if (next === null) {
      const previous = origin
      origin = null
      window.requestAnimationFrame(() => {
        if (mode === null && previous?.isConnected) previous.focus({ preventScroll: true })
      })
    }
  }
  const hero = () => [...heroPickers].at(-1)?.()
  const open = (next: OverlayMode) => {
    if (mode === null) {
      origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
      hero()?.onClose()
    }
    setMode(next)
  }
  return {
    hero,
    bindHero(get: () => HeroPicker) {
      heroPickers.add(get)
      return () => { heroPickers.delete(get) }
    },
    pickWorkspace(id: WorkspaceId) { hero()?.onPick(id) },
    getSnapshot: () => mode,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    close: () => setMode(null),
    openRecent: () => open('recent'),
    toggle(next: SwitcherMode) {
      if (mode === next) setMode(null)
      else open(next)
    },
  }
}

type ShortcutService = Context['shortcuts']
type ShortcutCommand = Parameters<ShortcutService['register']>[0]
type ShortcutContext = Parameters<ShortcutCommand['resolve']>[0]
type CommandEntry = { resolve: ShortcutCommand['resolve']; modals: ShortcutCommand['modals'] }

function allowed({ modal, region }: ShortcutContext): boolean {
  return region !== 'terminal' && (modal === null || modal === 'sidebar' || modal === SWITCHER_MODAL)
}

export function installSwitcherShortcuts(ctx: Context, controls: ReturnType<typeof createSwitcherControls>): () => void {
  const shortcuts = ctx.shortcuts
  const dispose: (() => void)[] = []
  const t = ctx.locale.bind(NS)
  const resolve = (mode: SwitcherMode): ShortcutCommand['resolve'] => context => allowed(context)
    ? { status: 'handled', run: () => controls.toggle(mode) }
    : { status: 'pass' }

  // DSH 0.2.2 has no public command override. Keep the installed command and
  // its binding/preferences, replacing only the action that would focus the sidebar.
  let unwire: (() => void) | undefined
  let wiredCommand: CommandEntry | undefined
  const restore = () => {
    unwire?.()
    unwire = undefined
    wiredCommand = undefined
  }
  const wireSessionSearch = () => {
    const commands = (shortcuts as unknown as { registry?: { commands?: unknown } }).registry?.commands
    const command = commands instanceof Map ? commands.get('session.search') as CommandEntry | undefined : undefined
    if (command === wiredCommand) return
    restore()
    if (typeof command?.resolve !== 'function' || !Array.isArray(command.modals)) return
    const { resolve: original, modals } = command
    const open = resolve('sessions')
    const wrap: CommandEntry['resolve'] = context => {
      const result = original.call(command, context)
      return result.status === 'handled' ? open(context) : result
    }
    const switcherModals = [...modals, SWITCHER_MODAL]
    command.resolve = wrap
    wiredCommand = command
    unwire = () => {
      if (command.resolve === wrap) command.resolve = original
      if (command.modals === switcherModals) command.modals = modals
    }
    command.modals = switcherModals
  }
  try {
    wireSessionSearch()
    const stopWatching = shortcuts.catalog.subscribe(wireSessionSearch)
    dispose.push(() => { stopWatching(); restore() })
  } catch (error) {
    console.warn('workspace-switcher: session.search could not be overridden', error)
  }

  const shifted = { code: 'KeyK', modifiers: ['primary', 'shift'] } as const
  try {
    dispose.push(shortcuts.register({
      id: 'workspace.switcher' as ShortcutCommand['id'],
      label: () => t('workspaceTree'), aliases: ['workspace tree', 'switch workspace'],
      defaults: {
        'desktop:macos': shifted, 'desktop:windows': shifted, 'desktop:linux': shifted,
        'web:macos': shifted, 'web:windows': shifted,
      },
      regions: ['page', 'editable'], modals: ['sidebar', SWITCHER_MODAL], resolve: resolve('workspaces'),
    }))
  } catch (error) {
    console.warn('workspace-switcher: workspace shortcut could not be registered', error)
  }

  // Web reserves some primary shortcuts at the browser layer, and DSH's Web
  // binding catalog excludes them. Use its local key input if the browser delivers the key.
  if (shortcuts.runtime === 'web' && typeof shortcuts.observeFixedInput === 'function') {
    dispose.push(shortcuts.observeFixedInput(input => {
      if (input.type !== 'keydown' || !allowed(input.context)) return
      const { gesture } = input
      const primary = shortcuts.platform === 'macos' ? gesture.meta && !gesture.control : gesture.control && !gesture.meta
      if (!primary || gesture.code !== 'KeyK' || gesture.alt || gesture.composing || gesture.defaultPrevented) return
      if (gesture.shift && shortcuts.platform !== 'linux') return
      input.consume()
      if (!gesture.repeat) controls.toggle(gesture.shift ? 'workspaces' : 'sessions')
    }))
  }
  return () => { for (const release of dispose.reverse()) release() }
}

/** New commands own their bindings and use the registry's native Desktop path. */
export function installRecentShortcuts(ctx: Context, controls: ReturnType<typeof createSwitcherControls>,
  recent: ReturnType<typeof createRecentSessions>): () => void {
  const { shortcuts } = ctx
  const t = ctx.locale.bind(NS)
  const needsPauseFallback = shortcuts.runtime === 'desktop' && shortcuts.platform === 'macos'
  let pauseTimer: number | undefined
  const clearPause = () => {
    if (pauseTimer !== undefined) window.clearTimeout(pauseTimer)
    pauseTimer = undefined
  }
  const dispose = [
    recent.subscribe(() => {
      clearPause()
      const selection = recent.getSnapshot()
      if (selection?.confirmation === 'control-or-pause') {
        pauseTimer = window.setTimeout(() => {
          if (recent.getSnapshot() === selection) recent.confirm()
        }, RECENT_SWITCH_PAUSE_MS)
      }
      if (selection === null && controls.getSnapshot() === 'recent') controls.close()
    }),
    controls.subscribe(() => { if (controls.getSnapshot() !== 'recent') recent.cancel() }),
  ]
  const confirmOnRelease = (event: KeyboardEvent) => {
    const selection = recent.getSnapshot()
    const releasedControl = event.key === 'Control' || event.code === 'ControlLeft' || event.code === 'ControlRight'
    if (releasedControl && !event.ctrlKey && selection !== null && selection.confirmation !== 'explicit') recent.confirm()
  }
  window.addEventListener('keyup', confirmOnRelease, true)
  window.addEventListener('blur', recent.cancel)
  dispose.push(() => {
    window.removeEventListener('keyup', confirmOnRelease, true)
    window.removeEventListener('blur', recent.cancel)
    clearPause()
    recent.cancel()
  })
  for (const direction of [1, -1] as const) {
    const id = (direction === 1 ? 'workspace.recentSession' : 'workspace.recentSessionReverse') as ShortcutCommand['id']
    const binding: ShortcutBinding = { code: 'Tab', modifiers: direction === 1 ? ['control'] : ['control', 'shift'] }
    try {
      dispose.push(shortcuts.register({
        id,
        label: () => t(direction === 1 ? 'recentSession.next' : 'recentSession.previous'),
        aliases: [],
        defaults: { 'desktop:macos': binding, 'desktop:windows': binding },
        regions: ['page', 'editable'],
        modals: [SWITCHER_MODAL],
        resolve: ({ modal, region, source }) => {
          const mode = controls.getSnapshot()
          if ((mode !== null && mode !== 'recent') || (modal !== null && modal !== SWITCHER_MODAL)
            || region === 'terminal' || !recent.canStep()) return { status: 'pass' }
          const effective = shortcuts.catalog.getSnapshot().find((row: ShortcutCatalogEntry) => row.id === id)?.binding
          const release = source !== 'menu' && effective?.modifiers.includes('control') === true
          const confirmation: RecentConfirmation = !release ? 'explicit'
            : needsPauseFallback ? 'control-or-pause' : 'control-release'
          return { status: 'handled', run: () => { controls.openRecent(); recent.step(direction, confirmation) } }
        },
      }))
    } catch (error) {
      console.warn(`workspace-switcher: could not register ${id}`, error)
    }
  }
  return () => { for (const release of dispose.reverse()) release() }
}
