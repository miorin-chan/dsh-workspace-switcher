import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-shortcuts/client'
import { NS } from './labels'
import type { WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspacePickerProps } from './view'

export const SWITCHER_MODAL = 'workspace-switcher'
export type SwitcherMode = 'sessions' | 'workspaces'
type HeroPicker = Pick<WorkspacePickerProps, 'onPick' | 'onClose' | 'selectedId'>

export function createSwitcherControls() {
  let mode: SwitcherMode | null = null
  let origin: HTMLElement | null = null
  const listeners = new Set<() => void>()
  const heroPickers = new Set<() => HeroPicker>()
  const setMode = (next: SwitcherMode | null) => {
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
    toggle(next: SwitcherMode) {
      if (mode === null) {
        origin = document.activeElement instanceof HTMLElement ? document.activeElement : null
        hero()?.onClose()
      }
      setMode(mode === next ? null : next)
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
