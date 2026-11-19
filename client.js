/**
 * Browser half of the rules editor.
 *
 * It contributes one global panel to the left sidebar (below the Plugins and
 * Automations panels) and the page that panel opens. The page edits the
 * user-global AGENTS.md and the rules files of one workspace: a project can
 * hold several, and the list comes from a bounded scan of the workspace, so
 * nested files are reachable without typing paths.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-global-agents-md',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace of this panel and page. */
    const NS = 'global-agents-md'
    /** The single id shared by the sidebar entry and its main panel. */
    const PANEL_ID = 'global-agents-md'
    const TARGETS_ROUTE = '/api/global-agents-md/targets'
    const FILES_ROUTE = '/api/global-agents-md/files'
    const READ_ROUTE = '/api/global-agents-md/read'
    const WRITE_ROUTE = '/api/global-agents-md/write'
    const ROOT_RULE = 'AGENTS.md'

    const DICTS = {
      zh: {
        'nav.title': '全局规则',
        title: '全局规则',
        'scope.global': '全局',
        'scope.project': '项目',
        'hint.global': '写入用户级 AGENTS.md，作为所有项目共用的默认指令。',
        'hint.project': '一个工作区里可以有多个规则文件：根目录的 AGENTS.md 与会话路径上的文件在请求开始时载入，子目录中的文件在 Agent 读写该目录后再追加生效。',
        'apply.note': '修改在之后的新会话中生效；当前会话不会重新加载。',
        'project.label': '工作区',
        'project.files': '规则文件',
        'project.new': '新建',
        'project.dir': '目录',
        'project.open': '打开',
        'project.dirPlaceholder': 'packages/app',
        'project.dirHint': '相对工作区根目录，留空即根目录；文件不存在时保存后创建。',
        'project.none': '还没有工作区。先在左侧打开或新建一个工作区，再回到这里。',
        'project.exists': '已有规则',
        file: '文件',
        save: '保存',
        reload: '重新加载',
        placeholder: '在此写入规则…',
        'status.loading': '加载中…',
        'status.saving': '保存中…',
        'status.dirty': '有未保存的修改',
        'status.saved': '已保存',
        'status.missing': '文件尚不存在，保存后创建',
        'error.load': '读取失败：',
        'error.save': '保存失败：',
        'error.targets': '读取目标失败：',
        'error.conflict': '文件已被其他会话修改，请先重新加载再保存。',
        'shortcut.mac': '⌘S 保存',
        'shortcut.other': 'Ctrl+S 保存',
      },
      en: {
        'nav.title': 'Global rules',
        title: 'Global rules',
        'scope.global': 'Global',
        'scope.project': 'Project',
        'hint.global': 'These rules are written to the user-global AGENTS.md and apply to every project.',
        'hint.project': 'A workspace can hold several rules files: the root AGENTS.md and files on the session path load at request start, and subdirectory files apply after the agent reads or writes there.',
        'apply.note': 'Changes apply to later sessions; the current session does not reload the file.',
        'project.label': 'Workspace',
        'project.files': 'Rules file',
        'project.new': 'New',
        'project.dir': 'Directory',
        'project.open': 'Open',
        'project.dirPlaceholder': 'packages/app',
        'project.dirHint': 'Relative to the workspace root; leave empty for the root. Saving creates the file when it does not exist.',
        'project.none': 'No workspace yet. Open or create one on the left, then come back.',
        'project.exists': 'has rules',
        file: 'File',
        save: 'Save',
        reload: 'Reload',
        placeholder: 'Write the rules here…',
        'status.loading': 'Loading…',
        'status.saving': 'Saving…',
        'status.dirty': 'Unsaved changes',
        'status.saved': 'Saved',
        'status.missing': 'The file does not exist yet; saving creates it',
        'error.load': 'Could not read the file: ',
        'error.save': 'Could not save the file: ',
        'error.targets': 'Could not load the targets: ',
        'error.conflict': 'The file changed elsewhere. Reload before saving.',
        'shortcut.mac': '⌘S to save',
        'shortcut.other': 'Ctrl+S to save',
      },
    }

    const CSS = `
.gam-page { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 1.6; }
.gam-scroll { flex: 1; min-height: 0; overflow: auto; scrollbar-gutter: stable; --dsh-scrollbar-width: 9px; --dsh-scrollbar-thumb-border: 2px; }
.gam-content { display: flex; flex-direction: column; gap: 10px; max-width: 960px; margin: 0 auto; padding: 0 clamp(24px, 4vw, 48px) 48px; }
.gam-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding-top: 28px; margin-bottom: 8px; }
[data-platform='darwin'] .gam-heading { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
.gam-heading h1 { margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
.gam-heading-actions { display: flex; flex: none; align-items: center; gap: 8px; }
.gam-scope { display: inline-flex; align-self: flex-start; gap: 2px; padding: 2px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); }
.gam-tab { height: 26px; padding: 0 12px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 13px; cursor: pointer; }
.gam-tab[aria-selected='true'] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.gam-tab:disabled { opacity: 0.5; cursor: default; }
.gam-tab:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.gam-pickers { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.gam-picker { display: inline-flex; align-items: center; gap: 8px; }
.gam-picker-label { font-size: 13px; color: var(--dsw-alias-label-secondary); }
.gam-select, .gam-input { height: 30px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; }
.gam-select { max-width: 320px; }
.gam-input { width: 200px; font-family: var(--dsw-font-mono); font-size: 12px; }
.gam-select:focus-visible, .gam-input:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.gam-new { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.gam-hint { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.gam-file { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.gam-file code { font-family: var(--dsw-font-mono); font-size: 12px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-xs); padding: 2px 6px; }
.gam-textarea { box-sizing: border-box; width: 100%; min-height: min(46vh, 420px); max-height: 70vh; padding: 12px 14px; resize: vertical; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: var(--dsw-font-mono); font-size: 13px; line-height: 1.7; caret-color: var(--dsw-alias-state-business-primary); outline: none; }
.gam-textarea::placeholder { color: var(--dsw-alias-label-secondary); }
.gam-textarea:focus-visible { border-color: var(--dsw-alias-state-business-primary); }
.gam-textarea:disabled { opacity: 0.6; }
.gam-footer { display: flex; align-items: center; gap: 12px; }
.gam-button { height: 28px; padding: 0 14px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 1; cursor: pointer; }
.gam-button:disabled { opacity: 0.45; cursor: default; }
.gam-button:focus-visible { outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 2px; }
.gam-button-primary { border-color: var(--dsw-alias-button-primary-fill); background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.gam-status { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.gam-status-error { color: var(--dsw-alias-state-error-primary); }
.gam-status-success { color: var(--dsw-alias-state-success-primary); }
.gam-shortcut { margin-inline-start: auto; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
@media (hover: hover) {
  .gam-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .gam-button-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); border-color: var(--dsw-alias-button-primary-hover); }
}
`

    /**
     * Call one Host route and decode its JSON answer.
     * @param route - the absolute route path, query included.
     * @param init - fetch options.
     * @returns the decoded payload.
     */
    async function callHost(route, init) {
      const url = new URL(route, document.baseURI)
      const carrier = globalThis.__DSH_TRANSPORT__?.fetch
      const response = await (typeof carrier === 'function'
        ? carrier(url.href, init)
        : globalThis.fetch(url.href, init))
      const raw = await response.text()
      let payload
      try {
        payload = raw === '' ? {} : JSON.parse(raw)
      } catch {
        throw new Error(`unexpected answer (HTTP ${response.status})`)
      }
      if (payload?.ok === undefined && !response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return payload
    }

    /**
     * Describe one thrown value.
     * @param error - the thrown value.
     * @returns the message text.
     */
    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /** Keys one draft by the scope it belongs to. */
    function draftKey(request) {
      return JSON.stringify([request.scope, request.workspaceId ?? null, request.path ?? null])
    }

    /** Turn one draft's scope into the query string its routes accept. */
    function queryOf(request) {
      const params = new URLSearchParams({ scope: request.scope })
      if (request.scope === 'project') {
        params.set('workspace', request.workspaceId)
        params.set('path', request.path)
      }
      return params.toString()
    }

    /** One draft before any read has answered. */
    const EMPTY_DRAFT = { phase: 'idle', text: '', stored: '', version: null, exists: true, display: '', error: null }

    /**
     * Draw the sidebar glyph in the current text color at the requested edge.
     * @param props - the sidebar's icon share.
     * @returns the decorative glyph.
     */
    function PanelGlyph({ size }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 18 18', 'aria-hidden': true, focusable: 'false',
      },
      h('path', {
        d: 'M5.2 2.6h4.9l2.9 2.9V15a.6.6 0 0 1-.6.6H5.2a.6.6 0 0 1-.6-.6V3.2a.6.6 0 0 1 .6-.6Z',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M10 2.8v2.9h2.9', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round',
      }),
      h('path', {
        d: 'M7.2 8.7h3.6M7.2 11.2h3.6M7.2 13.7h2.2',
        stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round',
      }))
    }

    /**
     * Render the rules page: a Global tab and a Project tab over one editor,
     * with one draft kept per target and every workspace rules file listed.
     * @param props - slot props; `t` translates this page's own strings.
     * @returns the page element tree.
     */
    function GlobalRulesPage(props) {
      const t = props.t
      const [targets, setTargets] = React.useState(null)
      const [targetsError, setTargetsError] = React.useState(null)
      const [scope, setScope] = React.useState('global')
      const [workspaceId, setWorkspaceId] = React.useState(null)
      const [fileLists, setFileLists] = React.useState({})
      const [paths, setPaths] = React.useState({})
      const [creating, setCreating] = React.useState(false)
      const [draftDir, setDraftDir] = React.useState('')
      const [drafts, setDrafts] = React.useState({})
      const mounted = React.useRef(true)

      React.useEffect(() => () => { mounted.current = false }, [])

      const patchDraft = React.useCallback((key, next) => {
        setDrafts((all) => ({ ...all, [key]: { ...(all[key] ?? EMPTY_DRAFT), ...next } }))
      }, [])

      const loadTargets = React.useCallback(async () => {
        setTargetsError(null)
        try {
          const answer = await callHost(TARGETS_ROUTE, { method: 'GET' })
          if (!mounted.current) return
          if (!answer.ok) throw new Error(answer.message ?? 'targets failed')
          setTargets({ global: answer.global, workspaces: answer.workspaces ?? [] })
        } catch (cause) {
          if (!mounted.current) return
          setTargetsError(t('error.targets') + messageOf(cause))
        }
      }, [t])

      React.useEffect(() => { loadTargets() }, [loadTargets])

      const workspaces = targets?.workspaces ?? []
      React.useEffect(() => {
        if (workspaceId === null && workspaces.length > 0) setWorkspaceId(workspaces[0].id)
      }, [workspaceId, workspaces])

      const loadFiles = React.useCallback(async (id) => {
        try {
          const answer = await callHost(`${FILES_ROUTE}?${new URLSearchParams({ workspace: id })}`, { method: 'GET' })
          if (!mounted.current) return
          if (!answer.ok) throw new Error(answer.message ?? 'files failed')
          setFileLists((all) => ({ ...all, [id]: answer.files ?? [] }))
        } catch {
          if (!mounted.current) return
          setFileLists((all) => ({ ...all, [id]: [{ path: ROOT_RULE, exists: false, bytes: 0 }] }))
        }
      }, [])

      React.useEffect(() => {
        if (workspaceId !== null && fileLists[workspaceId] === undefined) loadFiles(workspaceId)
      }, [workspaceId, fileLists, loadFiles])

      const path = workspaceId === null ? ROOT_RULE : (paths[workspaceId] ?? ROOT_RULE)
      const activeRequest = scope === 'global'
        ? { scope: 'global' }
        : workspaceId === null
          ? null
          : { scope: 'project', workspaceId, path }
      const activeKey = activeRequest === null ? null : draftKey(activeRequest)

      const loadDraft = React.useCallback(async (key, request) => {
        patchDraft(key, { phase: 'loading', error: null })
        try {
          const answer = await callHost(`${READ_ROUTE}?${queryOf(request)}`, { method: 'GET' })
          if (!mounted.current) return
          if (!answer.ok) throw new Error(answer.message ?? 'read failed')
          patchDraft(key, {
            phase: 'ready',
            text: answer.text ?? '',
            stored: answer.text ?? '',
            version: answer.version,
            exists: answer.exists,
            display: answer.display,
            error: null,
          })
        } catch (cause) {
          if (!mounted.current) return
          patchDraft(key, { phase: 'ready', error: t('error.load') + messageOf(cause) })
        }
      }, [patchDraft, t])

      React.useEffect(() => {
        if (activeKey === null) return
        if (drafts[activeKey] === undefined) loadDraft(activeKey, activeRequest)
      }, [activeKey, drafts, loadDraft, activeRequest])

      const draft = activeKey === null ? undefined : drafts[activeKey]
      const dirty = draft !== undefined && draft.text !== draft.stored
      const idle = draft === undefined || draft.phase !== 'ready'

      const save = React.useCallback(async () => {
        if (activeKey === null || activeRequest === null || draft === undefined) return
        if (draft.phase !== 'ready' || draft.text === draft.stored) return
        const key = activeKey
        const request = activeRequest
        const sent = draft.text
        const expectedVersion = draft.version
        patchDraft(key, { phase: 'saving', error: null })
        try {
          const answer = await callHost(WRITE_ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...request, text: sent, expectedVersion }),
          })
          if (!mounted.current) return
          if (!answer.ok) {
            if (answer.code === 'conflict') patchDraft(key, { phase: 'ready', error: t('error.conflict') })
            else throw new Error(answer.message ?? 'write failed')
            return
          }
          // Keep typing done while the save was in flight; only the stored
          // baseline advances to what the Host wrote.
          const written = answer.text ?? sent
          setDrafts((all) => {
            const current = all[key]
            if (current === undefined) return all
            return {
              ...all,
              [key]: {
                ...current,
                phase: 'ready',
                text: current.text === sent ? written : current.text,
                stored: written,
                version: answer.version,
                exists: true,
                error: null,
              },
            }
          })
          if (request.scope === 'project') {
            setFileLists((all) => {
              const listed = all[request.workspaceId]
              if (listed === undefined) return all
              const known = listed.some((file) => file.path === request.path)
              return {
                ...all,
                [request.workspaceId]: known
                  ? listed.map((file) => (file.path === request.path ? { ...file, exists: true } : file))
                  : [...listed, { path: request.path, exists: true, bytes: answer.bytes ?? 0 }],
              }
            })
          }
        } catch (cause) {
          if (!mounted.current) return
          patchDraft(key, { phase: 'ready', error: t('error.save') + messageOf(cause) })
        }
      }, [activeKey, activeRequest, draft, patchDraft, t])

      const onKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          save()
        }
      }

      const platform = typeof navigator === 'undefined' ? '' : (navigator.platform ?? navigator.userAgent ?? '')
      const shortcut = t(/Mac|iPhone|iPad/.test(platform) ? 'shortcut.mac' : 'shortcut.other')

      const status = targetsError !== null
        ? { tone: 'error', text: targetsError }
        : draft === undefined
          ? { tone: 'muted', text: t('status.loading') }
          : draft.error !== null && draft.error !== undefined
            ? { tone: 'error', text: draft.error }
            : draft.phase === 'loading'
              ? { tone: 'muted', text: t('status.loading') }
              : draft.phase === 'saving'
                ? { tone: 'muted', text: t('status.saving') }
                : dirty
                  ? { tone: 'muted', text: t('status.dirty') }
                  : draft.exists === false
                    ? { tone: 'muted', text: t('status.missing') }
                    : { tone: 'success', text: t('status.saved') }

      const scopeTab = (value, label) => h('button', {
        type: 'button',
        role: 'tab',
        className: 'gam-tab',
        'aria-selected': scope === value,
        disabled: value === 'project' && workspaces.length === 0,
        onClick: () => setScope(value),
      }, label)

      const openDirectory = () => {
        if (workspaceId === null) return
        const trimmed = draftDir.trim().replace(/^\/+|\/+$/g, '')
        setPaths((all) => ({ ...all, [workspaceId]: trimmed === '' ? ROOT_RULE : `${trimmed}/${ROOT_RULE}` }))
        setCreating(false)
        setDraftDir('')
      }

      const listedFiles = workspaceId === null ? [] : (fileLists[workspaceId] ?? [])
      const fileOptions = listedFiles.some((listed) => listed.path === path)
        ? listedFiles
        : [...listedFiles, { path, exists: false, bytes: 0 }]

      const pickers = scope === 'project' && workspaces.length > 0
        ? h('div', { className: 'gam-pickers' },
          h('label', { className: 'gam-picker' },
            h('span', { className: 'gam-picker-label' }, t('project.label')),
            h('select', {
              className: 'gam-select',
              value: workspaceId ?? '',
              onChange: (event) => setWorkspaceId(event.target.value),
            }, workspaces.map((workspace) => h('option', {
              key: workspace.id,
              value: workspace.id,
            }, workspace.exists ? `${workspace.title} · ${t('project.exists')}` : workspace.title)))),
          h('label', { className: 'gam-picker' },
            h('span', { className: 'gam-picker-label' }, t('project.files')),
            h('select', {
              className: 'gam-select',
              value: path,
              onChange: (event) => {
                if (workspaceId === null) return
                const next = event.target.value
                setPaths((all) => ({ ...all, [workspaceId]: next }))
              },
            }, fileOptions.map((listed) => h('option', {
              key: listed.path,
              value: listed.path,
            }, listed.exists ? listed.path : `${listed.path} · ${t('status.missing')}`)))),
          creating
            ? h('div', { className: 'gam-new' },
              h('span', { className: 'gam-picker-label' }, t('project.dir')),
              h('input', {
                className: 'gam-input',
                value: draftDir,
                placeholder: t('project.dirPlaceholder'),
                spellCheck: false,
                onChange: (event) => setDraftDir(event.target.value),
                onKeyDown: (event) => { if (event.key === 'Enter') openDirectory() },
              }),
              h('button', { type: 'button', className: 'gam-button', onClick: openDirectory }, t('project.open')))
            : h('button', {
              type: 'button',
              className: 'gam-button',
              onClick: () => setCreating(true),
            }, t('project.new')))
        : null

      return h('section', { className: 'gam-page', 'aria-label': t('title') },
        h('style', null, CSS),
        h('div', { className: 'gam-scroll' },
          h('div', { className: 'gam-content' },
            h('div', { className: 'gam-heading' },
              h('h1', null, t('title')),
              h('div', { className: 'gam-heading-actions' },
                h('button', {
                  type: 'button',
                  className: 'gam-button',
                  onClick: () => { if (activeKey !== null && activeRequest !== null) loadDraft(activeKey, activeRequest) },
                  disabled: idle,
                }, t('reload')),
                h('button', {
                  type: 'button',
                  className: 'gam-button gam-button-primary',
                  onClick: save,
                  disabled: idle || !dirty,
                }, t('save')))),
            h('div', { className: 'gam-scope', role: 'tablist', 'aria-label': t('title') },
              scopeTab('global', t('scope.global')),
              scopeTab('project', t('scope.project'))),
            scope === 'project' && workspaces.length === 0 ? h('p', { className: 'gam-hint' }, t('project.none')) : null,
            pickers,
            creating && scope === 'project' ? h('p', { className: 'gam-hint' }, t('project.dirHint')) : null,
            h('p', { className: 'gam-hint' }, scope === 'global' ? t('hint.global') : t('hint.project')),
            h('p', { className: 'gam-hint' }, t('apply.note')),
            h('div', { className: 'gam-file' }, h('span', null, t('file')), h('code', null, draft?.display ?? '')),
            h('textarea', {
              className: 'gam-textarea',
              value: draft?.text ?? '',
              spellCheck: false,
              placeholder: t('placeholder'),
              'aria-label': t('title'),
              disabled: idle,
              onChange: (event) => {
                if (activeKey === null) return
                const key = activeKey
                const value = event.target.value
                setDrafts((all) => {
                  const current = all[key]
                  if (current === undefined) return all
                  return { ...all, [key]: { ...current, text: value, error: null } }
                })
              },
              onKeyDown,
            }),
            h('div', { className: 'gam-footer' },
              h('span', { className: 'gam-status gam-status-' + status.tone, role: 'status' }, status.text),
              h('span', { className: 'gam-shortcut' }, shortcut)))))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        for (const [locale, dict] of Object.entries(DICTS)) {
          ctx.effect(
            () => ctx.locale.register(NS, locale, dict),
            `global-agents-md: ${locale} dictionary`,
          )
        }
        const t = ctx.locale.bind(NS)
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          label: () => t('nav.title'),
        }, PanelGlyph))
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
        }, (props) => h(GlobalRulesPage, { ...props, t })))
      },
    }
  },
})
