# 全局规则

点左侧栏中的 **全局规则**（在「插件」「自动化任务」下面），在同一个页面里编辑两类规则文件，不必再去 `~/.dsh` 或项目目录里找文件。

| 范围 | 编辑的文件 | 作用 |
|---|---|---|
| 全局 | `$DSH_HOME/AGENTS.md`（未设置 `DSH_HOME` 时即 `~/.dsh/AGENTS.md`） | `@deepseek-ai/dsh-agent-instructions` 的用户级指令链，位于项目级指令之前，对所有项目生效 |
| 项目 | 所选工作区内的 `AGENTS.md` / `AGENTS.local.md` | 只对该工作区生效 |

## 项目里不止一个 AGENTS.md

一个项目可以有多个规则文件，`dsh-agent-instructions` 载入的是一条链：从项目根目录一路到会话工作目录，子目录里的文件在 Agent 读写该目录后再追加。所以项目页签不是只编辑根目录：

- 打开项目页签时，Host 会扫描该工作区，把**所有** `AGENTS.md`、`AGENTS.local.md` 按载入顺序列出来（浅层在前，同目录内 `AGENTS.md` 在 `AGENTS.local.md` 之前），在「规则文件」下拉框里选择。
- 根目录的 `AGENTS.md` 永远在列表里，即使它还不存在（此时保存即创建）。
- 要在还没规则文件的子目录新建：点「新建」，输入相对目录（如 `packages/app`），打开后保存即创建 `packages/app/AGENTS.md`。
- 扫描有边界：跳过 `.git`、`.hg`、`.svn`、`node_modules` 和隐藏目录，最多 8 层、4000 个目录、200 个文件，避免大仓库拖住请求。
- 只覆盖工作区目录内的文件。如果工作区只是仓库的子目录，仓库根目录的 `AGENTS.md` 不在列表里。

## 安全与行为

- 每个目标各自保留草稿：在全局/项目之间、在工作区或规则文件之间切换，未保存的编辑都不会丢。
- 保存是原子的：先写临时文件再替换，保留原文件权限，文件不存在时创建。
- 带版本校验：若文件在加载后被其他会话（例如 Agent 自己）修改，保存会被拒绝并提示先重新加载，避免覆盖他人改动。
- **路径由 Host 解析，页面传不进路径**：请求只带工作区 id 和工作区内相对路径，Host 校验文件名必须是 `AGENTS.md`/`AGENTS.local.md`、拒绝 `..`、绝对路径和反斜杠，并确认结果仍在工作区内。越界目标返回 `unknown-target`。
- 修改对之后的新会话生效；当前会话不会重新加载这些文件。

English: click **Global rules** in the left sidebar (below Plugins and Automations). The Project tab does not assume one root file: the Host scans the workspace and lists every `AGENTS.md` / `AGENTS.local.md` in load order (shallow first, base before local overlay), always offering the root file, with **New** to create one under a subdirectory. The scan skips VCS and `node_modules` and is bounded in depth and count. Each target keeps its own draft, writes are atomic with version checks, and the Host resolves every path itself.
