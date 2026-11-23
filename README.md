# @miorin/dsh-workspace-switcher

[简体中文](README.zh.md)

**Search and switch sessions or browse the workspace tree from a shared dialog.**

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Use

- **Mod+K** opens recent sessions.
  Search by title, workspace, path, ID, or message content, then open a result.
- **Mod+Shift+K** opens the last selected workspace grouping and defaults to the workspace tree.
  Expand a workspace to browse and open its sessions.
  On a New Session screen, choosing a workspace switches the draft to that workspace.
- **Ctrl+Tab** immediately opens the previous session visited in this window.
  Press it again to switch back.
- The workspace chip on a New Session screen opens the searchable five-row shortlist.
  **All N** expands it.

Use ↑ and ↓ to move, ← and → to collapse or expand a focused tree row, Enter to activate, and Esc to dismiss.
Mod is Command on macOS and Ctrl elsewhere.

Open **View options** in the dialog to choose a grouping, session order, or archive filter.
The optional [directory tree plugin](../dsh-workspace-file-tree/README.md) adds a grouping.
In manual mode, drag sessions within one group, or select a session and use the move buttons.
Use the row’s ellipsis or right-click to open DSH’s action menu.
With a row focused or highlighted by search, **Shift+F10** opens the same menu.
The menu offers the actions available for that row, including unarchiving.

## Limits

- **Add workspace** uses the local Host’s native folder chooser.
- **Ctrl+Tab** is the default binding on macOS and Windows Desktop.
  On other platforms, assign supported keys to the command in **Settings → Shortcuts**.
- Browsers can reserve key combinations.
  On macOS and Windows Web, the default session-search command also opens the dialog with **Mod+Alt+K**.

## Install

**Plugins** > **Add plugin**, or install this directory with `plugin_manager`.
This bundle is part of [`@miorin/dsh-atlas-workspace`](../dsh-atlas-workspace/README.md);
install either one, never both.

[Project documentation](docs/README.md)
