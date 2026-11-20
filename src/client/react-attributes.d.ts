/**
 * React's `HTMLAttributes` has no index signature for `data-*`, and the picker
 * expresses its row and search state through four data attributes that the
 * stylesheet and the ship contract read. Declare exactly those four.
 */

import 'react'

declare module 'react' {
  interface HTMLAttributes<T> {
    /** Compact/dialog row highlight. */
    'data-active'?: string | undefined
    /** The search field holds a value, so its clear button has a gutter. */
    'data-has-value'?: string | undefined
    /** The row is the currently selected Workspace. */
    'data-selected'?: string | undefined
    /** Row marker the stylesheet and the highlight-scroll effect read. */
    'data-wsp-row'?: string | undefined
  }
}
