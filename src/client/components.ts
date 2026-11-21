/**
 * Presentational pieces of the picker: the search field, one Workspace row,
 * section headings, and the loading/empty/error surfaces.
 */

import type { ReactNode, RefObject } from 'react'
import * as React from 'react'

import {
  CheckGlyph, CloseGlyph, FolderGlyph, PlusGlyph, SearchGlyph,
} from './glyphs'
import type { TranslateSeat } from './labels'
import { relativeTime, shortenPath, type WorkspaceRow } from './model'

const h = React.createElement

/** Search field bound to the caller's query. */
export interface SearchFieldProps {
  readonly t: TranslateSeat
  readonly value: string
  readonly onChange: (value: string) => void
  readonly inputRef: RefObject<HTMLInputElement>
  readonly onKeyDown?: React.KeyboardEventHandler<HTMLInputElement> | undefined
  /** The listbox id, present only while a list renders. */
  readonly listId: string | undefined
  /** The keyboard-highlighted option id, if any. */
  readonly activeOptionId: string | undefined
  readonly label?: string
  readonly tree?: boolean
}

/**
 * Search field bound to the caller's query.
 * @param props - field props.
 * @returns the field element.
 */
export function SearchField({
  t, value, onChange, inputRef, listId, activeOptionId, label, tree, onKeyDown,
}: SearchFieldProps): ReactNode {
  return h('div', {
    className: 'wsp-search',
    'data-has-value': value === '' ? undefined : 'true',
  },
    h('span', { className: 'wsp-search-icon' }, h(SearchGlyph, { size: 14 })),
    h('input', {
      ref: inputRef, onKeyDown,
      className: 'wsp-search-input',
      type: 'search',
      value,
      placeholder: label ?? t('search.placeholder'),
      'aria-label': label ?? t('search.label'),
      'aria-haspopup': tree ? 'tree' : undefined,
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': listId !== undefined,
      'aria-controls': listId,
      'aria-activedescendant': activeOptionId,
      autoComplete: 'off',
      spellCheck: false,
      onChange: event => onChange(event.target.value),
    }),
    value === ''
      ? null
      : h('button', {
        type: 'button',
        className: 'wsp-search-clear',
        'aria-label': t('search.clear'),
        title: t('search.clear'),
        onClick: () => {
          onChange('')
          inputRef.current?.focus()
        },
      }, h(CloseGlyph, { size: 11 })),
  )
}

export function AddWorkspaceButton({ t, busy, onClick }: {
  readonly t: TranslateSeat
  readonly busy: boolean
  readonly onClick: () => void
}): ReactNode {
  return h('button', {
    type: 'button', className: 'wsp-foot-action', title: t('addHint'),
    'aria-disabled': busy || undefined, onClick,
  },
    busy ? h('span', { className: 'wsp-spinner' }) : h(PlusGlyph, { size: 14 }),
    h('span', null, t(busy ? 'adding' : 'add')),
  )
}

/** Row props: one Workspace plus its position in the list. */
export interface WorkspaceRowProps {
  readonly row: WorkspaceRow
  readonly id: string
  readonly active: boolean
  readonly selected: boolean
  /** Current epoch ms, for the relative activity label. */
  readonly now: number
  readonly t: TranslateSeat
  /** Compact popover row instead of a dialog row. */
  readonly compact: boolean
  /** An adoption is in flight; rows keep their shape but cannot choose. */
  readonly busy: boolean
  readonly onChoose: (row: WorkspaceRow) => void
  readonly onHover: (id: string) => void
}

/**
 * One Workspace row.
 * @param props - row props.
 * @returns the row element.
 */
export function WorkspaceRowButton({
  row, id, active, selected, now, t, compact, busy, onChoose, onHover,
}: WorkspaceRowProps): ReactNode {
  return h('button', {
    type: 'button',
    role: 'option',
    id,
    tabIndex: -1,
    'aria-disabled': busy === true ? 'true' : undefined,
    'data-wsp-row': 'true',
    'data-active': active ? 'true' : undefined,
    'data-selected': selected ? 'true' : undefined,
    'aria-selected': selected,
    className: 'wsp-row',
    title: row.path,
    onClick: () => onChoose(row),
    onMouseMove: () => onHover(row.id),
  },
    h('span', { className: 'wsp-row-icon' }, h(FolderGlyph, { size: compact ? 14 : 16 })),
    compact
      ? h('span', { className: 'wsp-row-line' },
        h('span', { className: 'wsp-row-title' }, row.title),
        row.showPath ? h('span', { className: 'wsp-row-suffix' }, shortenPath(row.path)) : null,
      )
      : h('span', { className: 'wsp-row-text' },
        h('span', { className: 'wsp-row-title' }, row.title),
        row.path === '' ? null : h('span', { className: 'wsp-row-path' }, row.path),
      ),
    h('span', { className: 'wsp-row-meta' },
      h('span', { className: 'wsp-row-time' }, relativeTime(row.latest, now, t)),
      compact || row.count === 0
        ? null
        : h('span', { className: 'wsp-row-count' },
          t(row.count === 1 ? 'sessions.one' : 'sessions.other', { n: row.count })),
    ),
    h('span', { className: 'wsp-row-check', 'aria-hidden': 'true' },
      selected ? h(CheckGlyph, { size: 14 }) : null),
  )
}

/** Section heading inside the list. */
export interface SectionHeaderProps {
  readonly label: string
  readonly count?: number
}

/**
 * Section heading inside the list.
 * @param props - heading props.
 * @returns the heading element.
 */
export function SectionHeader({ label, count }: SectionHeaderProps): ReactNode {
  return h('div', { className: 'wsp-section', role: 'presentation' },
    h('span', { className: 'wsp-section-label' }, label),
    typeof count === 'number' && count > 0 ? h('span', { className: 'wsp-section-count' }, count) : null,
  )
}

/** Empty-list state, in the host's quiet status-text voice. */
export interface EmptyStateProps {
  readonly title: string
  readonly body: string
}

/**
 * Empty-list state, in the host's quiet status-text voice.
 * @param props - state props.
 * @returns the state element.
 */
export function EmptyState({ title, body }: EmptyStateProps): ReactNode {
  return h('div', { className: 'wsp-empty', role: 'status' },
    h('span', { className: 'wsp-empty-title' }, title),
    h('span', { className: 'wsp-empty-body' }, body),
  )
}

/** Loading skeleton. */
export interface SkeletonProps {
  readonly rows?: number
}

/**
 * Loading skeleton.
 * @param props - skeleton props.
 * @returns the skeleton element.
 */
export function Skeleton({ rows = 4 }: SkeletonProps): ReactNode {
  return h('div', { className: 'wsp-skeleton', 'aria-hidden': 'true' },
    Array.from({ length: rows }, (_, index) => h('div', { key: index, className: 'wsp-skeleton-row' },
      h('span', { className: 'wsp-skeleton-icon' }),
      h('span', { className: 'wsp-skeleton-text' },
        h('span', { className: 'wsp-skeleton-bar wsp-skeleton-bar-wide' }),
        h('span', { className: 'wsp-skeleton-bar wsp-skeleton-bar-narrow' }),
      ),
    )),
  )
}

/** Inline adoption error with a dismiss action. */
export interface ErrorBannerProps {
  readonly label: string
  readonly message: string
  readonly dismiss: string
  readonly onDismiss: () => void
}

/**
 * Inline adoption error with a dismiss action.
 * @param props - banner props.
 * @returns the banner element.
 */
export function ErrorBanner({ label, message, dismiss, onDismiss }: ErrorBannerProps): ReactNode {
  return h('div', { className: 'wsp-error', role: 'alert' },
    h('span', { className: 'wsp-error-text' },
      h('span', { className: 'wsp-error-label' }, label + ': '),
      message,
    ),
    h('button', {
      type: 'button', className: 'wsp-error-dismiss', onClick: onDismiss,
    }, dismiss),
  )
}
