# 全局规则

点左侧栏中的 **全局规则**（在「插件」「自动化任务」下面），直接编辑 DSH 的用户级 `AGENTS.md`，不必再去 `~/.dsh` 下找文件。

- 页面读取和保存 `$DSH_HOME/AGENTS.md`，未设置 `DSH_HOME` 时即 `~/.dsh/AGENTS.md`。
- 该文件是 `@deepseek-ai/dsh-agent-instructions` 加载的用户级指令链，位于项目级 `AGENTS.md` 之前，对所有项目生效。
- 保存是原子的：先写临时文件再替换，保留原文件权限，文件不存在时创建。
- 带版本校验：若文件在加载后被其他会话（例如 Agent 自己）修改，保存会被拒绝并提示先重新加载，避免覆盖他人改动。
- 修改对之后的新会话生效；当前会话不会重新加载该文件。

English: click **Global rules** in the left sidebar (below Plugins and Automations) to edit DSH's user-global `$DSH_HOME/AGENTS.md` (`~/.dsh/AGENTS.md` by default) without locating the file. Saves are atomic with a version check against conflicting edits, and changes apply to new sessions.
