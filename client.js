/**
 * Browser half of the global rules editor: one Settings section that reads and
 * writes the user-global AGENTS.md through the Host routes this package owns.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-global-agents-md',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace of this page. */
    const NS = 'global-agents-md'
    const READ_ROUTE = '/api/global-agents-md/read'
    const WRITE_ROUTE = '/api/global-agents-md/write'

    const DICTS = {
      zh: {
        'nav.title': '全局规则',
        hint: '这里的规则写入用户级 AGENTS.md，作为所有项目共用的默认指令。',
        scope: '修改在之后的新会话中生效；当前会话不会重新加载该文件。',
        file: '文件',
        save: '保存',
        reload: '重新加载',
        placeholder: '在此写入全局规则…',
        'status.loading': '加载中…',
        'status.saving': '保存中…',
        'status.dirty': '有未保存的修改',
        'status.saved': '已保存',
        'status.missing': '文件尚不存在，保存后创建',
        'error.load': '读取失败：',
        'error.save': '保存失败：',
        'error.conflict': '文件已被其他会话修改，请先重新加载再保存。',
        'error.unsaved': '保存失败：',
        'shortcut.mac': '⌘S 保存',
        'shortcut.other': 'Ctrl+S 保存',
      },
      en: {
        'nav.title': 'Global rules',
        hint: 'These rules are written to the user-global AGENTS.md and apply to every project.',
        scope: 'Changes apply to later sessions; the current session does not reload the file.',
        file: 'File',
        save: 'Save',
        reload: 'Reload',
        placeholder: 'Write the global rules here…',
        'status.loading': 'Loading…',
        'status.saving': 'Saving…',
        'status.dirty': 'Unsaved changes',
        'status.saved': 'Saved',
        'status.missing': 'The file does not exist yet; saving creates it',
        'error.load': 'Could not read the file: ',
        'error.save': 'Could not save the file: ',
        'error.conflict': 'The file changed elsewhere. Reload before saving.',
        'error.unsaved': 'Could not save the file: ',
        'shortcut.mac': '⌘S to save',
        'shortcut.other': 'Ctrl+S to save',
      },
    }

    const CSS = `
.gam-section { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.gam-hint { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.gam-field-label { margin: 4px 0 0; font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.gam-path { display: inline-flex; align-items: center; align-self: flex-start; gap: 8px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.gam-path code { font-family: var(--dsw-font-mono); font-size: 12px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-xs); padding: 2px 6px; }
.gam-textarea { box-sizing: border-box; width: 100%; min-height: 280px; max-height: 60vh; padding: 10px 12px; resize: vertical; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: var(--dsw-font-mono); font-size: 13px; line-height: 1.6; caret-color: var(--dsw-alias-state-business-primary); outline: none; }
.gam-textarea::placeholder { color: var(--dsw-alias-label-secondary); }
.gam-textarea:focus-visible { border-color: var(--dsw-alias-state-business-primary); }
.gam-textarea:disabled { opacity: 0.6; }
.gam-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
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
     * @param route - the absolute route path.
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

    /**
     * Render the global rules page.
     * @param props - slot props; `t` translates this page's own strings.
     * @returns the section element tree.
     */
    function GlobalRulesSection(props) {
      const t = props.t
      const [phase, setPhase] = React.useState('loading')
      const [text, setText] = React.useState('')
      const [stored, setStored] = React.useState('')
      const [meta, setMeta] = React.useState({ display: '~/.dsh/AGENTS.md', exists: true, version: null })
      const [error, setError] = React.useState(null)
      const mounted = React.useRef(true)

      React.useEffect(() => () => { mounted.current = false }, [])

      const load = React.useCallback(async () => {
        setPhase('loading')
        setError(null)
        try {
          const answer = await callHost(READ_ROUTE, { method: 'GET' })
          if (!mounted.current) return
          if (!answer.ok) throw new Error(answer.message ?? 'read failed')
          setText(answer.text ?? '')
          setStored(answer.text ?? '')
          setMeta({ display: answer.display, exists: answer.exists, version: answer.version })
          setPhase('ready')
        } catch (cause) {
          if (!mounted.current) return
          setError(t('error.load') + messageOf(cause))
          setPhase('ready')
        }
      }, [t])

      React.useEffect(() => { load() }, [load])

      const dirty = text !== stored

      const save = React.useCallback(async () => {
        if (phase !== 'ready' || !dirty) return
        setPhase('saving')
        setError(null)
        try {
          const answer = await callHost(WRITE_ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text, expectedVersion: meta.version }),
          })
          if (!mounted.current) return
          if (!answer.ok) {
            if (answer.code === 'conflict') {
              setError(t('error.conflict'))
            } else if (answer.code === 'write-failed') {
              setError(t('error.unsaved') + messageOf(answer.message))
            } else {
              throw new Error(answer.message ?? 'write failed')
            }
            setPhase('ready')
            return
          }
          // Keep typing done while the save was in flight; only the stored
          // baseline advances to what the Host wrote.
          const written = answer.text ?? text
          setText((current) => (current === text ? written : current))
          setStored(written)
          setMeta({ display: answer.display, exists: true, version: answer.version })
          setPhase('ready')
        } catch (cause) {
          if (!mounted.current) return
          setError(t('error.save') + messageOf(cause))
          setPhase('ready')
        }
      }, [dirty, meta.version, phase, t, text])

      const onKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
          event.preventDefault()
          save()
        }
      }

      const platform = typeof navigator === 'undefined' ? '' : (navigator.platform ?? navigator.userAgent ?? '')
      const shortcut = t(/Mac|iPhone|iPad/.test(platform) ? 'shortcut.mac' : 'shortcut.other')

      const status = error !== null
        ? { tone: 'error', text: error }
        : phase === 'loading'
          ? { tone: 'muted', text: t('status.loading') }
          : phase === 'saving'
            ? { tone: 'muted', text: t('status.saving') }
            : dirty
              ? { tone: 'muted', text: t('status.dirty') }
              : meta.exists === false
                ? { tone: 'muted', text: t('status.missing') }
                : { tone: 'success', text: t('status.saved') }

      return h('div', { className: 'gam-section' },
        h('style', null, CSS),
        h('p', { className: 'gam-hint' }, t('hint')),
        h('p', { className: 'gam-hint' }, t('scope')),
        h('p', { className: 'gam-field-label' }, t('file')),
        h('span', { className: 'gam-path' }, h('code', null, meta.display)),
        h('textarea', {
          className: 'gam-textarea',
          value: text,
          spellCheck: false,
          placeholder: t('placeholder'),
          'aria-label': t('nav.title'),
          disabled: phase === 'loading',
          onChange: (event) => setText(event.target.value),
          onKeyDown,
        }),
        h('div', { className: 'gam-toolbar' },
          h('button', {
            type: 'button',
            className: 'gam-button gam-button-primary',
            onClick: save,
            disabled: phase !== 'ready' || !dirty,
          }, t('save')),
          h('button', {
            type: 'button',
            className: 'gam-button',
            onClick: load,
            disabled: phase !== 'ready',
          }, t('reload')),
          h('span', { className: 'gam-status gam-status-' + status.tone, role: 'status' }, status.text),
          h('span', { className: 'gam-shortcut' }, shortcut),
        ),
      )
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
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'global-agents-md',
          order: 5,
          label: () => t('nav.title'),
        }, (props) => h(GlobalRulesSection, { ...props, t })))
      },
    }
  },
})
