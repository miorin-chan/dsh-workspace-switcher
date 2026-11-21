# @miorin/dsh-workspace-welcome-switcher

[English](README.md)

**在同一套弹窗中检索会话和浏览工作区树。**

需要 DeepSeek Harness 0.2.2-rc.3 或更新版本。

## 使用

- **Mod+K** 打开最近会话列表。可按标题、工作区、路径、会话 ID 或消息正文检索，选择结果后直接打开会话。
- **Mod+Shift+K** 打开工作区树。已有会话中可展开工作区浏览和打开会话，也可选中工作区重命名。
  在新会话页，选择一行会把新会话切到对应工作区。
- 在新会话页点击工作区标签，仍可检索最近使用的五个工作区，或通过 **全部 N 个** 展开。

用 ↑ 和 ↓ 移动，← 和 → 折叠或展开已聚焦的树节点，Enter 打开或选择，Esc 关闭。
macOS 的 Mod 是 Command，其他平台是 Ctrl。

## 限制

- **添加工作区** 使用本机 Host 的原生目录选择器。
- 浏览器可能保留部分快捷键。macOS 和 Windows 的 Web 版也可使用默认会话搜索键 **Mod+Alt+K**。

## 安装

在 **插件** > **添加插件** 中选择本目录，或通过 `plugin_manager` 安装。
本插件属于 [`@miorin/dsh-workspace-atlas`](../dsh-workspace-atlas/README.zh.md) 聚合包；两者只能装一个。

[项目文档](docs/README.md)
