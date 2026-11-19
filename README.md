# 全局规则

点左侧栏中的 **全局规则**（在「插件」「自动化任务」下面），在同一个页面里编辑两类 `AGENTS.md`，不必再去 `~/.dsh` 或项目目录里找文件。

| 范围 | 编辑的文件 | 作用 |
|---|---|---|
| 全局 | `$DSH_HOME/AGENTS.md`（未设置 `DSH_HOME` 时即 `~/.dsh/AGENTS.md`） | `@deepseek-ai/dsh-agent-instructions` 的用户级指令链，位于项目级指令之前，对所有项目生效 |
| 项目 | 所选工作区根目录的 `AGENTS.md` | 只对该工作区生效；下拉框中标注哪些工作区已有规则 |

- 切换「全局 / 项目」或切换工作区时，每个目标各自保留草稿，未保存的编辑不会丢。
- 保存是原子的：先写临时文件再替换，保留原文件权限，文件不存在时创建。
- 带版本校验：若文件在加载后被其他会话（例如 Agent 自己）修改，保存会被拒绝并提示先重新加载，避免覆盖他人改动。
- Host 只接受 `global` 或 `workspace:<已注册工作区 id>` 两种目标；路径由 Host 自己解析，页面传不进任意路径。
- 修改对之后的新会话生效；当前会话不会重新加载这些文件。

English: click **Global rules** in the left sidebar (below Plugins and Automations) to edit the user-global `$DSH_HOME/AGENTS.md` and the `AGENTS.md` at any registered workspace root in one page. Each target keeps its own draft, writes are atomic with version checks against conflicting edits, and the Host resolves paths itself so the page cannot address arbitrary files. Changes apply to new sessions.
