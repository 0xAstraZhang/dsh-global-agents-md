# 全局规则

在 **设置 → 全局规则** 中直接编辑 DSH 的用户级 `AGENTS.md`，不必再去 `~/.dsh` 下找文件。

- 页面读取和保存 `$DSH_HOME/AGENTS.md`，未设置 `DSH_HOME` 时即 `~/.dsh/AGENTS.md`。
- 该文件是 `@deepseek-ai/dsh-agent-instructions` 加载的用户级指令链，位于项目级 `AGENTS.md` 之前，对所有项目生效。
- 保存是原子的：先写临时文件再替换，文件不存在时创建。
- 页面带有版本校验：若文件在加载后被其他会话（例如 Agent 自己）修改，保存会被拒绝并提示先重新加载，避免覆盖他人改动。
- 修改对之后的新会话生效；当前会话不会重新加载该文件。

English: edit DSH's user-global `AGENTS.md` from **Settings → Global rules** instead of locating the file yourself. The page reads and saves `$DSH_HOME/AGENTS.md` (`~/.dsh/AGENTS.md` by default) with atomic writes and version checks against conflicting edits. Changes apply to new sessions.
