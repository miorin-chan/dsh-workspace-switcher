/**
 * Browser half of `dsh-workspace-welcome-switcher`.
 *
 * A more capable performer of the blank-session Workspace chooser. The shipped
 * picker is one flat menu in Host order; this entry shadows it (a single slot,
 * lowest priority renders) with recently-used ordering, a search field, a
 * five-row shortlist, and a focused chooser dialog for users with many
 * Workspaces.
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
 * namespace registration form that takes all dictionaries in one call, and the
 * `react-dom` module-table shape `portal.ts` accepts. The `/client` entries of
 * the owning packages are imported as types only; the built artifact carries no
 * `@deepseek-ai/*` runtime import.
 */

import type { Context } from '@deepseek-ai/cordis'

import { LABELS, NS } from './labels'
import { buildRows, filterRows, relativeTime, shortenPath, toMillis, SHORTLIST } from './model'
import { HERO_SLOT, heroInjection, registerLocale } from './remote'
import { WorkspacePicker } from './view'

/** Services this module needs before `apply` runs. */
export const inject = ['slots', 'locale', 'uiWorkspace', 'workspaces', 'remote']

/**
 * Register the locale dictionaries and shadow the shipped hero picker at a
 * lower priority. Both live in `ctx.effect`, so the plugin unload restores
 * DSH's own menu and drops the dictionaries.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => registerLocale(ctx), `${NS}: locale`)

  const injected = heroInjection(ctx)
  // Priority -1 shadows the shipped picker: in a single slot the lowest
  // priority renders. Disabling this bundle restores the shipped menu.
  ctx.effect(() => ctx.slots.inject(HERO_SLOT, () => ctx.slots.register({
    name: HERO_SLOT,
    priority: -1,
    locale: NS,
    inject: injected,
  }, WorkspacePicker)), `${NS}: hero picker`)
}

/** Pure model helpers the offline tests drive directly. */
export const __test = {
  SHORTLIST,
  buildRows,
  filterRows,
  shortenPath,
  relativeTime,
  toMillis,
}
