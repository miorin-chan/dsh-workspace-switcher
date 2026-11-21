import * as React from 'react'
import type { ReactNode } from 'react'
import { CheckGlyph, DirectoryTreeGlyph, FolderGlyph, ListGlyph, SlidersGlyph, WorkspaceTreeGlyph } from './glyphs'
import { FLAT, WORKSPACES, WORKSPACE_TREE } from './grouping'

const h = React.createElement

interface GroupingMenuProps {
  readonly label: string
  readonly heading: string
  readonly choices: readonly { readonly id: string; readonly label: string }[]
  readonly selected: string
  readonly disabled: boolean
  readonly onSelect: (id: string) => void
}

function groupingGlyph(id: string) {
  switch (id) {
    case FLAT: return ListGlyph
    case WORKSPACES: return FolderGlyph
    case WORKSPACE_TREE: return WorkspaceTreeGlyph
    default: return DirectoryTreeGlyph
  }
}

/** Show the current grouping and keep keyboard focus inside the dialog. */
export function GroupingMenu({ label, heading, choices, selected, disabled, onSelect }: GroupingMenuProps): ReactNode {
  const [open, setOpen] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const menu = React.useRef<HTMLDivElement>(null)
  const menuId = React.useId()
  const close = () => {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  React.useLayoutEffect(() => {
    const list = menu.current
    if (list === null || list.contains(document.activeElement)) return
    const item = list.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?? list.querySelector<HTMLButtonElement>('button')
    item?.focus()
  }, [open, choices, selected])

  React.useEffect(() => {
    if (!open) return
    const dismiss = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || root.current?.contains(event.target)) return
      const dialog = root.current?.closest('[role="dialog"]')
      if (dialog?.contains(event.target) && !dialog.contains(document.activeElement)) close()
      else setOpen(false)
    }
    document.addEventListener('click', dismiss, true)
    return () => document.removeEventListener('click', dismiss, true)
  }, [open])

  return h('div', {
    className: 'wsp-group-control', ref: root,
    onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    },
  },
    h('button', {
      type: 'button', className: 'wsp-icon-btn wsp-tool-button', ref: trigger,
      title: label, 'aria-label': label, 'aria-haspopup': 'menu',
      'aria-expanded': open, 'aria-controls': open ? menuId : undefined, disabled,
      onClick: () => { if (open) close(); else setOpen(true) },
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowDown' || event.nativeEvent.isComposing) return
        event.preventDefault()
        setOpen(true)
      },
    }, h(SlidersGlyph)),
    open ? h('div', {
      className: 'wsp-popover wsp-group-menu', role: 'menu', 'aria-label': label, id: menuId, ref: menu,
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Tab') {
          close()
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          close()
          return
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const items = Array.from(event.currentTarget.querySelectorAll('button'))
        const current = items.findIndex(item => item === event.target)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        event.preventDefault()
        items[next]?.focus()
      },
    }, h('div', { className: 'wsp-group-heading', 'aria-hidden': true }, heading),
    choices.map(({ id, label: name }) => h('button', {
      key: id, type: 'button', role: 'menuitemradio', tabIndex: -1,
      className: 'wsp-row wsp-group-item', 'aria-checked': id === selected,
      onClick: () => { onSelect(id); close() },
    },
    h('span', { className: 'wsp-row-icon' }, h(groupingGlyph(id))),
    h('span', { className: 'wsp-group-item-name' }, name),
    h('span', { className: 'wsp-row-check', 'aria-hidden': true }, id === selected ? h(CheckGlyph, { size: 14 }) : null),
    ))) : null,
  )
}
