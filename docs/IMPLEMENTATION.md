# 工作区切换器实现说明

产品交互与成功标准见[产品设计](DESIGN.md)，宿主内置插槽限制评估见[当前 DSH 接口核对](browser-extension-notes.md)。

## 弹窗接入与数据来源

- 插件通过 `shell.overlay` 渲染独立浏览器弹窗，消费 DSH 的工作区与会话快照、实时会话状态、消息内容搜索与导航能力，
  同时保留内置侧栏使用自身组件与扩展贡献；两者共享官方最新祖先工作区树归属算法（含 UNC 共享根与同路径别名）。
- 内容搜索依赖 Host `session-query-sqlite`（DSH 默认 `openAt: never`），禁用或失败时静默降级为本地匹配。
- 新会话页紧凑标签通过接管 `workspace.picker` 呈现最近五个工作区及展开入口，
  选择已登记工作区时调用 Hero `onPick` 以复用草稿和 Agent preset 流程。

## 菜单、状态与测试边界

- 视图菜单使用 DSH Web 共享 `Menu` 与原生图标；行内省略号由 `contextMenu.button` 创建，
  右键与 `Shift+F10` 通过 `useContextMenu` 绑定，行内快捷按钮解析 DSH 已注册的同一菜单动作。
- 会话状态沿用官方行优先级与共享 `StateDot`；「上一个会话」历史以最大 32 条保存在当前窗口插件实例中；
  非平铺分组偏好、排序与归档筛选保存在浏览器本地存储。
