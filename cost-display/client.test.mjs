/**
 * Smoke test for the hand-written Client bundle: loads client.js in Node with a
 * stub module loader and React, applies the plugin to a fake Client context,
 * and calls both slot components with fixture data.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

// --- stub browser globals -------------------------------------------------
const head = { children: [], appendChild(node) { this.children.push(node) } }
globalThis.document = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, textContent: '', remove() {} }),
  head,
}
const registrations = []
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      globalThis.__loadedDefinition = definition
    },
  },
}

const React = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  Fragment: Symbol('Fragment'),
  memo: (component) => component,
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
  useMemo: (factory) => factory(),
}

const ReactDOM = {
  createPortal: (node) => node,
}

const source = readFileSync(join(here, 'client.js'), 'utf8')
new Function('window', source)(globalThis.window)

const definition = globalThis.__loadedDefinition
assert.equal(definition.id, '@local/dsh-cost-display')
const module = definition.factory((id) => {
  if (id === 'react') return React
  if (id === 'react-dom') return ReactDOM
  throw new Error(`unexpected module: ${id}`)
})
assert.deepEqual(module.inject, ['slots', 'locale'])

// --- fake Client context --------------------------------------------------
const dictionaries = {}
const ctx = {
  locale: {
    bind: () => (key, params) => interpolate(dictionaries[key] ?? key, params),
    register: (ns, lang, dict) => {
      if (lang === 'en') Object.assign(dictionaries, dict)
    },
  },
  effect: (fn) => {
    const cleanup = fn()
    return cleanup
  },
  slots: {
    inject: (name, callback) => {
      callback()
    },
    register: (options, component) => {
      registrations.push({ options, component })
      return () => {}
    },
  },
  sessions: { binding: () => undefined },
  uiConversation: { binding: () => ({ target: () => undefined }) },
}

function interpolate(text, params) {
  return String(text).replace(/\{(\w+)\}/g, (match, name) =>
    params && params[name] !== undefined ? String(params[name]) : match,
  )
}

module.apply(ctx)

const dock = registrations.find(
  (entry) => entry.options.name === 'conversation.composer.dock' && entry.options.id.endsWith(':session'),
)
const usageMeter = registrations.find(
  (entry) => entry.options.name === 'conversation.composer.dock' && entry.options.id.endsWith(':usage-meter'),
)
const tail = registrations.find((entry) => entry.options.name === 'conversation.chat.turnTail')
assert.ok(dock, 'composer dock registration missing')
assert.ok(usageMeter, 'usage meter registration missing')
assert.ok(tail, 'turn tail registration missing')
assert.equal(dock.options.order, 2)
assert.equal(dock.options.locale, 'costDisplay')
assert.equal(usageMeter.options.order, -1)
assert.equal(usageMeter.options.locale, 'costDisplay')

// The sidebar brand slots are overridden with empty occupants (priority -1
// beats the official brand package at 0, which is the first `single` entry).
const brandMark = registrations.find((entry) => entry.options.name === 'sidebar.brand.mark')
const brandName = registrations.find((entry) => entry.options.name === 'sidebar.brand.name')
assert.ok(brandMark, 'sidebar brand mark override missing')
assert.ok(brandName, 'sidebar brand name override missing')
assert.equal(brandMark.options.priority, -1)
assert.equal(brandName.options.priority, -1)
assert.equal(brandMark.component(), null)
assert.equal(brandName.component(), null)

// --- render the dock pill -------------------------------------------------
// Pin the clock so peak/off-peak pricing is deterministic in this test.
const realNow = Date.now
Date.now = () => Date.UTC(2026, 10, 2, 7, 0, 0)
const usage = { uncachedInputTokens: 1200, outputTokens: 400, cacheReadTokens: 8800, cacheWriteTokens: 0 }
const pillNode = dock.component({
  t: (key, params) => interpolate(dictionaries[key] ?? key, params),
  useProjection: (key) => (key === 'tokenUsage' ? usage : undefined),
})
assert.ok(pillNode, 'pill rendered nothing')
const pill = pillNode.children[0]
const pillText = collectText(pill)
assert.ok(/^≈ \d+,\d+ €$/.test(pillText), pillText)
assert.equal(pill.props['data-composer-stat'], 'cost')
assert.match(pill.props.title, /cache hits 88%/, pill.props.title)
assert.equal(pill.props['aria-haspopup'], 'dialog')

// --- render the per-turn row ---------------------------------------------
const turnUsage = {
  uncachedInputTokens: 1200,
  cacheReadTokens: 8800,
  outputTokens: 400,
  totalTokens: 10400,
  routes: [{ provider: 'deepseek-account', model: 'deepseek-flash' }],
}
// A Monday 07:00 UTC is peak.
const peakTime = Date.UTC(2026, 10, 2, 7, 0, 0)
const turnTailData = { time: peakTime, tokenUsage: turnUsage, turn: 3, seq: 42 }
const turnWithData = {
  turn: 3,
  status: 'closed',
  data: { get: (key) => (key === 'turn-tail' ? turnTailData : undefined) },
}
// (a) the live `useChat` selector path
const row = tail.component({
  turn: turnWithData,
  t: (key, params) => interpolate(dictionaries[key] ?? key, params),
  useChat: (selector) =>
    selector({
      timeline: { turns: new Map([[3, { turn: 3, data: turnWithData.data }]]) },
    }),
})
assert.ok(row, 'cost row rendered nothing')
const rowText = collectText(row)
assert.ok(/^≈ 0,0008 € \u00b7 10K token \u00b7 Cache 88%$/.test(spaceSeparators(rowText)), rowText)

// (b) the `turn.data` fallback when useChat is absent
const fallbackRow = tail.component({
  turn: turnWithData,
  t: (key, params) => interpolate(dictionaries[key] ?? key, params),
})
assert.ok(fallbackRow, 'fallback row rendered nothing')
assert.equal(spaceSeparators(collectText(fallbackRow)), spaceSeparators(rowText))

// Off-peak is exactly half.
const offRow = tail.component({
  turn: {
    turn: 3,
    data: {
      get: () => ({ time: Date.UTC(2026, 10, 2, 12, 0, 0), tokenUsage: turnUsage }),
    },
  },
  t: (key, params) => interpolate(dictionaries[key] ?? key, params),
})
assert.ok(/^≈ 0,0004 € \u00b7 10K token \u00b7 Cache 88%$/.test(spaceSeparators(collectText(offRow))), collectText(offRow))

// --- CommandCode custom provider -----------------------------------------
// A `provider/model` route from a custom API no longer falls back to an
// "unpriced" zero: the Provider API table prices it.
function rowWith(turnUsage, number = 4) {
  return tail.component({
    turn: { turn: number, data: { get: () => ({ time: peakTime, tokenUsage: turnUsage }) } },
    t: (key, params) => interpolate(dictionaries[key] ?? key, params),
  })
}

const ccRow = rowWith({ ...turnUsage, routes: [{ provider: 'commandcode', model: 'deepseek/deepseek-v4.1-flash' }] })
assert.ok(/^≈ 0,0008 € \u00b7 10K token \u00b7 Cache 88%$/.test(spaceSeparators(collectText(ccRow))), collectText(ccRow))
assert.match(ccRow.props.title, /peak rates/)

// Flat CommandCode routes bill their published rates without peak doubling.
const glmRow = rowWith({ ...turnUsage, routes: [{ provider: 'commandcode', model: 'z-ai/glm-5.3-flash' }] })
assert.ok(/^≈ 0,0006 € \u00b7 10K token \u00b7 Cache 88%$/.test(spaceSeparators(collectText(glmRow))), collectText(glmRow))
assert.match(glmRow.props.title, /flat rates/)

// Free CommandCode routes stay visible at zero cost.
const freeRow = rowWith({ ...turnUsage, routes: [{ provider: 'commandcode', model: 'reflection/beam:free' }] })
assert.ok(/^≈ 0,00 € \u00b7 10K token \u00b7 Cache 88%$/.test(spaceSeparators(collectText(freeRow))), collectText(freeRow))
assert.match(freeRow.props.title, /free rates/)

// An unknown custom model still estimates with the flagged Flash fallback.
const unknownRow = rowWith({ ...turnUsage, routes: [{ provider: 'x', model: 'mystery-model' }] })
assert.ok(/^≈ 0,0008 € \u00b7 10K token \u00b7 Cache 88%$/.test(spaceSeparators(collectText(unknownRow))), collectText(unknownRow))

// The composer pill prices the Session with the last-used model route.
const selectionPill = dock.component({
  t: (key, params) => interpolate(dictionaries[key] ?? key, params),
  useProjection: (key) =>
    key === 'tokenUsage' ? usage : key === 'modelSelection' ? { lastUsed: { provider: 'commandcode', model: 'z-ai/glm-5.3-flash' } } : undefined,
})
assert.match(collectText(selectionPill.children[0]), /^≈ 0,0006 €$/)
assert.match(selectionPill.children[0].props.title, /flat rates/)

// Without usage data the row renders nothing instead of a false zero.
assert.equal(
  tail.component({
    turn: { turn: 3, data: { get: () => undefined } },
    useChat: (selector) => selector({ timeline: { turns: new Map() } }),
    t: (key) => key,
  }),
  null,
)

console.log('client bundle smoke test passed')

function spaceSeparators(text) {
  return String(text).replace(/\u00b7/g, ' \u00b7 ')
}

function collectText(node) {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  const parts = []
  for (const child of node.children ?? []) parts.push(collectText(child))
  return parts.join('')
}
