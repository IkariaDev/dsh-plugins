window.__ModuleLoader__.load({
  id: '@dsh-local/view-53e0594c-8715-4807-9031-a73704a42996',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PACKAGE = '@dsh-local/view-53e0594c-8715-4807-9031-a73704a42996'
    const KIND = 'dsh-local-session-checklist-53e0594c-8715-4807-9031-a73704a42996'
    const TAB_TYPE_ID = `${PACKAGE}/checklist`
    const NS = 'sessionChecklist'
    const STORAGE_PREFIX = `dsh.session-checklist.v1.${PACKAGE}.`
    const STYLE_ID = `${PACKAGE}/checklist.css`

    const en = {
      'tab.title': 'Checklist',
      'guide.description': "A checklist for this session's running task.",
      'checklist.heading': 'Checklist',
      'checklist.subtitle': 'For this session',
      'checklist.progress': '{done} of {total} done',
      'checklist.empty': 'No points yet.',
      'checklist.placeholder': 'Add a point\u2026',
      'checklist.add': 'Add',
      'checklist.addAria': 'Add a point to the checklist',
    }

    const de = {
      'tab.title': 'Checkliste',
      'guide.description': 'Eine Checkliste f\u00fcr die laufende Aufgabe dieser Sitzung.',
      'checklist.heading': 'Checkliste',
      'checklist.subtitle': 'F\u00fcr diese Sitzung',
      'checklist.progress': '{done} von {total} erledigt',
      'checklist.empty': 'Noch keine Punkte.',
      'checklist.placeholder': 'Neuen Punkt hinzuf\u00fcgen \u2026',
      'checklist.add': 'Hinzuf\u00fcgen',
      'checklist.addAria': 'Punkt zur Checkliste hinzuf\u00fcgen',
    }

    const CSS = `
.dsh-session-checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  min-height: 100%;
  padding: 16px 14px 20px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
  overflow: auto;
}
.dsh-session-checklist *,
.dsh-session-checklist *::before,
.dsh-session-checklist *::after {
  box-sizing: border-box;
}
.dsh-session-checklist-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.dsh-session-checklist-head-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dsh-session-checklist-heading {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}
.dsh-session-checklist-sub {
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1.3;
}
.dsh-session-checklist-progress {
  flex: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dsh-session-checklist-empty {
  margin: 2px 0 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
.dsh-session-checklist-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dsh-session-checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--dsw-radius-sm);
  cursor: pointer;
}
@media (hover: hover) {
  .dsh-session-checklist-item:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
.dsh-session-checklist-native {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.dsh-session-checklist-box {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  color: var(--dsw-alias-label-primary-foreground);
  background: transparent;
  border: 1.5px solid var(--dsw-alias-border-l4);
  border-radius: 5px;
}
.dsh-session-checklist-native:focus-visible + .dsh-session-checklist-box {
  outline: 2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  outline-offset: 2px;
}
.dsh-session-checklist-item[data-done='true'] .dsh-session-checklist-box {
  background: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  border-color: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
}
.dsh-session-checklist-check {
  width: 11px;
  height: 11px;
  opacity: 0;
}
.dsh-session-checklist-item[data-done='true'] .dsh-session-checklist-check {
  opacity: 1;
}
.dsh-session-checklist-text {
  min-width: 0;
  overflow-wrap: anywhere;
}
.dsh-session-checklist-item[data-done='true'] .dsh-session-checklist-text {
  color: var(--dsw-alias-label-tertiary);
  text-decoration: line-through;
}
.dsh-session-checklist-add {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.dsh-session-checklist-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 30px;
  padding: 0 9px;
  color: inherit;
  font: inherit;
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
}
.dsh-session-checklist-input::placeholder {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-session-checklist-input:focus-visible {
  border-color: transparent;
  outline: 2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  outline-offset: 0;
}
.dsh-session-checklist-add-button {
  flex: none;
  height: 30px;
  padding: 0 10px;
  color: var(--dsw-alias-label-primary-foreground);
  font: inherit;
  font-weight: 500;
  background: var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  border: none;
  border-radius: var(--dsw-radius-sm);
  cursor: pointer;
}
.dsh-session-checklist-add-button:disabled {
  cursor: default;
  opacity: 0.45;
}
@media (hover: hover) {
  .dsh-session-checklist-add-button:not(:disabled):hover {
    filter: brightness(0.95);
  }
}
`

    function storageKey(sessionId) {
      return `${STORAGE_PREFIX}${sessionId}`
    }

    function newId() {
      const cryptoApi = globalThis.crypto
      if (cryptoApi !== undefined && typeof cryptoApi.randomUUID === 'function') {
        return cryptoApi.randomUUID()
      }
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    }

    function readItems(sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '') return []
      try {
        const raw = localStorage.getItem(storageKey(sessionId))
        if (raw === null) return []
        const parsed = JSON.parse(raw)
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : []
        const seen = new Set()
        const items = []
        for (const value of list) {
          if (value === null || typeof value !== 'object') continue
          if (typeof value.text !== 'string' || value.text.trim() === '') continue
          let id = typeof value.id === 'string' && value.id !== '' ? value.id : newId()
          if (seen.has(id)) id = newId()
          seen.add(id)
          items.push({ id, text: value.text, done: value.done === true })
        }
        return items
      } catch {
        return []
      }
    }

    function writeItems(sessionId, items) {
      if (typeof sessionId !== 'string' || sessionId === '') return
      try {
        localStorage.setItem(storageKey(sessionId), JSON.stringify({ version: 1, items }))
      } catch {
        // A full or unavailable browser store leaves the in-memory checklist usable.
      }
    }

    function installStyles() {
      if (typeof document === 'undefined') return () => {}
      const existing = document.querySelector(`style[data-dsh-plugin-css="${STYLE_ID}"]`)
      if (existing !== null) return () => {}
      const tag = document.createElement('style')
      tag.dataset.dshPluginCss = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => {
        tag.remove()
      }
    }

    function ChecklistIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 16,
          height: 16,
          fill: 'none',
          'aria-hidden': true,
        },
        h('rect', { x: 2.5, y: 1.5, width: 11, height: 13, rx: 2, stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', {
          d: 'M5 5.5l1.2 1.2L8.1 4.8',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M5 9.5l1.2 1.2L8.1 8.8',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M9.5 7.5H11.5M9.5 11.5H11.5', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
      )
    }

    function CheckMark() {
      return h(
        'svg',
        {
          className: 'dsh-session-checklist-check',
          viewBox: '0 0 12 12',
          fill: 'none',
          'aria-hidden': true,
        },
        h('path', {
          d: 'M2.2 6.2l2.4 2.4 5.2-5.2',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      const sidebarRight = ctx.sidebarRight
      const tabs = ctx.sidebarRightTabs

      function ChecklistBody(props) {
        const tr = typeof props.t === 'function' ? props.t : t
        const sessionId = props.sessionId
        const [items, setItems] = React.useState(() => readItems(sessionId))
        const [draft, setDraft] = React.useState('')
        const [loadedSession, setLoadedSession] = React.useState(sessionId)
        if (loadedSession !== sessionId) {
          // The slot is session-scoped, but a retained body must never show or
          // save another session's points if the framework reuses it.
          setLoadedSession(sessionId)
          setItems(readItems(sessionId))
          setDraft('')
        }
        const done = items.reduce((count, item) => count + (item.done ? 1 : 0), 0)
        const total = items.length

        const commit = (next) => {
          setItems(next)
          writeItems(sessionId, next)
        }

        const add = (event) => {
          event.preventDefault()
          const text = draft.trim()
          if (text === '') return
          commit([...items, { id: newId(), text: text.slice(0, 200), done: false }])
          setDraft('')
        }

        const toggle = (id) => {
          commit(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
        }

        return h(
          'div',
          { className: 'dsh-session-checklist' },
          h(
            'div',
            { className: 'dsh-session-checklist-head' },
            h(
              'div',
              { className: 'dsh-session-checklist-head-main' },
              h('h2', { className: 'dsh-session-checklist-heading' }, tr('checklist.heading')),
              h('span', { className: 'dsh-session-checklist-sub' }, tr('checklist.subtitle')),
            ),
            total > 0
              ? h('span', { className: 'dsh-session-checklist-progress' }, tr('checklist.progress', { done, total }))
              : null,
          ),
          total === 0
            ? h('p', { className: 'dsh-session-checklist-empty' }, tr('checklist.empty'))
            : h(
                'ul',
                { className: 'dsh-session-checklist-list' },
                items.map((item) =>
                  h(
                    'li',
                    { key: item.id },
                    h(
                      'label',
                      {
                        className: 'dsh-session-checklist-item',
                        'data-done': item.done ? 'true' : 'false',
                      },
                      h('input', {
                        type: 'checkbox',
                        className: 'dsh-session-checklist-native',
                        checked: item.done,
                        onChange: () => toggle(item.id),
                      }),
                      h('span', { className: 'dsh-session-checklist-box', 'aria-hidden': true }, h(CheckMark)),
                      h('span', { className: 'dsh-session-checklist-text' }, item.text),
                    ),
                  ),
                ),
              ),
          h(
            'form',
            { className: 'dsh-session-checklist-add', onSubmit: add },
            h('input', {
              className: 'dsh-session-checklist-input',
              type: 'text',
              value: draft,
              maxLength: 200,
              placeholder: tr('checklist.placeholder'),
              'aria-label': tr('checklist.addAria'),
              onChange: (event) => setDraft(event.target.value),
            }),
            h(
              'button',
              {
                className: 'dsh-session-checklist-add-button',
                type: 'submit',
                disabled: draft.trim() === '',
              },
              tr('checklist.add'),
            ),
          ),
        )
      }

      function ChecklistTitle(props) {
        const tr = typeof props.t === 'function' ? props.t : t
        return tr('tab.title')
      }

      const definition = {
        id: TAB_TYPE_ID,
        kind: KIND,
        priority: 'extension',
        title: () => t('tab.title'),
        guide: [
          {
            id: 'checklist',
            order: 40,
            title: () => t('tab.title'),
            description: () => t('guide.description'),
            icon: ChecklistIcon,
          },
        ],
      }

      ctx.effect(() => ctx.locale.register(NS, 'en', en), 'session-checklist: en dictionary')
      ctx.effect(() => ctx.locale.register(NS, 'de', de), 'session-checklist: de dictionary')
      ctx.effect(() => tabs.register(definition), 'session-checklist: tab type')
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register(
              {
                name: 'sidebar.right.pane.tab',
                key: TAB_TYPE_ID,
                locale: NS,
              },
              ChecklistBody,
            ),
          ),
        'session-checklist: tab body',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab.title', () =>
            ctx.slots.register(
              {
                name: 'sidebar.right.pane.tab.title',
                key: TAB_TYPE_ID,
                locale: NS,
              },
              ChecklistTitle,
            ),
          ),
        'session-checklist: tab title',
      )
      ctx.effect(installStyles, 'session-checklist: styles')

      ctx.effect(() => {
        let stopped = false
        let timer = 0
        let attempts = 0

        const openFor = (sessionId) => {
          if (stopped || typeof sessionId !== 'string' || sessionId === '') return
          if (sidebarRight.mounted.getSnapshot() !== sessionId) return
          const open = sidebarRight.openTabs.getSnapshot()
          if (open.some((tab) => tab.sessionId === sessionId && tab.kind === KIND)) return
          try {
            sidebarRight.openTab(KIND)
          } catch {
            if (attempts >= 20) return
            attempts += 1
            timer = window.setTimeout(() => {
              timer = 0
              openFor(sessionId)
            }, 50)
          }
        }

        const sync = () => {
          attempts = 0
          openFor(sidebarRight.mounted.getSnapshot())
        }

        const unsubscribe = sidebarRight.mounted.subscribe(sync)
        sync()

        return () => {
          stopped = true
          unsubscribe()
          if (timer !== 0) window.clearTimeout(timer)
          for (const tab of [...sidebarRight.openTabs.getSnapshot()]) {
            if (tab.kind !== KIND) continue
            try {
              sidebarRight.closeIn(tab.sessionId, tab.tabId)
            } catch (error) {
              console.error('Session checklist tab cleanup failed:', error)
            }
          }
        }
      }, 'session-checklist: follow the on-screen session')
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight'],
      apply,
    }
  },
})
