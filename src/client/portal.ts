/**
 * The shell seeds `react-dom` into the module table through the loader's
 * `require`, and the module exposes `createPortal` as a named export; a
 * CommonJS-shaped module may instead carry the callable on its `default`.
 * Both shapes are accepted. Internal shape, verified against 0.2.2-rc.5.
 *
 * Resolution happens per call, not at module load, so a module table that
 * exposes neither shape fails at the portal (the only place that needs it)
 * rather than while the bundle registers.
 */

import type { ReactNode } from 'react'
import * as ReactDOMModule from 'react-dom'

/** The portal call both module shapes eventually carry. */
interface PortalCall {
  (children: ReactNode, container: Element): ReactNode
}

/** One `react-dom` face: the named export, and/or a nested CommonJS object. */
interface PortalModule {
  readonly createPortal?: PortalCall | undefined
  readonly default?: PortalModule | undefined
}

/**
 * Render `children` into `container` through the shell's `react-dom`.
 * @param children - React content to portal.
 * @param container - DOM container that receives it.
 * @returns the portal element.
 */
export function createPortal(children: ReactNode, container: Element): ReactNode {
  // The namespace import is an interop wrapper around what the loader returned.
  const namespace = ReactDOMModule as unknown as PortalModule
  const module = namespace.default ?? namespace
  const named = module.createPortal
  if (typeof named === 'function') return named(children, container)
  const nested = module.default
  const fallback = nested?.createPortal
  if (typeof fallback === 'function') return fallback(children, container)
  throw new Error('the shell module table exposes no react-dom createPortal')
}
