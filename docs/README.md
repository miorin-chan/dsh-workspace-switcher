# 项目文档

- [产品设计](DESIGN.md) — 快捷键、弹窗分组、分隔线改良与成功标准。
- [实现说明](IMPLEMENTATION.md) — `shell.overlay` 接入、菜单与本地状态机制。
- [当前 DSH 接口核对](browser-extension-notes.md) — 内置侧栏和弹窗的扩展范围。
- [变更记录](../CHANGELOG.md)。

## 重拍宣发截图

从默认工作区根目录运行 `node tools/dsh-plugin-shots/cli.mts --pilot workspace-switcher`。
检查主图和入口的明暗两版后，把四张 PNG 复制到 `docs/assets/screenshots/` 的同名路径。
README 与市场截图清单使用全部四张，DSH 详情页只使用浅色主图。

开发约定见 [AGENTS.md](../AGENTS.md) 与 [AGENTS.local.md](../AGENTS.local.md)。
