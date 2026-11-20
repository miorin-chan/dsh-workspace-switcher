/**
 * The DSH services this bundle drives.
 *
 * Everything the picker reads from the Host arrives through the slot's
 * standard shares or this registered inject face; nothing here renders. Each
 * read is fail-safe: a missing shape leaves DSH behavior intact and warns once
 * from `apply` rather than throwing during a render.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'

import { LABELS, NS } from './labels'

/** The single hero slot this bundle shadows. */
export const HERO_SLOT = 'conversation.hero.workspace'

/** The directory-flow hole the shadowed registration declares. */
export const DIRECTORY_FLOW_SLOT = 'conversation.hero.workspace.directoryFlow'

/**
 * External-store observable carried in an inject face's `hooks` compartment.
 * Internal shape, verified against 0.2.2-rc.5: the slot contract types the
 * compartment through a store package this bundle does not install.
 */
export interface HostObservable<Snapshot> {
  getSnapshot(): Snapshot
  subscribe(listener: () => void): () => void
}

/** The business face injected into the hero picker registration. */
export interface PickerInjected {
  /** Open the Host's native folder chooser. */
  readonly pickDirectory: () => Promise<string | null>
  /** Adopt a picked absolute path as a Workspace. */
  readonly createWorkspace: (input: { path: string }) => Promise<WorkspaceView>
  /** Whether the connected Host runs on this machine. */
  readonly localHost: boolean
  /** Occupancy of the directory-flow hole this registration's owner declares. */
  readonly hooks: { readonly directoryFlow: HostObservable<boolean> }
}

/**
 * The published occupancy signal for the hero's directory-flow hole: the add
 * action appears only while a composed picking interaction exists, and the
 * signal stays live when that package activates or unloads.
 * @param ctx - client root context.
 * @returns the occupancy observable.
 */
export function directoryFlowOf(ctx: Context): HostObservable<boolean> {
  return {
    getSnapshot: () => ctx.slots.entries(DIRECTORY_FLOW_SLOT).length > 0,
    subscribe: listener => ctx.slots.subscribe(DIRECTORY_FLOW_SLOT, listener),
  }
}

/**
 * Register this bundle's eight dictionaries under its namespace.
 * @param ctx - client root context.
 * @returns the locale disposer.
 */
export function registerLocale(ctx: Context): () => void {
  return ctx.locale.register(NS, LABELS)
}

/**
 * Build the registration's inject face, re-reading the fixed Host facts on
 * every render of the entry.
 * @param ctx - client root context.
 * @returns the inject factory.
 */
export function heroInjection(ctx: Context): () => PickerInjected {
  const directoryFlow = directoryFlowOf(ctx)
  return () => {
    let localHost = false
    try {
      localHost = ctx.remote.$host.isLoopback === true
    } catch {
      localHost = false
    }
    return {
      pickDirectory: () => ctx.uiWorkspace.pickDirectory(),
      createWorkspace: input => ctx.workspaces.create(input),
      localHost,
      hooks: { directoryFlow },
    }
  }
}
