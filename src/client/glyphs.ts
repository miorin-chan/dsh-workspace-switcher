/**
 * Icons: local stroke glyphs, sized to the host's 16px icon grid.
 */

import type { ReactNode } from 'react'
import * as React from 'react'

const h = React.createElement

/** Props every glyph forwards to the SVG. */
export interface GlyphProps {
  /** Rendered edge length in px; the host grid is 16. */
  readonly size?: number
  /** Extra class names from the caller. */
  readonly className?: string
}

/** One stroked SVG glyph. */
interface GlyphSpec extends GlyphProps {
  /** SVG path data, drawn in order. */
  readonly paths: readonly string[]
}

/**
 * Render one stroked SVG glyph.
 * @param props - glyph geometry.
 * @returns the svg element.
 */
function Glyph({ paths, size = 16, className }: GlyphSpec): ReactNode {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
    className,
  }, paths.map((d, index) => h('path', { key: index, d })))
}

/** A folder outline: a Workspace row's icon. */
export const FolderGlyph = (props: GlyphProps): ReactNode => h(Glyph, {
  ...props,
  paths: ['M2.25 4.6c0-.75.6-1.35 1.35-1.35h3.1l1.35 1.5h5.6c.74 0 1.35.6 1.35 1.35v5.7c0 .75-.6 1.35-1.35 1.35H3.6c-.75 0-1.35-.6-1.35-1.35z'],
})

/** A magnifier: the search field's leading icon. */
export const SearchGlyph = (props: GlyphProps): ReactNode => h(Glyph, {
  ...props,
  paths: ['M7.2 2.75a4.45 4.45 0 1 0 0 8.9 4.45 4.45 0 0 0 0-8.9Z', 'm10.5 10.5 2.75 2.75'],
})

/** A plus: the add-workspace action. */
export const PlusGlyph = (props: GlyphProps): ReactNode => h(Glyph, { ...props, paths: ['M8 3.25v9.5', 'M3.25 8h9.5'] })

/** A check: the selected row's trailing marker. */
export const CheckGlyph = (props: GlyphProps): ReactNode => h(Glyph, { ...props, paths: ['M3.1 8.2 6.3 11.4 12.9 4.8'] })

/** An X: the search clear button and the dialog close button. */
export const CloseGlyph = (props: GlyphProps): ReactNode => h(Glyph, { ...props, paths: ['M4.2 4.2l7.6 7.6', 'M11.8 4.2l-7.6 7.6'] })

/** A right chevron: the expand-to-dialog action. */
export const ChevronRightGlyph = (props: GlyphProps): ReactNode => h(Glyph, { ...props, paths: ['M6.4 3.9 10.5 8l-4.1 4.1'] })

/** A left chevron: the dialog's back-to-compact action. */
export const ChevronLeftGlyph = (props: GlyphProps): ReactNode => h(Glyph, { ...props, paths: ['M9.6 3.9 5.5 8l4.1 4.1'] })

/** A four-cell grid: the "all results" action. */
export const GridGlyph = (props: GlyphProps): ReactNode => h(Glyph, {
  ...props,
  paths: [
    'M2.6 2.6h4.1v4.1H2.6z', 'M9.3 2.6h4.1v4.1H9.3z',
    'M2.6 9.3h4.1v4.1H2.6z', 'M9.3 9.3h4.1v4.1H9.3z',
  ],
})
