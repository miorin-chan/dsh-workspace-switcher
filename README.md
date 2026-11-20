# dsh-workspace-picker

[简体中文](README.zh.md)

Upgrades the Workspace chooser on the New Session screen.
The built-in picker is one flat menu in registry order; this bundle replaces it with recently used ordering,
a search field, a five-row shortlist, and an expanded chooser dialog for installations with many Workspaces.

Requires DeepSeek Harness 0.2.2-rc.3 or newer.

## Use

Click the Workspace chip above the composer on a New Session screen.
The compact picker lists the five most recently used Workspaces; typing filters by name or path.
**All N** opens the expanded chooser, where arrow keys move the highlight,
Enter opens the highlighted Workspace, and Escape returns to the compact picker.
**Add workspace** picks a folder through the Host and selects it for the new session.

The order is derived at render time from the latest activity of each Workspace's Sessions.
It does not rewrite the durable Workspace order used by the sidebar.

## Limits

- **Add workspace** needs the local Host's native folder chooser, so it is hidden while the client is connected
  to a remote or SSH-forwarded Host; use the sidebar's in-app directory picker there.
  A failed local adoption stays in the picker with the Host's message.
- The compact shortlist shows at most five rows; the size is not configurable.
- The picker appears only on the blank-session hero.
  The sidebar browser keeps its own controls.

Disable the bundle in **Plugins** to restore the built-in menu.
The durable Workspace registry and Session order are unchanged either way.

## Install

In **Plugins** > **Add plugin**, choose this directory, or install the bundle with `plugin_manager`.
The bundle appears as **Refined workspace picker**.

## Workspace family

This bundle is part of the [`dsh-workspace-family`](../dsh-workspace-family/README.md) aggregate, which puts it
on one **Plugins** card with the workspace name in the session header and the per-workspace agent defaults.
The aggregate inserts the same row id, so install either this bundle or the aggregate, never both.

[Project documentation](docs/README.md)
