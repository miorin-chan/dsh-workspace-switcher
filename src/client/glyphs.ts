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

/** The open folder and disclosure triangle share the sidebar's icon cell. */
export const OpenFolderGlyph = (props: GlyphProps): ReactNode => h(Glyph, {
  ...props,
  paths: ['M2 12.75V4.5A1.5 1.5 0 0 1 3.5 3h3l1.4 1.5h4.6A1.5 1.5 0 0 1 14 6v.75', 'M2 12.75l1.65-5a1.25 1.25 0 0 1 1.2-.85h9.2a.75.75 0 0 1 .72.97l-1.45 4.65a1.25 1.25 0 0 1-1.2.88H3a1 1 0 0 1-1-.65Z'],
})

export function DisclosureGlyph({ size = 16, className }: GlyphProps): ReactNode {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'currentColor',
    'aria-hidden': true, focusable: false, className,
  }, h('path', { d: 'M6 4.3a.5.5 0 0 0-.8.4v6.6a.5.5 0 0 0 .8.4l4.5-3.3a.5.5 0 0 0 0-.8Z' }))
}

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
