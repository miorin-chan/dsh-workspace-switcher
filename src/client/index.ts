/**
 * Browser half of `dsh-workspace-switcher`.
 *
 * The New Session chooser keeps its five-row shortlist. Its expanded dialog
 * shares its controls and theme with the frame-wide Session search and Workspace
 * tree. The tree delegates New Session picks to the currently mounted Hero.
 *
 * `client.js` is generated from `src/client/` by `scripts/build.mjs` and is
 * committed; edit the sources, never the artifact. The module loader envelope
 * around the bundle is the build's job, so this module only exports `inject`
 * and `apply`.
 *
 * Data comes only from the slot's standard shares: `useWorkspaces` for the
 * registry rows and `useSessions` for each member Session's activity time, so
 * "recently used" means the latest activity of the Workspaces' Sessions, not
 * the Workspace row's own last-mutation stamp. Recency is computed at render
 * time and never written back — the durable Workspace order is left alone.
 * Both hooks are read fail-safe: a composition that lacks one renders the
 * empty list instead of throwing.
 *
 * Adding a Workspace cannot reuse the shipped directory-flow hole: the hole is
 * declared by the registration this entry shadows, and one slot has exactly one
 * declaring entry. The entry therefore asks the Host's composed chooser through
 * `ctx.uiWorkspace.pickDirectory()` and adopts the path through
 * `ctx.workspaces.create()`, and it offers that action only while the hole is
 * occupied (the same published signal the shipped picker reads).
 *
 * Everything is fail-safe: without the standard hooks or services the entry
 * renders nothing and leaves the hero's own trigger in charge; a failed pick or
 * adoption keeps the chooser open with the Host's message.
 *
 * Runtime internals this bundle depends on, verified against 0.2.2-rc.5: the
 * hero slot key and its published child directory-flow hole, the `locale`
 * namespace registration form, the Desktop `session.search` command resolver
 * (`shortcuts.ts`), and the `react-dom` module-table shape (`portal.ts`). If the
 * command is absent or inaccessible, the shipped action remains untouched.
 * The `/client` entries of the owning packages are imported as types only.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { ContextMenus, MenuActionView } from '@deepseek-ai/dsh-client-ui-context-menu/client'
import * as React from 'react'

import { createGroupingPreferences, createGroupingRegistry, activeGrouping } from './grouping'
import { NS } from './labels'
import { buildRows, filterRows, relativeTime, shortenPath, toMillis, SHORTLIST } from './model'
import { SwitcherOverlay, type NavigationActions } from './navigation'
import { buildNavigation, filterTree, initialExpansion, searchSessions } from './navigation-model'
import { HERO_SLOT, heroInjection, registerLocale } from './remote'
import { sessionStatuses } from './session-presentation'
import { createSwitcherControls, installSwitcherShortcuts } from './shortcuts'
import { createViewPreferences, moveSession } from './view-preferences'
import { WorkspacePicker, type WorkspacePickerProps } from './view'

/** Services this module needs before `apply` runs. */
export const inject = ['slots', 'locale', 'uiWorkspace', 'workspaces', 'remote', 'sessions', 'shortcuts', 'contextMenus']

/**
 * Register the shared picker UI and shortcuts for this Client lifetime.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => registerLocale(ctx), `${NS}: locale`)

  const controls = createSwitcherControls()
  const groupings = createGroupingRegistry()
  const groupingPreferences = createGroupingPreferences()
  ctx.provide('workspaceSwitcherGrouping', { register: groupings.register })
  const injected = heroInjection(ctx)
  const contextMenus: ContextMenus = ctx.contextMenus
  const actions: NavigationActions = {
    controls,
    groupings,
    groupingPreferences,
    viewPreferences: createViewPreferences(),
    statusLabel: ctx.locale.bind('workspace'),
    searchContent: (query, signal) => ctx.sessions.search(query, signal),
    openSession: id => ctx.uiWorkspace.openSession(id),
    runSessionAction: (target, id, icon) => {
      const menu = contextMenus.resolve(target)
      try {
        // Built-in row contributions resolve synchronously from the live permission and membership snapshots.
        const action = menu.source.getSnapshot().find((item: MenuActionView) => item.id === id && item.icon?.key === icon)
        if (action !== undefined) menu.select(action.id)
      } finally {
        menu.dispose()
      }
    },
  }
  ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: NS, locale: NS,
    inject: () => {
      const { localHost, pickDirectory, createWorkspace } = injected()
      const hooks = { rowMenuTarget: contextMenus.active }
      if (!localHost) return { ...actions, hooks }
      return {
        ...actions, hooks,
        addWorkspace: async (signal: AbortSignal) => {
          const path = await pickDirectory()
          return path && !signal.aborted ? (await createWorkspace({ path })).workspaceId : undefined
        },
      }
    },
  }, SwitcherOverlay)), `${NS}: shortcut overlay`)
  ctx.effect(() => installSwitcherShortcuts(ctx, controls), `${NS}: shortcuts`)

  function HeroPicker(props: WorkspacePickerProps) {
    const current = React.useRef(props)
    React.useLayoutEffect(() => { current.current = props }, [props])
    React.useLayoutEffect(() => controls.bindHero(() => current.current), [])
    return React.createElement(WorkspacePicker, props)
  }
  // Priority -1 shadows the shipped picker: in a single slot the lowest
  // priority renders. Disabling this bundle restores the shipped menu.
  ctx.effect(() => ctx.slots.inject(HERO_SLOT, () => ctx.slots.register({
    name: HERO_SLOT,
    priority: -1,
    locale: NS,
    inject: injected,
  }, HeroPicker)), `${NS}: hero picker`)
}

/** Pure model helpers the offline tests drive directly. */
export const __test = {
  SHORTLIST,
  createGroupingRegistry,
  createGroupingPreferences,
  createViewPreferences,
  moveSession,
  sessionStatuses,
  activeGrouping,
  buildRows,
  buildNavigation,
  filterTree,
  initialExpansion,
  searchSessions,
  filterRows,
  shortenPath,
  relativeTime,
  toMillis,
}
