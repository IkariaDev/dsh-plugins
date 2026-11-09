/**
 * Cost estimation used by the browser half and by its self-tests.
 *
 * Two price sources are merged:
 *
 * 1. DeepSeek's official table (USD per 1M tokens, PEAK rates) from
 *    https://api-docs.deepseek.com/quick_start/pricing/ (read 2026-11-08).
 *    Off-peak is exactly half; cache writes carry no separate charge and
 *    reasoning tokens are a subset of the output tokens.
 * 2. The CommandCode Provider API model table, generated from
 *    https://commandcode.ai/docs/resources/pricing-limits (read 2026-11-08).
 *    DeepSeek routes publish off-peak rates and double them during DeepSeek's
 *    peak window; every other route bills flat. A missing cache-write price
 *    means the provider charges none.
 *
 * Model ids may arrive provider-prefixed (`deepseek/deepseek-v4.1-flash`), so
 * one namespace segment is stripped before lookup. Unknown models fall back to
 * the DeepSeek Flash estimate and are flagged `estimated`, so the display
 * keeps counting instead of freezing at zero.
 */

export const PEAK_PRICES = {
  'deepseek-flash': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
  'deepseek-v4-pro': { cacheHit: 0.044, cacheMiss: 1.32, output: 3.96 },
  'deepseek-v4-flash': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
  'deepseek-v4-flash-vision-exp': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
}

const ALIASES = {
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
}

const CLAUDE_FALLBACK = [
  [/claude[-_/]?opus/i, 'deepseek-v4-pro'],
  [/claude[-_/]?(sonnet|haiku)/i, 'deepseek-flash'],
]

/** [cache-miss input, output, cache-read input, cache-write input, peak×] */
export const COMMANDCODE_RATES = {
  'claude-sonnet-5-5': [2, 10, 0.1, 2.5, 1],
  'claude-sonnet-5': [2, 10, 0.2, 2.5, 1],
  'claude-sonnet-4-6': [3, 15, 0.3, 3.75, 1],
  'claude-fable-5-1': [10, 50, 0.25, 12.5, 1],
  'claude-fable-5': [10, 50, 1, 12.5, 1],
  'claude-opus-5-5': [4, 20, 0.2, 5, 1],
  'claude-opus-5': [5, 25, 0.5, 6.25, 1],
  'claude-opus-4-8': [5, 25, 0.5, 6.25, 1],
  'claude-opus-4-7': [5, 25, 0.5, 6.25, 1],
  'claude-haiku-5-5': [0.1, 0.5, 0.01, 0.125, 1],
  'claude-haiku-4-5-20251001': [1, 5, 0.1, 1.25, 1],
  'gpt-6-astra': [10, 50, 1, 12.5, 1],
  'gpt-6.1-sol': [2, 10, 0.1, 2.5, 1],
  'gpt-6.1-terra': [1, 5, 0.05, 1.25, 1],
  'gpt-6-sol': [2, 10, 0.2, 2.5, 1],
  'gpt-6-luna': [0.1, 0.5, 0.01, 0.125, 1],
  'gpt-5.6-sol': [5, 30, 0.5, 6.25, 1],
  'gpt-5.6-terra': [2, 12, 0.2, 2.5, 1],
  'gpt-5.6-luna': [0.2, 1.2, 0.02, 0.25, 1],
  'gpt-5.5': [5, 30, 0.5, 0, 1],
  'gpt-5.4': [2.5, 15, 0.25, 0, 1],
  'gpt-5.3-codex': [2, 8, 0.5, 0, 1],
  'gpt-5.4-mini': [0.75, 4.5, 0.075, 0, 1],
  'deepseek/deepseek-v4-pro': [0.66, 1.98, 0.022, 0, 2],
  'deepseek/deepseek-v4-flash': [0.15, 0.6, 0.003, 0, 2],
  'deepseek/deepseek-v4-flash-vision-exp': [0.15, 0.6, 0.003, 0, 2],
  'deepseek/deepseek-v4-flash-fast': [0.28, 0.56, 0.07, 0, 1],
  'deepseek/deepseek-v4.1-flash': [0.15, 0.6, 0.003, 0, 2],
  'deepseek/deepseek-v4.1-flash-fast': [0.16, 0.58, 0.016, 0, 2],
  'deepseek/deepseek-v4.1-flash-ultrafast': [2.4, 9.6, 0.048, 0, 1],
  'moonshotai/Kimi-K3.1-Pro': [2, 10, 0.2, 0, 1],
  'moonshotai/Kimi-K3': [3, 15, 0.3, 0, 1],
  'moonshotai/Kimi-K2.7-Code': [0.95, 4, 0.19, 0, 1],
  'moonshotai/Kimi-K2.7-Code-Highspeed': [1.9, 8, 0.38, 0, 1],
  'moonshotai/Kimi-K2.6': [0.95, 4, 0.16, 0, 1],
  'moonshotai/Kimi-K2.5': [0.6, 3, 0.1, 0, 1],
  'z-ai/glm-5.3-flash': [0.15, 0.5, 0.03, 0, 1],
  'z-ai/glm-5.3-flashx': [0.37, 1.25, 0.075, 0, 1],
  'zai-org/GLM-5.3': [1.4, 4.4, 0.26, 0, 1],
  'zai-org/GLM-5.2': [1.4, 4.4, 0.26, 0, 1],
  'zai-org/GLM-5.2-Fast': [3, 10.25, 0.5, 0, 1],
  'zai-org/GLM-5.1': [1.4, 4.4, 0.26, 0, 1],
  'zai-org/GLM-5': [1, 3.2, 0.2, 0, 1],
  'minimax/minimax-m3.1-flash': [0.15, 0.6, 0.015, 0, 1],
  'MiniMaxAI/MiniMax-M3': [0.3, 1.2, 0.06, 0, 1],
  'MiniMaxAI/MiniMax-M2.7': [0.3, 1.2, 0.06, 0, 1],
  'MiniMaxAI/MiniMax-M2.5': [0.3, 1.2, 0.03, 0, 1],
  'ornith/ornith-1.5-122b': [0.16, 0.64, 0.02, 0, 1],
  'xiaomi/mimo-v2.6-pro': [0.435, 0.87, 0.0036, 0, 1],
  'xiaomi/mimo-v2.6-pro-ultraspeed': [4.35, 8.7, 0.036, 0, 1],
  'xiaomi/mimo-v2.6-flash': [0.14, 0.28, 0.0028, 0, 1],
  'Qwen/Qwen3.8-Omni-Flash': [0.15, 0.47, 0.016, 0, 1],
  'Qwen/Qwen3.8-Max-Prime': [4, 12, 0.5, 5, 1],
  'Qwen/Qwen3.8-Max-0902': [2, 6, 0.25, 0, 1],
  'Qwen/Qwen3.8-Max': [2, 6, 0.25, 2.5, 1],
  'Qwen/Qwen3.8-27B': [0.4, 3, 0.04, 0, 1],
  'Qwen/Qwen3.8-Flash': [0.16, 0.47, 0.016, 0, 1],
  'Qwen/Qwen3.7-Max': [2.5, 7.5, 0.5, 3.13, 1],
  'Qwen/Qwen3.7-Plus': [0.4, 1.6, 0.08, 0.5, 1],
  'Qwen/Qwen3.7-Flash': [0.03, 0.13, 0.006, 0.038, 1],
  'Qwen/Qwen3.6-Max-Preview': [1.3, 7.8, 0.26, 1.63, 1],
  'Qwen/Qwen3.6-Plus': [0.5, 3, 0.1, 0, 1],
  'meituan/LongCat-2.0': [0.3, 1.2, 0.006, 0, 1],
  'stepfun/Step-5-Preview': [1, 2.7, 0.05, 0, 1],
  'stepfun/Step-3.7-Flash': [0.2, 1.15, 0.04, 0, 1],
  'stepfun/Step-3.5-Flash': [0.09, 0.3, 0.02, 0, 1],
  'tencent/hy3-paid': [0.14, 0.58, 0.035, 0, 1],
  'tencent/hy4-preview': [0.834, 2.501, 0.042, 0, 1],
  'google/gemini-4-argon': [2, 10, 0.1, 0, 1],
  'google/gemini-3.8-flash': [1.5, 7.5, 0.15, 0, 1],
  'google/gemini-3.7-flash': [1.5, 7.5, 0.15, 0.08334, 1],
  'google/gemini-3.6-flash': [1.5, 7.5, 0.15, 0, 1],
  'google/gemini-3.5-flash': [1.5, 9, 0.15, 0, 1],
  'google/gemini-3.5-flash-lite': [0.3, 2.5, 0.03, 0, 1],
  'google/gemini-3.1-flash-lite': [0.25, 1.5, 0.03, 0, 1],
  'sakana/fugu-ultra': [5, 30, 0.5, 0, 1],
  'nvidia/nemotron-3-ultra-550b-a55b': [0.6, 2.4, 0.12, 0, 1],
  'nvidia/nemotron-3.5-super-vl': [0.2, 0.5, 0.04, 0, 1],
  'thinkingmachines/inkling': [1, 4.05, 0.17, 0, 1],
  'thinkingmachines/inkling-small': [0.5, 1.2, 0.1, 0, 1],
  'stealth/glyph-cluster:free': [0, 0, 0, 0, 1],
  'stealth/crouton-alpha': [0, 0, 0, 0, 1],
  'reflection/beam:free': [0, 0, 0, 0, 1],
  'inclusionai/ling-3.1-flash': [0.3, 0.9, 0.06, 0, 1],
  'inclusionai/ling-3.1-flash-1019': [0.3, 0.9, 0.06, 0, 1],
  'meta/muse-spark-1.1': [1.25, 4.25, 0.15, 0, 1],
  'meta/muse-spark-1.2': [1.25, 4.25, 0.15, 0, 1],
  'meta/muse-spark-1.2-contributor': [0.1, 0.2, 0.002, 0, 1],
  'meta/muse-spark-1.3': [1.25, 4.25, 0.15, 0, 1],
  'meta/muse-spark-1.3-contributor': [0.1, 0.2, 0.002, 0, 1],
  'meta/muse-spark-open': [1.25, 4.25, 0.15, 0, 1],
  'meta/muse-wonder-1.0': [4, 20, 0.2, 0, 1],
  'xai/grok-4.5': [2, 6, 0.5, 0, 1],
  'xai/grok-4.6': [2, 6, 0.5, 0, 1],
  'xai/grok-4.7': [2, 6, 0.5, 0, 1],
  'mistral/mistral-large-4': [1.36, 4.18, 0.14, 0, 1],
}

const COMMANDCODE_INDEX = Object.create(null)
for (const id of Object.keys(COMMANDCODE_RATES)) {
  const entry = COMMANDCODE_RATES[id]
  COMMANDCODE_INDEX[id.toLowerCase()] = entry
  const bare = id.toLowerCase().replace(/^[^/]+\//, '')
  if (COMMANDCODE_INDEX[bare] === undefined) COMMANDCODE_INDEX[bare] = entry
}

// DeepSeek model families under any provider: official ids, CommandCode
// namespace ids and versioned aliases resolve to the same published rates.
const DEEPSEEK_FAMILIES = [
  [/^deepseek[-_.]?v?4[._-]?1[._-]?flash/, 'deepseek-flash'],
  [/^deepseek[-_.]?v?4[._-]?1[._-]?pro/, 'deepseek-v4-pro'],
  [/^deepseek[-_.]?v?4[._-]?flash/, 'deepseek-flash'],
  [/^deepseek[-_.]?v?4[._-]?pro/, 'deepseek-v4-pro'],
  [/^deepseek[-_.]?(flash|chat|reasoner)/, 'deepseek-flash'],
]

/** Strip a provider namespace from a model id (`deepseek/deepseek-v4.1-flash`). */
export function normalizeModelId(model) {
  let id = String(model).trim().toLowerCase()
  while (id.includes('/')) id = id.slice(id.indexOf('/') + 1)
  return id
}

function deepseekFamily(id) {
  for (const [pattern, target] of DEEPSEEK_FAMILIES) if (pattern.test(id)) return target
  return null
}

/** Resolve one route to a price source, or null when nothing matches. */
export function modelKey(model, provider) {
  if (typeof model !== 'string' || model.trim() === '') return null
  const raw = model.trim().toLowerCase()
  const id = normalizeModelId(model)
  if (id.endsWith(':free')) return { kind: 'free' }
  const official = provider === undefined || provider === '' || /deepseek/i.test(provider)
  const commandcode = COMMANDCODE_INDEX[raw] ?? COMMANDCODE_INDEX[id]
  if (official) {
    if (PEAK_PRICES[id] !== undefined) return { kind: 'deepseek', id }
    if (PEAK_PRICES[ALIASES[id]] !== undefined) return { kind: 'deepseek', id: ALIASES[id] }
    for (const [pattern, target] of CLAUDE_FALLBACK) {
      if (pattern.test(id)) return { kind: 'deepseek', id: target }
    }
  }
  if (commandcode !== undefined) return { kind: 'commandcode', entry: commandcode }
  const family = deepseekFamily(id)
  if (family !== null) return { kind: 'deepseek', id: family }
  return null
}

/**
 * Whether a timestamp falls in DeepSeek's peak window, computed in UTC.
 * @param {number} time epoch milliseconds
 * @returns {boolean}
 */
export function isPeak(time) {
  const date = new Date(Number.isFinite(time) ? time : Date.now())
  const day = date.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = date.getUTCHours()
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10)
}

/**
 * Price triple for one route at a given time. Unknown models fall back to the
 * DeepSeek Flash estimate and are flagged `estimated`.
 * @param {string} model
 * @param {string} [provider]
 * @param {number} [time]
 */
export function ratesFor(model, provider, time) {
  const at = Number.isFinite(time) ? time : Date.now()
  const peak = isPeak(at)
  const key = modelKey(model, provider)
  if (key !== null && key.kind === 'free') {
    return { cacheHit: 0, cacheMiss: 0, output: 0, cacheWrite: 0, peak, free: true, estimated: false }
  }
  if (key !== null && key.kind === 'commandcode') {
    const entry = key.entry
    const doubles = entry[4] > 1
    const factor = peak && doubles ? entry[4] : 1
    return {
      cacheHit: entry[2] * factor,
      cacheMiss: entry[0] * factor,
      output: entry[1] * factor,
      cacheWrite: entry[3] * factor,
      peak,
      flat: !doubles,
      free: false,
      estimated: false,
    }
  }
  if (key !== null) {
    const base = PEAK_PRICES[key.id]
    const factor = peak ? 1 : 0.5
    return {
      cacheHit: base.cacheHit * factor,
      cacheMiss: base.cacheMiss * factor,
      output: base.output * factor,
      cacheWrite: 0,
      peak,
      flat: false,
      free: false,
      estimated: false,
    }
  }
  const base = PEAK_PRICES['deepseek-flash']
  const factor = peak ? 1 : 0.5
  return {
    cacheHit: base.cacheHit * factor,
    cacheMiss: base.cacheMiss * factor,
    output: base.output * factor,
    cacheWrite: 0,
    peak,
    flat: false,
    free: false,
    estimated: true,
  }
}

/**
 * Estimated cost in USD for one usage aggregate.
 * @param {{uncachedInputTokens?:number, outputTokens?:number, cacheReadTokens?:number, cacheWriteTokens?:number}} usage
 * @param {{ cacheHit:number, cacheMiss:number, output:number, cacheWrite:number }} rates
 * @returns {number}
 */
export function costOfUsage(usage, rates) {
  if (!usage || !rates) return 0
  const uncached = Number(usage.uncachedInputTokens) || 0
  const cacheRead = Number(usage.cacheReadTokens) || 0
  const cacheWrite = Number(usage.cacheWriteTokens) || 0
  const output = Number(usage.outputTokens) || 0
  return (uncached * rates.cacheMiss + cacheRead * rates.cacheHit + cacheWrite * rates.cacheWrite + output * rates.output) / 1e6
}

/**
 * Estimated cost in USD for a per-Turn usage aggregate that may name routes.
 * Multiple routes fall back to the most expensive one, which is the honest
 * upper bound when attempts cannot be attributed individually.
 * @param {{routes?: {provider?:string, model?:string}[]}} usage
 * @param {number} time
 * @returns {{cost:number, model:string|null, rates:object|null}}
 */
export function costOfTurnUsage(usage, time) {
  if (!usage) return { cost: 0, model: null, rates: null }
  const candidates = (Array.isArray(usage.routes) ? usage.routes : [])
    .map((route) => ({
      model: route && typeof route.model === 'string' ? route.model : '',
      provider: route && typeof route.provider === 'string' ? route.provider : undefined,
    }))
    .filter((route) => route.model !== '')
  if (candidates.length === 0) {
    const rates = ratesFor('deepseek-flash', undefined, time)
    return { cost: costOfUsage(usage, rates), model: 'deepseek-flash', rates }
  }
  let best = null
  for (const candidate of candidates) {
    const rates = ratesFor(candidate.model, candidate.provider, time)
    const cost = costOfUsage(usage, rates)
    if (best === null || cost > best.cost) best = { cost, model: candidate.model, rates }
  }
  return best
}

/**
 * Locale-independent USD formatting: precision follows the magnitude so a
 * session that costs cents still shows readable per-Turn values.
 * @param {number} value
 */
export function formatUsd(value) {
  const cost = Number(value)
  if (!Number.isFinite(cost)) return '$0.00'
  const abs = Math.abs(cost)
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4
  return `$${cost.toFixed(digits)}`
}

/**
 * Compact token count such as 1.3M or 358K.
 * @param {number} value
 */
export function formatTokens(value) {
  const tokens = Number(value)
  if (!Number.isFinite(tokens) || tokens <= 0) return '0'
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(tokens >= 1e7 ? 0 : 1)}M`
  if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(tokens >= 1e4 ? 0 : 1)}K`
  return String(Math.round(tokens))
}

/**
 * The cache-hit share of prompt tokens, as a whole percentage.
 * @param {{uncachedInputTokens?:number, cacheReadTokens?:number, cacheWriteTokens?:number}} usage
 * @returns {number|null} percentage 0-100, or null when the prompt is empty
 */
export function cacheHitPercent(usage) {
  if (!usage) return null
  const hit = Number(usage.cacheReadTokens) || 0
  const miss = Number(usage.uncachedInputTokens) || 0
  const write = Number(usage.cacheWriteTokens) || 0
  const prompt = hit + miss + write
  if (prompt <= 0) return null
  return Math.round((hit / prompt) * 100)
}
