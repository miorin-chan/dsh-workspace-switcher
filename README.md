# dsh-workspace-welcome-switcher

[简体中文](README.zh.md)

**Active workspace choice for the New Session screen.**

The built-in picker is a flat registry-order menu: you find a Workspace by scanning it.
This bundle moves the choice from passive traversal to active retrieval: recent activity first,
type-to-filter, and a short list on the hero so everyday choice is one click away.
The expanded dialog covers long lists.

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Use

- Click the Workspace chip above the composer on a New Session screen.
- Type a name or path to filter; the list starts with the five most recently used Workspaces.
- **All N** opens the full chooser; arrow keys move, Enter chooses, Escape returns.
- **Add workspace** picks a folder through the Host and selects it for this session.

Recent order is computed at render time from Session activity; it never rewrites the sidebar's Workspace order.

## Limits

- **Add workspace** needs the local Host's native folder chooser; it hides on remote or SSH-forwarded Hosts.
- The compact list shows at most five rows.
- The picker appears only on the blank New Session hero.

## Install

**Plugins** > **Add plugin**, or install this directory with `plugin_manager`.
This bundle is part of [`dsh-workspace-atlas`](../dsh-workspace-atlas/README.md); install either one, never both.

[Project documentation](docs/README.md)
