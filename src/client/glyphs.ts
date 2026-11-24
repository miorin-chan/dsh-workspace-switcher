import {
  IconCheckOutlineRegular,
  IconChevronLeftOutlineRegular,
  IconChevronRightOutlineRegular,
  IconCloseOutlineRegular,
  IconFolderCloseRegular,
  IconFolderOpenOutlineRegular,
  IconPlusOutlineRegular,
  IconSearchOutlineRegular,
  IconTriangleRightFillRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComponentType, ReactNode } from 'react'
import * as React from 'react'

const h = React.createElement

export interface GlyphProps {
  /** Rendered edge length in px; the switcher grid is 16. */
  readonly size?: number
  readonly className?: string
}

function platformGlyph(Icon: ComponentType<GlyphProps>): (props: GlyphProps) => ReactNode {
  return ({ size = 16, className }) => h(Icon, { size, className })
}

export const FolderGlyph = platformGlyph(IconFolderCloseRegular)
export const OpenFolderGlyph = platformGlyph(IconFolderOpenOutlineRegular)
export const DisclosureGlyph = platformGlyph(IconTriangleRightFillRegular)
export const SearchGlyph = platformGlyph(IconSearchOutlineRegular)
export const PlusGlyph = platformGlyph(IconPlusOutlineRegular)
export const CheckGlyph = platformGlyph(IconCheckOutlineRegular)
export const CloseGlyph = platformGlyph(IconCloseOutlineRegular)
export const ChevronRightGlyph = platformGlyph(IconChevronRightOutlineRegular)
export const ChevronLeftGlyph = platformGlyph(IconChevronLeftOutlineRegular)

/** Draw the switcher-specific glyphs with the same size and color contract. */
function Glyph({ paths, size = 16, className }: GlyphProps & { readonly paths: readonly string[] }): ReactNode {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
    className,
  }, paths.map((d, index) => h('path', { key: index, d })))
}

/** Four cells for the action that reveals all results. */
export const GridGlyph = (props: GlyphProps): ReactNode => h(Glyph, {
  ...props,
  paths: [
    'M2.6 2.6h4.1v4.1H2.6z', 'M9.3 2.6h4.1v4.1H9.3z',
    'M2.6 9.3h4.1v4.1H2.6z', 'M9.3 9.3h4.1v4.1H9.3z',
  ],
})
