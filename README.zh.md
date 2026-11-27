# @miorin/dsh-workspace-switcher

[English](README.md)

**在同一套弹窗中检索、切换会话和浏览工作区树。**

需要 DeepSeek Harness 0.2.2-rc.3 或更新版本。

## 界面与入口

在新会话页点击工作区标签，再点「全部 N 个」展开选择器。
主图展示搜索「设计」后筛出的四个工作区。

| | 浅色 | 深色 |
| --- | --- | --- |
| 工作区搜索 | ![浅色工作区选择器，显示四条搜索结果](docs/assets/screenshots/main-light.png) | ![深色工作区选择器，显示四条搜索结果](docs/assets/screenshots/main-dark.png) |
| 新会话入口 | ![浅色新会话工作区标签](docs/assets/screenshots/entry-light.png) | ![深色新会话工作区标签](docs/assets/screenshots/entry-dark.png) |

## 使用

- **Mod+K** 打开最近会话列表。可按标题、工作区、路径、会话 ID 或消息正文检索，选择结果后直接打开会话。
- **Mod+Shift+K** 打开上次选用的工作区分组，默认显示工作区树。
  聚焦工作区行后，按**空格**展开或折叠，按**回车**在该工作区打开新会话。
  也可以点击「更多」右侧的新建会话图标。
  在新会话页，按回车为当前草稿选择工作区。
- **Ctrl+Tab** 立即切到本窗口上一个访问过的会话，再按一次切回来。
- 在新会话页点击工作区标签，仍可检索最近使用的五个工作区，或通过 **全部 N 个** 展开。

用 ↑ 和 ↓ 移动，← 和 → 折叠或展开已聚焦的树节点，Enter 打开或选择，Esc 关闭。
macOS 的 Mod 是 Command，其他平台是 Ctrl。

弹窗中的 **视图选项** 可以切换分组、会话排序和归档筛选。
手动排序时可拖动同组会话，也可选中会话后使用上移、下移按钮。
点击行尾的省略号或右键点击行可打开 DSH 操作菜单。
行获得焦点或在搜索结果中高亮时，也可用 **Shift+F10** 打开。
菜单列出该行可用的操作，包括取消归档。

## 限制

- 按消息正文检索跟随 DSH 部署的设置，与内置侧栏相同。
  部署未启用内容搜索时，弹窗只按标题、工作区、路径和会话 ID 匹配。
- **添加工作区** 使用本机 Host 的原生目录选择器。
- **Ctrl+Tab** 默认绑定在 macOS 和 Windows 桌面端。
  其他平台可在 **设置 → 快捷键** 为这个命令绑定受支持的按键。
- 浏览器可能保留部分快捷键。macOS 和 Windows 的 Web 版也可使用默认会话搜索键 **Mod+Alt+K**。

## 安装

在新检出的目录中运行 `pnpm install --frozen-lockfile` 安装依赖并构建插件。
然后在 **插件** > **添加插件** 中选择该目录，或通过 `plugin_manager` 安装。
本插件属于 [`@miorin/dsh-atlas-workspace`](../dsh-atlas-workspace/README.zh.md) 聚合包；两者只能装一个。

[项目文档](docs/README.md)
