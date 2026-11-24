// SPDX-License-Identifier: MIT
// View-options presentation adapted from @deepseek-ai/dsh-client-ui-workspace
// 0.2.2-rc.5, src/client/rows/WorkspaceBrowser.tsx. Copyright (c) 2026 DeepSeek.

import * as React from 'react'
import type { ReactNode } from 'react'
import {
  IconArchiveCheckOutlineRegular, IconArchiveOffOutlineRegular, IconChevronsUpDownOutlineRegular,
  IconClockOutlineRegular, IconFlatListOutlineRegular, IconFolderCloseRegular, IconQueueOutlineRegular,
  IconSlidersTwoOutlineRegular, IconWorkspaceTreeOutlineRegular, Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { FLAT, WORKSPACES, WORKSPACE_TREE } from './grouping'

const h = React.createElement

interface ViewOptionsSection {
  readonly heading: string
  readonly selected: string
  readonly choices: readonly { readonly id: string; readonly label: string }[]
  readonly onSelect: (id: string) => void
}

interface GroupingMenuProps {
  readonly label: string
  /** Grouping, followed by session order and archive filter when available. */
  readonly sections: readonly ViewOptionsSection[]
  readonly disabled: boolean
}

function optionIcon(sectionIndex: number, id: string): ReactNode {
  if (sectionIndex === 1) {
    if (id === 'manual') return h(IconChevronsUpDownOutlineRegular)
    if (id === 'updated') return h(IconClockOutlineRegular)
  } else if (sectionIndex === 2) {
    if (id === 'hide-archived') return h(IconArchiveOffOutlineRegular)
    if (id === 'show-archived') return h(IconQueueOutlineRegular)
    if (id === 'only-archived') return h(IconArchiveCheckOutlineRegular)
  } else {
    if (id === FLAT) return h(IconFlatListOutlineRegular)
    if (id === WORKSPACES) return h(IconFolderCloseRegular)
    if (id === WORKSPACE_TREE) return h(IconWorkspaceTreeOutlineRegular)
  }
  return null
}

export function GroupingMenu({ label, sections, disabled }: GroupingMenuProps): ReactNode {
  const [open, setOpen] = React.useState(false)
  const trigger = React.useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)
  const actions = new Map<string, () => void>()
  const items = sections.flatMap((section, index): MenuEntry[] => [
    ...(index === 0 ? [] : [{ type: 'separator' as const, id: `separator:${index}` }]),
    { type: 'label', id: `label:${index}`, text: section.heading },
    ...section.choices.map(choice => {
      const id = `${index}:${choice.id}`
      actions.set(id, () => section.onSelect(choice.id))
      return { id, label: h('span', { className: 'wsp-view-options-label' }, choice.label), icon: optionIcon(index, choice.id) }
    }),
  ])

  return h('div', {
    onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget)) close()
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open || event.key !== 'Tab' || event.nativeEvent.isComposing) return
      close()
      trigger.current?.focus({ preventScroll: true })
      // Let the switcher dialog handle tabbing. The primitive's document
      // listener would otherwise select the focused menu item on Tab.
      event.nativeEvent.stopPropagation()
    },
  }, h(Menu, {
    open: open && !disabled,
    onClose: close,
    items,
    selectedIds: sections.map((section, index) => `${index}:${section.selected}`),
    onSelect: id => {
      actions.get(id)?.()
      close()
    },
    align: 'end',
    autoFocus: true,
    dense: true,
    className: 'wsp-view-options',
    listClassName: 'wsp-view-options-menu',
    anchor: h('button', {
      type: 'button', className: 'wsp-icon-btn wsp-tool-button', ref: trigger,
      title: label, 'aria-label': label, 'aria-haspopup': 'menu',
      'aria-expanded': open && !disabled, disabled,
      onClick: () => setOpen(value => !value),
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (open || event.nativeEvent.isComposing || event.key !== 'ArrowDown') return
        event.preventDefault()
        setOpen(true)
      },
    }, h(IconSlidersTwoOutlineRegular)),
  }))
}
