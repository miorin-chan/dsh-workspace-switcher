import * as React from 'react'
import type { ReactNode, RefObject } from 'react'
import type { TranslateSeat } from './labels'
import { ChevronLeftGlyph, CloseGlyph } from './glyphs'
import { createPortal } from './portal'
import { CSS } from './styles'

const h = React.createElement

export function trapTab(event: { key: string; shiftKey: boolean; preventDefault(): void }, panel: HTMLElement | null): void {
  if (event.key !== 'Tab' || panel === null) return
  const items = panel.querySelectorAll<HTMLElement>(
    'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  const first = items[0]
  const last = items[items.length - 1]
  if (first === undefined || last === undefined) return
  const focused = document.activeElement
  const beforeFirst = focused?.compareDocumentPosition(first) === Node.DOCUMENT_POSITION_FOLLOWING
  const afterLast = focused?.compareDocumentPosition(last) === Node.DOCUMENT_POSITION_PRECEDING
  if (event.shiftKey && (focused === first || beforeFirst || !panel.contains(focused))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (focused === last || afterLast || !panel.contains(focused))) {
    event.preventDefault()
    first.focus()
  }
}

interface SwitcherDialogProps {
  readonly title: string
  readonly subtitle?: string
  readonly panelRef: RefObject<HTMLDivElement>
  readonly busy: boolean
  readonly search: ReactNode
  readonly body: ReactNode
  readonly status?: ReactNode
  readonly footer: ReactNode
  readonly t: TranslateSeat
  readonly onClose: () => void
  readonly onBack?: () => void
  readonly onKeyDown: React.KeyboardEventHandler<HTMLDivElement>
}

export function SwitcherDialog({
  title, subtitle, panelRef, busy, search, body, status, footer, t, onClose, onBack, onKeyDown,
}: SwitcherDialogProps): ReactNode {
  const titleId = React.useId()
  React.useEffect(() => {
    const style = document.body.style
    const previous = style.overflow
    style.overflow = 'hidden'
    return () => { style.overflow = previous }
  }, [])

  return createPortal(h(React.Fragment, null,
    h('style', null, CSS),
    h('div', {
      className: 'wsp-modal-layer',
      onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onClose()
      },
    },
      h('div', {
        ref: panelRef,
        className: 'wsp-dialog',
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': titleId,
        'aria-busy': busy || undefined,
        'data-shortcut-modal': 'workspace-switcher',
        onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
        onKeyDown,
      },
        h('div', { className: 'wsp-dialog-head' },
          onBack === undefined ? null : h('button', {
            type: 'button', className: 'wsp-icon-btn wsp-back',
            'aria-label': t('back'), title: t('back'), onClick: onBack,
          }, h(ChevronLeftGlyph, { size: 14 })),
          h('div', { className: 'wsp-dialog-heading' },
            h('h2', { className: 'wsp-dialog-title', id: titleId }, title),
            subtitle === undefined ? null : h('p', { className: 'wsp-dialog-subtitle' }, subtitle),
          ),
          h('button', {
            type: 'button', className: 'wsp-icon-btn',
            'aria-label': t('close'), title: t('close'), onClick: onClose,
          }, h(CloseGlyph, { size: 14 })),
        ),
        h('div', { className: 'wsp-dialog-search' }, search),
        h('div', { className: 'wsp-dialog-body' }, body),
        status,
        h('div', { className: 'wsp-dialog-foot' }, footer),
      ),
    ),
  ), document.body)
}
