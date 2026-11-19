/**
 * Browser half of the global rules editor: one left-sidebar entry that opens a
 * fixed editor panel above the sidebar foot and reads or writes the
 * user-global AGENTS.md through the Host routes this package owns.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-global-agents-md',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace of this entry. */
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
        close: '关闭',
        placeholder: '在此写入全局规则…',
        'status.loading': '加载中…',
        'status.saving': '保存中…',
        'status.dirty': '有未保存的修改',
        'status.saved': '已保存',
        'status.missing': '文件尚不存在，保存后创建',
        'error.load': '读取失败：',
        'error.save': '保存失败：',
        'error.conflict': '文件已被其他会话修改，请先重新加载再保存。',
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
        close: 'Close',
        placeholder: 'Write the global rules here…',
        'status.loading': 'Loading…',
        'status.saving': 'Saving…',
        'status.dirty': 'Unsaved changes',
        'status.saved': 'Saved',
        'status.missing': 'The file does not exist yet; saving creates it',
        'error.load': 'Could not read the file: ',
        'error.save': 'Could not save the file: ',
        'error.conflict': 'The file changed elsewhere. Reload before saving.',
        'shortcut.mac': '⌘S to save',
        'shortcut.other': 'Ctrl+S to save',
      },
    }

    const CSS = `
.gam-layer { position: relative; flex: none; display: flex; align-items: center; width: 100%; height: 42px; margin: 8px 0 0; }
.gam-rail { width: 36px; height: 36px; margin: 0; }
.gam-trigger { display: inline-flex; align-items: center; gap: 8px; width: calc(100% + 4px); height: 42px; margin: 0 -2px; padding: 0 10px 0 8px; border: none; border-radius: 12px; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 14px; cursor: pointer; overflow: hidden; }
.gam-rail .gam-trigger { justify-content: center; gap: 0; width: 36px; height: 36px; margin: 0; padding: 0; border-radius: 50%; }
@media (hover: hover) {
  .gam-trigger:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.gam-trigger[data-open] { background: var(--dsw-alias-interactive-bg-hover); }
.gam-trigger-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gam-trigger-icon { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; }
.gam-dot { flex: none; width: 6px; height: 6px; margin-left: auto; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); }
.gam-rail .gam-dot { position: absolute; top: 5px; right: 5px; margin: 0; }
.gam-panel { position: fixed; isolation: isolate; z-index: 30; display: flex; flex-direction: column; width: 480px; max-width: calc(100vw - 24px); max-height: min(70vh, 560px); overflow: hidden; border-radius: 12px; box-shadow: var(--dsw-elevation-prominent); }
.gam-panel::before { position: absolute; z-index: -1; inset: 0; border-radius: inherit; background: var(--dsw-specific-menu); backdrop-filter: var(--dsw-menu-backdrop-filter); content: ''; pointer-events: none; }
.gam-head { flex: none; display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 10px 12px; box-sizing: border-box; }
.gam-title { font-size: 14px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.gam-close { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font-size: 16px; line-height: 1; cursor: pointer; }
@media (hover: hover) {
  .gam-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
}
.gam-body { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; padding: 0 12px 12px; }
.gam-hint { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.gam-path { display: inline-flex; align-items: center; align-self: flex-start; gap: 8px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.gam-path code { font-family: var(--dsw-font-mono); font-size: 12px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); border-radius: var(--dsw-radius-xs); padding: 2px 6px; }
.gam-textarea { box-sizing: border-box; flex: 1 1 220px; width: 100%; min-height: 160px; padding: 10px 12px; resize: none; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: var(--dsw-font-mono); font-size: 13px; line-height: 1.6; caret-color: var(--dsw-alias-state-business-primary); outline: none; }
.gam-textarea::placeholder { color: var(--dsw-alias-label-secondary); }
.gam-textarea:focus-visible { border-color: var(--dsw-alias-state-business-primary); }
.gam-textarea:disabled { opacity: 0.6; }
.gam-toolbar { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
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
     * Draw the sidebar glyph in the current text color.
     * @returns the icon element.
     */
    function Glyph() {
      return h('svg', {
        viewBox: '0 0 18 18', width: 18, height: 18, 'aria-hidden': true, focusable: 'false',
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
     * Render the sidebar entry and its editor panel.
     * @param props - slot props; `wide` tells whether the sidebar is expanded.
     * @returns the entry element tree.
     */
    function GlobalRulesEntry(props) {
      const t = props.t
      const wide = props.wide !== false
      const [open, setOpen] = React.useState(false)
      const [phase, setPhase] = React.useState('idle')
      const [text, setText] = React.useState('')
      const [stored, setStored] = React.useState('')
      const [meta, setMeta] = React.useState({ display: '~/.dsh/AGENTS.md', exists: true, version: null })
      const [error, setError] = React.useState(null)
      const [anchor, setAnchor] = React.useState(undefined)
      const root = React.useRef(null)
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

      const dirty = text !== stored

      // Read the file on the first open only: reopening keeps a pending edit.
      React.useEffect(() => {
        if (open && phase === 'idle') load()
      }, [open, phase, load])

      // The sidebar clips overflow, so the panel hugs the trigger through a
      // measured fixed offset instead of document flow.
      React.useLayoutEffect(() => {
        if (!open) {
          setAnchor(undefined)
          return undefined
        }
        const place = () => {
          const rect = root.current?.getBoundingClientRect()
          if (rect !== undefined) setAnchor({ left: rect.left, bottom: window.innerHeight - rect.top + 8 })
        }
        place()
        window.addEventListener('resize', place)
        return () => { window.removeEventListener('resize', place) }
      }, [open])

      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          if (!(root.current?.contains(event.target) ?? false)) setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open])

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
            if (answer.code === 'conflict') setError(t('error.conflict'))
            else throw new Error(answer.message ?? 'write failed')
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

      const styles = h('style', null, CSS)

      const trigger = h('button', {
        type: 'button',
        className: 'gam-trigger',
        'data-open': open ? '' : undefined,
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
        title: wide ? undefined : t('nav.title'),
        onClick: () => setOpen((was) => !was),
      },
      h('span', { className: 'gam-trigger-icon' }, h(Glyph, null)),
      wide ? h('span', { className: 'gam-trigger-label' }, t('nav.title')) : null,
      dirty && !open ? h('span', { className: 'gam-dot', 'aria-hidden': true }) : null)

      if (!open) {
        return h('div', { className: wide ? 'gam-layer' : 'gam-layer gam-rail', ref: root }, styles, trigger)
      }

      const panel = h('div', {
        className: 'gam-panel',
        role: 'dialog',
        'aria-label': t('nav.title'),
        style: anchor === undefined ? { visibility: 'hidden' } : { left: anchor.left, bottom: anchor.bottom },
      },
      h('div', { className: 'gam-head' },
        h('span', { className: 'gam-title' }, t('nav.title')),
        h('button', {
          type: 'button',
          className: 'gam-close',
          'aria-label': t('close'),
          onClick: () => setOpen(false),
        }, '×')),
      h('div', { className: 'gam-body' },
        h('p', { className: 'gam-hint' }, t('hint')),
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
          h('span', { className: 'gam-shortcut' }, shortcut))))

      return h('div', { className: wide ? 'gam-layer' : 'gam-layer gam-rail', ref: root }, styles, trigger, panel)
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
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'global-agents-md',
          order: 20,
          label: () => t('nav.title'),
        }, (props) => h(GlobalRulesEntry, { ...props, t })))
      },
    }
  },
})
