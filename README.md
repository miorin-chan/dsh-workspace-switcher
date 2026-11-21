# @miorin/dsh-workspace-welcome-switcher

[简体中文](README.zh.md)

**Search sessions and browse the workspace tree from a shared dialog.**

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Use

- **Mod+K** opens recent sessions.
  Search by title, workspace, path, ID, or message content, then open a result.
- **Mod+Shift+K** opens the last selected workspace grouping and defaults to the workspace tree.
  Expand a workspace to open one of its sessions, or select a workspace to rename it.
  On a New Session screen, choosing a workspace switches the draft to that workspace.
- The workspace chip on a New Session screen opens the searchable five-row shortlist.
  **All N** expands it.

Use ↑ and ↓ to move, ← and → to collapse or expand a focused tree row, Enter to activate, and Esc to dismiss.
Mod is Command on macOS and Ctrl elsewhere.

Open **View options** in the dialog to choose a grouping, session order, or archive filter.
The optional [directory tree plugin](../dsh-workspace-file-tree/README.md) adds a grouping.
In manual mode, drag sessions within one group, or select a session and use the move buttons.
Select an archived session to reveal its unarchive action.

## Limits

- **Add workspace** uses the local Host’s native folder chooser.
- Browsers can reserve key combinations.
  On macOS and Windows Web, the default session-search command also opens the dialog with **Mod+Alt+K**.

## Install

**Plugins** > **Add plugin**, or install this directory with `plugin_manager`.
This bundle is part of [`@miorin/dsh-workspace-atlas`](../dsh-workspace-atlas/README.md);
install either one, never both.

[Project documentation](docs/README.md)
