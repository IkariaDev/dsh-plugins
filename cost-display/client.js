window.__ModuleLoader__.load({
  id: '@local/dsh-cost-display',
  factory(require) {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement

    const PACKAGE = '@local/dsh-cost-display'
    const NS = 'costDisplay'
    const STYLE_ID = `${PACKAGE}/cost-display.css`

    // ECB reference rate, 1 EUR = 1.1165 USD (2026-11-06). Prices are billed in
    // USD; the display converts them for a EUR reading.
    const EUR_PER_USD = 1 / 1.1165
    const FX_DATE = '06.11.2026'

    // ---------------------------------------------------------------------
    // DeepSeek price table (USD per 1M tokens, peak rates).
    // Source: https://api-docs.deepseek.com/quick_start/pricing/ (2026-11-08)
    // Off-peak rates are exactly half; cache writes carry no separate charge,
    // and reasoning tokens are a subset of the output tokens.
    // ---------------------------------------------------------------------
    const PEAK_PRICES = {
      'deepseek-flash': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
      'deepseek-v4-pro': { cacheHit: 0.044, cacheMiss: 1.32, output: 3.96 },
      'deepseek-v4-flash': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
      'deepseek-v4-flash-vision-exp': { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 },
    }
    const MODEL_ALIASES = {
      'deepseek-chat': 'deepseek-flash',
      'deepseek-reasoner': 'deepseek-flash',
    }
    const CLAUDE_FALLBACK = [
      [/claude[-_/]?opus/i, 'deepseek-v4-pro'],
      [/claude[-_/]?(sonnet|haiku)/i, 'deepseek-flash'],
    ]

    // ---------------------------------------------------------------------
    // CommandCode Provider API price table (USD per 1M tokens), generated from
    // https://commandcode.ai/docs/resources/pricing-limits (2026-11-08).
    // Value layout: [cache-miss input, output, cache-read input, cache-write
    // input, peak multiplier]. DeepSeek routes publish off-peak rates and
    // double them during DeepSeek's peak window; every other route bills flat.
    // A missing cache-write price means the provider charges none.
    // ---------------------------------------------------------------------
    const COMMANDCODE_RATES = {
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
    for (const commandcodeId of Object.keys(COMMANDCODE_RATES)) {
      const entry = COMMANDCODE_RATES[commandcodeId]
      COMMANDCODE_INDEX[commandcodeId.toLowerCase()] = entry
      const bare = commandcodeId.toLowerCase().replace(/^[^/]+\//, '')
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
    function normalizeModelId(model) {
      let id = String(model).trim().toLowerCase()
      while (id.includes('/')) id = id.slice(id.indexOf('/') + 1)
      return id
    }

    function deepseekFamily(id) {
      for (let index = 0; index < DEEPSEEK_FAMILIES.length; index += 1) {
        if (DEEPSEEK_FAMILIES[index][0].test(id)) return DEEPSEEK_FAMILIES[index][1]
      }
      return null
    }

    /** Resolve one route to a price source, or null when nothing matches. */
    function modelKey(model, provider) {
      if (typeof model !== 'string' || model.trim() === '') return null
      const raw = model.trim().toLowerCase()
      const id = normalizeModelId(model)
      if (id.endsWith(':free')) return { kind: 'free' }
      const official = provider === undefined || provider === '' || /deepseek/i.test(provider)
      const commandcode = COMMANDCODE_INDEX[raw] ?? COMMANDCODE_INDEX[id]
      if (official) {
        if (PEAK_PRICES[id] !== undefined) return { kind: 'deepseek', id }
        if (PEAK_PRICES[MODEL_ALIASES[id]] !== undefined) return { kind: 'deepseek', id: MODEL_ALIASES[id] }
        for (let index = 0; index < CLAUDE_FALLBACK.length; index += 1) {
          if (CLAUDE_FALLBACK[index][0].test(id)) return { kind: 'deepseek', id: CLAUDE_FALLBACK[index][1] }
        }
      }
      if (commandcode !== undefined) return { kind: 'commandcode', entry: commandcode }
      const family = deepseekFamily(id)
      if (family !== null) return { kind: 'deepseek', id: family }
      return null
    }

    function isPeak(time) {
      const date = new Date(Number.isFinite(time) ? time : Date.now())
      const day = date.getUTCDay()
      if (day === 0 || day === 6) return false
      const hour = date.getUTCHours()
      return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10)
    }

    /**
     * Price triple for one route at a given time. Unknown models fall back to
     * the DeepSeek Flash estimate and are flagged `estimated`, so the display
     * keeps counting instead of freezing at zero for a custom API.
     */
    function ratesFor(model, provider, time) {
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

    /** Locale word for the rate basis of one estimate. */
    function rateLabelOf(t, rates) {
      if (rates.free) return t('rate.free')
      if (rates.flat) return t('rate.flat')
      return rates.peak ? t('rate.peak') : t('rate.offPeak')
    }

    function costOfUsage(usage, rates) {
      if (!usage || !rates) return 0
      const uncached = Number(usage.uncachedInputTokens) || 0
      const cacheRead = Number(usage.cacheReadTokens) || 0
      const cacheWrite = Number(usage.cacheWriteTokens) || 0
      const output = Number(usage.outputTokens) || 0
      return (
        (uncached * rates.cacheMiss +
          cacheRead * rates.cacheHit +
          cacheWrite * rates.cacheWrite +
          output * rates.output) /
        1e6
      )
    }

    function turnCost(usage, time) {
      if (!usage) return { cost: 0, model: null, rates: null }
      const routes = Array.isArray(usage.routes) ? usage.routes : []
      const candidates = routes
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
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index]
        const rates = ratesFor(candidate.model, candidate.provider, time)
        const cost = costOfUsage(usage, rates)
        if (best === null || cost > best.cost) best = { cost, model: candidate.model, rates }
      }
      return best
    }

    function formatUsd(value) {
      const cost = Number(value)
      if (!Number.isFinite(cost) || cost <= 0) return '$0.00'
      const digits = cost >= 1 ? 2 : cost >= 0.01 ? 3 : 4
      return `$${cost.toFixed(digits)}`
    }

    /** EUR reading of a USD amount, in German decimal notation. */
    function formatEur(value) {
      const eur = Number(value) * EUR_PER_USD
      if (!Number.isFinite(eur) || eur <= 0) return '0,00 €'
      const digits = eur >= 1 ? 2 : eur >= 0.01 ? 3 : 4
      return `${eur.toFixed(digits).replace('.', ',')} €`
    }

    /** The USD→EUR factor as a plain decimal in German notation. */
    function formatFx(rate) {
      return Number(rate).toFixed(4).replace('.', ',')
    }

    function formatTokens(value) {
      const tokens = Number(value)
      if (!Number.isFinite(tokens) || tokens <= 0) return '0'
      if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(tokens >= 1e7 ? 0 : 1)}M`
      if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(tokens >= 1e4 ? 0 : 1)}K`
      return String(Math.round(tokens))
    }

    function cacheHitPercent(usage) {
      if (!usage) return null
      const hit = Number(usage.cacheReadTokens) || 0
      const miss = Number(usage.uncachedInputTokens) || 0
      const write = Number(usage.cacheWriteTokens) || 0
      const prompt = hit + miss + write
      if (prompt <= 0) return null
      return Math.round((hit / prompt) * 100)
    }

    // ---------------------------------------------------------------------
    // Visible copy (registered through the Client locale service).
    // ---------------------------------------------------------------------
    const en = {
      'pill.label': '≈ {cost}',
      'pill.tooltip': 'Estimated API cost of this session: {cost} · cache hits {hit}% · {rate} rates · click for the breakdown',
      'pill.aria': 'Estimated API cost of this session: {cost}',
      'row.label': '≈ {cost}',
      'row.tokens': '{tokens} token',
      'row.cache': 'Cache {hit}%',
      'row.tooltip': 'Estimated API cost of this turn: {cost} · {tokens} token · cache hits {hit}% · {rate} rates',
      'dialog.title': 'API cost',
      'dialog.cacheInput': 'Cache hits (input)',
      'dialog.uncachedInput': 'Uncached input',
      'dialog.output': 'Output',
      'dialog.cacheWrite': 'Cache writes',
      'dialog.note': '{rate} rates · 1 US$ = {fx} € (ECB, {date}) · estimate',
      'rate.peak': 'peak',
      'rate.offPeak': 'off-peak',
      'rate.free': 'free',
      'rate.flat': 'flat',
      'usage.pill.aria': 'CommandCode usage',
      'usage.pill.title': 'CommandCode usage: {credits} left · 5-hour window {five} left · week {week} left',
      'usage.dialog.title': 'CommandCode usage',
      'usage.dialog.refresh': 'Refresh',
      'usage.dialog.updated': 'updated {time}',
      'usage.loading': 'loading …',
      'usage.window.fiveHour': '5-hour window',
      'usage.window.weekly': 'Week window',
      'usage.credits.title': 'Credits',
      'usage.remaining': '{amount} left',
      'usage.used': '{used} of {cap} used',
      'usage.reset': 'resets in {duration}',
      'usage.wallet.breakdown': '{monthly} plan · {purchased} purchased · {free} free',
      'usage.billing': 'billing period until {date}',
      'usage.history.title': 'Used credits over time',
      'usage.history.hint': 'The chart builds up while this page stays open.',
      'usage.history.idle': 'No usage in the last {duration}.',
      'usage.history.ago': 'last {duration}',
      'usage.history.now': 'now',
      'usage.history.fiveHour': '5-hour window',
      'usage.history.weekly': 'Week',
      'usage.period.cost': 'cost {amount}',
      'usage.period.tokens': '{tokens} tokens',
      'usage.period.requests': '{count} requests',
      'usage.period.success': '{percent}% successful',
      'usage.error.title': 'CommandCode usage unavailable',
      'usage.now': 'now',
      'usage.minutes': '{minutes} min',
      'usage.hours': '{hours} h {minutes} min',
      'usage.days': '{days} days',
    }
    const de = {
      'pill.label': '≈ {cost}',
      'pill.tooltip': 'Geschätzte API-Kosten dieser Sitzung: {cost} · Cache-Treffer {hit}% · {rate}-Tarif · Klick für die Aufschlüsselung',
      'pill.aria': 'Geschätzte API-Kosten dieser Sitzung: {cost}',
      'row.label': '≈ {cost}',
      'row.tokens': '{tokens} Token',
      'row.cache': 'Cache {hit}%',
      'row.tooltip': 'Geschätzte API-Kosten dieser Runde: {cost} · {tokens} Token · Cache-Treffer {hit}% · {rate}-Tarif',
      'dialog.title': 'API-Kosten',
      'dialog.cacheInput': 'Cache-Treffer (Eingabe)',
      'dialog.uncachedInput': 'Nicht zwischengespeicherte Eingabe',
      'dialog.output': 'Ausgabe',
      'dialog.cacheWrite': 'Cache-Schreiben',
      'dialog.note': '{rate}-Tarif · 1 US$ = {fx} € (EZB, {date}) · Schätzung',
      'rate.peak': 'Peak',
      'rate.offPeak': 'Off-Peak',
      'rate.free': 'kostenlos',
      'rate.flat': 'pauschal',
      'usage.pill.aria': 'CommandCode-Nutzung',
      'usage.pill.title': 'CommandCode-Nutzung: {credits} übrig · 5-Stunden-Fenster {five} übrig · Woche {week} übrig',
      'usage.dialog.title': 'CommandCode-Nutzung',
      'usage.dialog.refresh': 'Aktualisieren',
      'usage.dialog.updated': 'aktualisiert {time}',
      'usage.loading': 'wird geladen …',
      'usage.window.fiveHour': '5-Stunden-Fenster',
      'usage.window.weekly': 'Wochen-Fenster',
      'usage.credits.title': 'Guthaben',
      'usage.remaining': '{amount} übrig',
      'usage.used': '{used} von {cap} verbraucht',
      'usage.reset': 'Reset in {duration}',
      'usage.wallet.breakdown': '{monthly} Plan · {purchased} gekauft · {free} gratis',
      'usage.billing': 'Abrechnungszeitraum bis {date}',
      'usage.history.title': 'Verbrauchte Credits im Verlauf',
      'usage.history.hint': 'Der Verlauf entsteht, während diese Seite geöffnet bleibt.',
      'usage.history.idle': 'Kein Verbrauch in den letzten {duration}.',
      'usage.history.ago': 'letzte {duration}',
      'usage.history.now': 'jetzt',
      'usage.history.fiveHour': '5-Stunden-Fenster',
      'usage.history.weekly': 'Woche',
      'usage.period.cost': 'Kosten {amount}',
      'usage.period.tokens': '{tokens} Token',
      'usage.period.requests': '{count} Anfragen',
      'usage.period.success': '{percent} % erfolgreich',
      'usage.error.title': 'CommandCode-Nutzung nicht verfügbar',
      'usage.now': 'jetzt',
      'usage.minutes': '{minutes} Min',
      'usage.hours': '{hours} Std {minutes} Min',
      'usage.days': '{days} Tage',
    }

    const CSS = `
.dsh-cost-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 -2px;
  padding: 1px 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm);
}
@media (hover: hover) {
  .dsh-cost-pill:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}
.dsh-cost-pill:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  outline-offset: 1px;
}
.dsh-cost-pill svg { flex: none; opacity: 0.85; }
.dsh-cost-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-left: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: default;
}
.dsh-cost-row-cost { color: var(--dsw-alias-label-secondary); font-weight: 500; }
.dsh-cost-row-sep { opacity: 0.5; }
.dsh-cost-dialog {
  position: fixed;
  z-index: 120;
  box-sizing: border-box;
  min-width: 240px;
  max-width: 340px;
  padding: 12px 14px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
  background: var(--dsw-alias-bg-layer-1);
  border-radius: var(--dsw-radius-lg);
  box-shadow: var(--dsw-elevation-panel);
  animation: dsh-cost-dialog-in 0.12s ease-out;
}
.dsh-cost-dialog-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.dsh-cost-dialog-title { font-weight: 600; }
.dsh-cost-dialog-total { font-weight: 600; font-variant-numeric: tabular-nums; }
.dsh-cost-dialog-sep {
  height: 0.5px;
  margin: 8px 0;
  background: var(--dsw-alias-border-l2);
}
.dsh-cost-dialog-list {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 16px;
  margin: 0;
}
.dsh-cost-dialog-list dt { min-width: 0; color: var(--dsw-alias-label-secondary); }
.dsh-cost-dialog-list dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.dsh-cost-dialog-note {
  margin-top: 10px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1.4;
}
@keyframes dsh-cost-dialog-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-cost-dialog { animation: none; }
}
.dsh-usage-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 -2px;
  padding: 1px 5px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm);
}
@media (hover: hover) {
  .dsh-usage-pill:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.dsh-usage-pill:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);
  outline-offset: 1px;
}
.dsh-usage-pill-error { color: var(--dsw-alias-state-error-primary); }
.dsh-usage-ring { flex: none; }
.dsh-usage-ring-track { stroke: var(--dsw-alias-border-l3); }
.dsh-usage-ring-fill { stroke: var(--dsw-alias-state-success-primary); }
.dsh-usage-ring-warn .dsh-usage-ring-fill { stroke: var(--dsw-alias-state-warn-label); }
.dsh-usage-ring-danger .dsh-usage-ring-fill { stroke: var(--dsw-alias-state-error-primary); }
.dsh-usage-dialog {
  position: fixed;
  z-index: 120;
  box-sizing: border-box;
  width: min(360px, calc(100vw - 24px));
  padding: 12px 14px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
  background: var(--dsw-alias-bg-layer-1);
  border-radius: var(--dsw-radius-lg);
  box-shadow: var(--dsw-elevation-panel);
  animation: dsh-cost-dialog-in 0.12s ease-out;
}
.dsh-usage-dialog-head { display: flex; align-items: center; gap: 8px; }
.dsh-usage-dialog-title { font-weight: 600; }
.dsh-usage-plan {
  padding: 1px 6px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-xs);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
}
.dsh-usage-refresh {
  margin-left: auto;
  padding: 2px 8px;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
  cursor: pointer;
}
@media (hover: hover) {
  .dsh-usage-refresh:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.dsh-usage-dialog-sub { margin-top: 2px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-usage-error { margin-top: 10px; }
.dsh-usage-error-title { color: var(--dsw-alias-state-error-primary); font-weight: 600; font-size: 12px; }
.dsh-usage-error-text { margin-top: 2px; color: var(--dsw-alias-label-tertiary); font-size: 11px; word-break: break-word; }
.dsh-usage-cards { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.dsh-usage-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-skeleton);
  border-radius: var(--dsw-radius-md);
  animation: dsh-usage-card-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.dsh-usage-card:nth-child(2) { animation-delay: 0.05s; }
.dsh-usage-card:nth-child(3) { animation-delay: 0.1s; }
@keyframes dsh-usage-card-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
.dsh-usage-card-body { min-width: 0; }
.dsh-usage-card-title { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-usage-card-value { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dsh-usage-card-value-large { font-size: 18px; }
.dsh-usage-card-note { color: var(--dsw-alias-label-tertiary); font-size: 11px; font-variant-numeric: tabular-nums; }
.dsh-usage-section-title { margin-top: 12px; color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 500; }
.dsh-usage-chart { margin-top: 4px; }
.dsh-usage-chart svg { display: block; width: 100%; height: auto; }
.dsh-usage-axis { stroke: var(--dsw-alias-border-l2); stroke-width: 1; }
.dsh-usage-axis-label { fill: var(--dsw-alias-label-tertiary); font-size: 8px; font-variant-numeric: tabular-nums; }
.dsh-usage-bar { shape-rendering: crispEdges; }
.dsh-usage-bar-five { fill: var(--dsw-alias-state-success-primary); }
.dsh-usage-bar-week { fill: var(--dsw-alias-brand-primary-new-colorprimary-new-color); }
.dsh-usage-legend { display: flex; gap: 12px; margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 10px; }
.dsh-usage-legend-item { display: inline-flex; align-items: center; gap: 4px; }
.dsh-usage-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.dsh-usage-dot-five { background: var(--dsw-alias-state-success-primary); }
.dsh-usage-dot-week { background: var(--dsw-alias-brand-primary-new-colorprimary-new-color); }
.dsh-usage-empty { margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-usage-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
`

    function installStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = `style[data-dsh-plugin-css="${STYLE_ID}"]`
      const existing = document.querySelector(selector)
      if (existing !== null) {
        // A hot-reloaded bundle keeps the old style tag in the document; refresh
        // its rules so a changed animation/layout never silently stays stale.
        existing.textContent = CSS
        return () => {
          existing.remove()
        }
      }
      const tag = document.createElement('style')
      tag.dataset.dshPluginCss = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => {
        tag.remove()
      }
    }

    function CoinIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 8, cy: 8, r: 6.4, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('path', { d: 'M8 4.4v7.2', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
        h('path', {
          d: 'M6.1 6.3c0-.9.9-1.5 1.9-1.5s1.9.6 1.9 1.5-.9 1.5-1.9 1.5-1.9.6-1.9 1.5.9 1.6 1.9 1.6 1.9-.7 1.9-1.6',
          stroke: 'currentColor',
          strokeWidth: 1.1,
          strokeLinecap: 'round',
        }),
      )
    }

    function turnNumber(turn) {
      if (typeof turn === 'number' && Number.isFinite(turn)) return turn
      if (turn && typeof turn === 'object' && typeof turn.turn === 'number' && Number.isFinite(turn.turn)) return turn.turn
      return undefined
    }

    function usageTokens(usage) {
      if (!usage) return 0
      if (typeof usage.totalTokens === 'number' && Number.isFinite(usage.totalTokens)) return usage.totalTokens
      return (
        (Number(usage.uncachedInputTokens) || 0) +
        (Number(usage.cacheReadTokens) || 0) +
        (Number(usage.cacheWriteTokens) || 0) +
        (Number(usage.outputTokens) || 0)
      )
    }

    function interpolate(text, params) {
      return String(text).replace(/\{(\w+)\}/g, (match, name) =>
        params && params[name] !== undefined ? String(params[name]) : match,
      )
    }

    const NO_USAGE = () => undefined

    /**
     * Session-wide estimated cost pill in the composer dock. Clicking it opens
     * the cache/input/output breakdown, mirroring the shipped statistics pills.
     * Props: the declaring owner passes the standard `t` and `useProjection`.
     */
    function CostPill(props) {
      const useProjection = typeof props.useProjection === 'function' ? props.useProjection : NO_USAGE
      const t = typeof props.t === 'function' ? props.t : (key, params) => interpolate(en[key] || key, params)
      const usage = useProjection('tokenUsage')
      // Read the last-used route unconditionally: hooks must keep a stable
      // order even while the usage projection is still empty on first render.
      const selection = useProjection('modelSelection')
      const [open, setOpen] = React.useState(false)
      const [anchor, setAnchor] = React.useState(null)
      const buttonRef = React.useRef(null)
      const panelRef = React.useRef(null)

      React.useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        const onPointerDown = (event) => {
          const panel = panelRef.current
          const button = buttonRef.current
          const target = event.target
          if (panel !== null && panel.contains(target)) return
          if (button !== null && button.contains(target)) return
          setOpen(false)
        }
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown)
          document.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [open])

      if (!usage) return null
      // The session projection carries no model, so price with the model the
      // Session last ran on; unknown/free providers then still resolve through
      // the CommandCode table or the flagged Flash estimate.
      const lastUsed = selection && typeof selection === 'object' ? selection.lastUsed : undefined
      const rates = ratesFor(lastUsed && lastUsed.model, lastUsed && lastUsed.provider, Date.now())
      const total = costOfUsage(usage, rates)
      const hit = cacheHitPercent(usage)
      const rateLabel = rateLabelOf(t, rates)
      const totalText = formatEur(total)
      const tooltip = t('pill.tooltip', { cost: totalText, hit: hit === null ? '–' : hit, rate: rateLabel })
      const parts = [
        { key: 'cacheInput', tokens: Number(usage.cacheReadTokens) || 0, usd: ((Number(usage.cacheReadTokens) || 0) * rates.cacheHit) / 1e6 },
        { key: 'uncachedInput', tokens: Number(usage.uncachedInputTokens) || 0, usd: ((Number(usage.uncachedInputTokens) || 0) * rates.cacheMiss) / 1e6 },
        { key: 'output', tokens: Number(usage.outputTokens) || 0, usd: ((Number(usage.outputTokens) || 0) * rates.output) / 1e6 },
      ]
      const cacheWriteTokens = Number(usage.cacheWriteTokens) || 0
      if (cacheWriteTokens > 0) {
        parts.push({ key: 'cacheWrite', tokens: cacheWriteTokens, usd: (cacheWriteTokens * rates.cacheWrite) / 1e6 })
      }

      function toggle() {
        if (!open) {
          const rect = buttonRef.current === null ? null : buttonRef.current.getBoundingClientRect()
          setAnchor(
            rect === null
              ? { right: 16, bottom: 96 }
              : { right: Math.max(8, window.innerWidth - rect.right), bottom: Math.max(8, window.innerHeight - rect.top + 8) },
          )
        }
        setOpen(!open)
      }

      const button = h(
        'button',
        {
          ref: buttonRef,
          type: 'button',
          className: 'dsh-cost-pill',
          'data-composer-stat': 'cost',
          title: tooltip,
          'aria-label': t('pill.aria', { cost: totalText }),
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          onClick: toggle,
        },
        h(CoinIcon),
        h('span', { className: 'dsh-cost-pill-label' }, t('pill.label', { cost: totalText })),
      )

      const dialog = !open
        ? null
        : ReactDOM.createPortal(
            h(
              'div',
              {
                ref: panelRef,
                className: 'dsh-cost-dialog',
                role: 'dialog',
                'aria-label': t('dialog.title'),
                style: anchor === null ? undefined : { right: `${anchor.right}px`, bottom: `${anchor.bottom}px` },
              },
              h(
                'div',
                { className: 'dsh-cost-dialog-head' },
                h('span', { className: 'dsh-cost-dialog-title' }, t('dialog.title')),
                h('span', { className: 'dsh-cost-dialog-total' }, totalText),
              ),
              h('div', { className: 'dsh-cost-dialog-sep' }),
              h(
                'dl',
                { className: 'dsh-cost-dialog-list' },
                parts.map((part) =>
                  h(
                    React.Fragment,
                    { key: part.key },
                    h('dt', null, t(`dialog.${part.key}`)),
                    h('dd', null, formatEur(part.usd)),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'dsh-cost-dialog-note' },
                t('dialog.note', {
                  rate: rateLabel,
                  fx: formatFx(EUR_PER_USD),
                  date: FX_DATE,
                }),
              ),
            ),
            document.body,
          )

      return h(React.Fragment, null, button, dialog)
    }

    /**
     * Per-Turn estimated cost row at the end of a completed Turn.
     *
     * The entry receives the Location's Turn object and the standard session
     * kit: `turn.data.get('turn-tail')` carries the finished Turn's accounting,
     * and `useChat` keeps the row live while the Turn settles.
     */
    function CostRow(props) {
      const t = typeof props.t === 'function' ? props.t : (key, params) => interpolate(en[key] || key, params)
      const useChat = typeof props.useChat === 'function' ? props.useChat : NO_USAGE
      const turn = props.turn
      const number = turnNumber(turn)
      const fromChat = useChat((snapshot) => {
        if (number === undefined || snapshot === undefined || snapshot === null) return undefined
        const turns = snapshot.timeline === undefined || snapshot.timeline === null ? undefined : snapshot.timeline.turns
        const record = turns === undefined || turns === null || typeof turns.get !== 'function' ? undefined : turns.get(number)
        if (record === undefined || record === null) return undefined
        const data = record.data
        if (data === undefined || data === null || typeof data.get !== 'function') return undefined
        return data.get('turn-tail')
      })
      const fallback =
        turn !== null && typeof turn === 'object' && turn.data !== undefined && typeof turn.data.get === 'function'
          ? turn.data.get('turn-tail')
          : undefined
      const data = fromChat === undefined ? fallback : fromChat
      const usage = data === undefined || data === null ? undefined : data.tokenUsage
      if (usage === undefined) return null
      const time = data !== null && Number.isFinite(data.time) ? data.time : Date.now()
      const priced = turnCost(usage, time)
      const hit = cacheHitPercent(usage)
      const tokens = formatTokens(usageTokens(usage))
      const rates = priced.rates ?? ratesFor(priced.model, undefined, time)
      const rateLabel = rateLabelOf(t, rates)
      const tooltip = t('row.tooltip', {
        cost: formatEur(priced.cost),
        tokens,
        hit: hit === null ? '–' : hit,
        rate: rateLabel,
      })
      return h(
        'div',
        { className: 'dsh-cost-row', 'data-dsh-cost-row': String(number === undefined ? props.seq : number), title: tooltip },
        h('span', { className: 'dsh-cost-row-cost' }, t('row.label', { cost: formatEur(priced.cost) })),
        h('span', { className: 'dsh-cost-row-sep', 'aria-hidden': true }, '·'),
        h('span', { className: 'dsh-cost-row-tokens' }, t('row.tokens', { tokens })),
        hit === null
          ? null
          : h('span', { className: 'dsh-cost-row-sep', 'aria-hidden': true }, '·'),
        hit === null ? null : h('span', { className: 'dsh-cost-row-cache' }, t('row.cache', { hit })),
      )
    }

    // ---------------------------------------------------------------------
    // CommandCode account usage meter. The Host half resolves the API key and
    // serves `GET /api/commandcode-usage`; this half polls it, shows a small
    // remaining-usage gauge in the composer dock and renders the charts.
    // ---------------------------------------------------------------------
    const USAGE_ENDPOINT = 'api/commandcode-usage'
    const USAGE_POLL_MS = 60_000
    const USAGE_HISTORY_KEY = 'dsh-cost-display/usage-history.v1'
    const USAGE_HISTORY_LIMIT = 240

    /** Format a USD amount in German decimal notation with a trailing sign. */
    function formatUsdAmount(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '–'
      const digits = Math.abs(amount) >= 100 ? 0 : Math.abs(amount) >= 1 ? 2 : 4
      return `${amount.toFixed(digits).replace('.', ',')} $`
    }

    function formatPercentValue(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '–'
      return `${Math.round(Math.max(0, Math.min(100, amount)))} %`
    }

    /** Human duration until a timestamp, in the plugin locale. */
    function formatDuration(t, milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) return t('usage.now')
      const minutes = Math.max(1, Math.ceil(milliseconds / 60000))
      if (minutes >= 2880) return t('usage.days', { days: Math.ceil(minutes / 1440) })
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return hours === 0 ? t('usage.minutes', { minutes }) : t('usage.hours', { hours, minutes: rest })
    }

    function clockText(time) {
      const date = new Date(Number(time))
      if (!Number.isFinite(date.getTime())) return '–'
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }

    function dateText(value) {
      const date = new Date(value)
      if (!Number.isFinite(date.getTime())) return '–'
      return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    /** Remaining credits across the three CommandCode wallets. */
    function remainingCredits(data) {
      const credits = data === undefined || data === null ? undefined : data.credits
      const wallets = credits === undefined || credits === null ? undefined : credits.credits
      if (wallets === undefined || wallets === null) return undefined
      const monthly = Number(wallets.monthlyCredits) || 0
      const purchased = Number(wallets.purchasedCredits) || 0
      const free = Number(wallets.freeCredits) || 0
      return { monthly, purchased, free, total: monthly + purchased + free }
    }

    /** Remaining share of one window limit (5-hour or weekly). */
    function windowRemaining(window) {
      if (window === undefined || window === null) return undefined
      const used = Number(window.used) || 0
      const cap = Number(window.cap)
      if (!Number.isFinite(cap) || cap <= 0) return undefined
      const remaining = Math.max(0, cap - used)
      return { used, cap, remaining, percent: (remaining / cap) * 100 }
    }

    function planName(planId) {
      if (typeof planId !== 'string' || planId === '') return undefined
      if (/goat/i.test(planId)) return 'GOAT'
      if (/max/i.test(planId)) return 'Max'
      if (/pro/i.test(planId)) return 'Pro'
      if (/team/i.test(planId)) return 'Team'
      if (/go(?:al)?$/i.test(planId)) return 'Go'
      return planId
    }

    function readUsageHistory() {
      try {
        const raw = window.localStorage.getItem(USAGE_HISTORY_KEY)
        const parsed = raw === null ? [] : JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
          (sample) =>
            sample !== null &&
            typeof sample === 'object' &&
            Number.isFinite(sample.t) &&
            Number.isFinite(sample.five) &&
            Number.isFinite(sample.week),
        )
      } catch {
        return []
      }
    }

    function recordUsageHistory(five, week) {
      const history = readUsageHistory()
      const last = history[history.length - 1]
      if (last !== undefined && Date.now() - last.t < 30_000 && last.five === five && last.week === week) return history
      history.push({ t: Date.now(), five, week })
      const trimmed = history.slice(-USAGE_HISTORY_LIMIT)
      try {
        window.localStorage.setItem(USAGE_HISTORY_KEY, JSON.stringify(trimmed))
      } catch {
        /* private mode or a full quota: the meter still works without history */
      }
      return trimmed
    }

    /** Poll the Host usage route; a manual refresh bumps the nonce. */
    function useUsageSnapshot() {
      const [nonce, setNonce] = React.useState(0)
      const [state, setState] = React.useState({ status: 'loading', data: undefined, error: undefined, history: [] })
      React.useEffect(() => {
        let cancelled = false
        const load = async () => {
          try {
            const response = await fetch(USAGE_ENDPOINT, { headers: { accept: 'application/json' } })
            const body = await response.json().catch(() => undefined)
            if (!response.ok || body === undefined || body === null || typeof body !== 'object' || typeof body.error === 'string') {
              throw new Error(body !== null && typeof body === 'object' && typeof body.error === 'string' ? body.error : `HTTP ${String(response.status)}`)
            }
            if (cancelled) return
            const five = Number(body.credits?.windowLimits?.fiveHour?.used)
            const week = Number(body.credits?.windowLimits?.weekly?.used)
            const history = Number.isFinite(five) && Number.isFinite(week) ? recordUsageHistory(five, week) : readUsageHistory()
            setState({ status: 'ready', data: body, error: undefined, history })
          } catch (error) {
            if (cancelled) return
            setState((previous) => ({
              status: previous.data === undefined ? 'error' : 'ready',
              data: previous.data,
              error: error instanceof Error ? error.message : String(error),
              history: previous.history,
            }))
          }
        }
        load()
        const timer = setInterval(load, USAGE_POLL_MS)
        return () => {
          cancelled = true
          clearInterval(timer)
        }
      }, [nonce])
      return { ...state, refresh: () => setNonce((value) => value + 1) }
    }

    /**
     * Ease a value from zero to its target with requestAnimationFrame, so the
     * ring arc draws itself regardless of CSS transition support or a
     * reduced-motion preference.
     */
    function useGrowValue(value, durationMs = 900) {
      const [shown, setShown] = React.useState(0)
      React.useEffect(() => {
        let frame = 0
        const start = performance.now()
        const tick = (nowTime) => {
          const ratio = Math.min(1, (nowTime - start) / durationMs)
          const eased = 1 - Math.pow(1 - ratio, 3)
          setShown(value * eased)
          if (ratio < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
      }, [value, durationMs])
      return shown
    }

    /**
     * Eased 0 → 1 progress over `durationMs`. Driving the bar chart from
     * JavaScript (instead of a CSS keyframe) keeps the animation running even
     * where a reduced-motion preference would suppress CSS animations.
     */
    function useProgress(durationMs) {
      const [progress, setProgress] = React.useState(0)
      React.useEffect(() => {
        let frame = 0
        const start = performance.now()
        const tick = (nowTime) => {
          const ratio = Math.min(1, (nowTime - start) / durationMs)
          setProgress(1 - Math.pow(1 - ratio, 3))
          if (ratio < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
      }, [durationMs])
      return progress
    }

    /** Remaining-usage ring; the arc length is the remaining share. */
    function UsageRing({ percent: share, size }) {
      const radius = (size - 4) / 2
      const circumference = 2 * Math.PI * radius
      const target = Math.max(0, Math.min(100, Number.isFinite(share) ? share : 0))
      const clamped = useGrowValue(target)
      const filled = (clamped / 100) * circumference
      const tone = target <= 15 ? 'danger' : target <= 40 ? 'warn' : 'ok'
      const center = size / 2
      return h(
        'svg',
        { className: `dsh-usage-ring dsh-usage-ring-${tone}`, width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': true },
        h('circle', { className: 'dsh-usage-ring-track', cx: center, cy: center, r: radius, fill: 'none', strokeWidth: 3 }),
        h('circle', {
          className: 'dsh-usage-ring-fill',
          cx: center,
          cy: center,
          r: radius,
          fill: 'none',
          strokeWidth: 3,
          strokeLinecap: 'round',
          strokeDasharray: `${filled} ${circumference - filled}`,
          transform: `rotate(-90 ${center} ${center})`,
        }),
      )
    }

    /**
     * Turn the recorded absolute window counters into per-interval spending.
     * A decrease means the window reset, which contributes no spend.
     */
    function usageSpending(history) {
      const spending = []
      for (let index = 1; index < history.length; index += 1) {
        const previous = history[index - 1]
        const current = history[index]
        if (!(current.t > previous.t)) continue
        spending.push({
          t: current.t,
          five: Math.max(0, current.five - previous.five),
          week: Math.max(0, current.week - previous.week),
        })
      }
      return spending.slice(-40)
    }

    /**
     * Per-interval spend chart. Absolute counters move only by cents, so a
     * cumulative line looks like a dead flat line; grouped bars of the delta
     * between two samples show the actual usage pulses. An idle window is
     * reported as text instead of pretending the flat bars are a chart.
     */
    function UsageHistoryChart({ history, t, now }) {
      const progress = useProgress(900)
      const spending = usageSpending(history)
      if (spending.length < 2) return h('div', { className: 'dsh-usage-empty' }, t('usage.history.hint'))
      const total = spending.reduce((sum, item) => sum + item.five + item.week, 0)
      const span = Math.max(1, now - spending[0].t)
      if (!(total > 1e-9)) {
        return h('div', { className: 'dsh-usage-empty' }, t('usage.history.idle', { duration: formatDuration(t, span) }))
      }
      let maxValue = 0
      for (let index = 0; index < spending.length; index += 1) {
        maxValue = Math.max(maxValue, spending[index].five, spending[index].week)
      }
      maxValue = Math.max(maxValue, 0.0001)
      const width = 300
      const plotLeft = 4
      const plotRight = 296
      const baseLine = 74
      const plotHeight = 60
      const slot = (plotRight - plotLeft) / spending.length
      const barWidth = Math.max(1.4, slot * 0.3)
      const fullHeight = (value) => (value / maxValue) * plotHeight
      const bars = []
      const last = Math.max(1, spending.length - 1)
      const stagger = 0.5
      for (let index = 0; index < spending.length; index += 1) {
        const item = spending[index]
        const offset = (index / last) * stagger
        const local = Math.max(0, Math.min(1, (progress - offset) / (1 - offset)))
        const left = plotLeft + slot * index + slot * 0.15
        const fiveHeight = fullHeight(item.five) * local
        const weekHeight = fullHeight(item.week) * local
        bars.push(h('rect', {
          key: `f${String(index)}`,
          className: 'dsh-usage-bar dsh-usage-bar-five',
          x: left,
          y: baseLine - fiveHeight,
          width: barWidth,
          height: Math.max(0, fiveHeight),
        }))
        bars.push(h('rect', {
          key: `w${String(index)}`,
          className: 'dsh-usage-bar dsh-usage-bar-week',
          x: left + barWidth + 0.8,
          y: baseLine - weekHeight,
          width: barWidth,
          height: Math.max(0, weekHeight),
        }))
      }
      return h(
        'div',
        { className: 'dsh-usage-chart' },
        h(
          'svg',
          { viewBox: `0 0 ${width} 88`, role: 'img', 'aria-label': t('usage.history.title') },
          h('line', { x1: plotLeft, y1: baseLine, x2: plotRight, y2: baseLine, className: 'dsh-usage-axis' }),
          h('text', { x: plotLeft, y: baseLine - plotHeight - 2, className: 'dsh-usage-axis-label' }, formatUsdAmount(maxValue)),
          h('text', { x: plotLeft, y: 86, className: 'dsh-usage-axis-label' }, t('usage.history.ago', { duration: formatDuration(t, span) })),
          h('text', { x: plotRight, y: 86, textAnchor: 'end', className: 'dsh-usage-axis-label' }, t('usage.history.now')),
          bars,
        ),
        h(
          'div',
          { className: 'dsh-usage-legend' },
          h('span', { className: 'dsh-usage-legend-item' }, h('i', { className: 'dsh-usage-dot dsh-usage-dot-five' }), t('usage.history.fiveHour')),
          h('span', { className: 'dsh-usage-legend-item' }, h('i', { className: 'dsh-usage-dot dsh-usage-dot-week' }), t('usage.history.weekly')),
        ),
      )
    }

    /**
     * CommandCode account usage meter: a remaining-usage ring and the credit
     * balance in the composer dock, opening a chart panel with both window
     * limits, the wallet breakdown and the recorded usage history.
     */
    function UsageMeter(props) {
      const t = typeof props.t === 'function' ? props.t : (key, params) => interpolate(en[key] || key, params)
      const snapshot = useUsageSnapshot()
      const [open, setOpen] = React.useState(false)
      const [anchor, setAnchor] = React.useState(null)
      const buttonRef = React.useRef(null)
      const panelRef = React.useRef(null)

      React.useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        const onPointerDown = (event) => {
          const panel = panelRef.current
          const button = buttonRef.current
          const target = event.target
          if (panel !== null && panel.contains(target)) return
          if (button !== null && button.contains(target)) return
          setOpen(false)
        }
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown)
          document.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [open])

      function toggle() {
        if (!open) {
          const rect = buttonRef.current === null ? null : buttonRef.current.getBoundingClientRect()
          setAnchor(
            rect === null
              ? { left: 16, bottom: 96 }
              : { left: Math.max(8, rect.left), bottom: Math.max(8, window.innerHeight - rect.top + 8) },
          )
        }
        setOpen(!open)
      }

      const data = snapshot.data
      const credits = remainingCredits(data)
      const five = windowRemaining(data?.credits?.windowLimits?.fiveHour)
      const week = windowRemaining(data?.credits?.windowLimits?.weekly)
      const shares = [five?.percent, week?.percent].filter((value) => Number.isFinite(value))
      const gauge = shares.length === 0 ? 0 : Math.min(...shares)
      const plan = planName(data?.subscription?.data?.planId)
      const resetFive = data?.credits?.windowLimits?.fiveHour?.resetAt
      const resetWeek = data?.credits?.windowLimits?.weekly?.resetAt
      const periodEnd = data?.subscription?.data?.currentPeriodEnd
      const summary = data?.summary
      const unavailable = snapshot.status === 'error'
      const pillText = unavailable ? '–' : credits === undefined ? '…' : formatUsdAmount(credits.total)
      const tooltip = unavailable
        ? t('usage.error.title')
        : t('usage.pill.title', {
            credits: credits === undefined ? '–' : formatUsdAmount(credits.total),
            five: five === undefined ? '–' : formatPercentValue(five.percent),
            week: week === undefined ? '–' : formatPercentValue(week.percent),
          })

      const button = h(
        'button',
        {
          ref: buttonRef,
          type: 'button',
          className: `dsh-usage-pill${unavailable ? ' dsh-usage-pill-error' : ''}`,
          title: tooltip,
          'aria-label': t('usage.pill.aria'),
          'aria-haspopup': 'dialog',
          'aria-expanded': open ? 'true' : 'false',
          onClick: toggle,
        },
        h(UsageRing, { percent: gauge, size: 14 }),
        h('span', { className: 'dsh-usage-pill-label' }, pillText),
      )

      function windowCard(window, resetAt, titleKey, key) {
        if (window === undefined) return null
        return h(
          'section',
          { className: 'dsh-usage-card', key },
          h(UsageRing, { percent: window.percent, size: 48 }),
          h(
            'div',
            { className: 'dsh-usage-card-body' },
            h('div', { className: 'dsh-usage-card-title' }, t(titleKey)),
            h('div', { className: 'dsh-usage-card-value' }, t('usage.remaining', { amount: formatUsdAmount(window.remaining) })),
            h('div', { className: 'dsh-usage-card-note' }, t('usage.used', { used: formatUsdAmount(window.used), cap: formatUsdAmount(window.cap) })),
            Number.isFinite(Number(resetAt))
              ? h('div', { className: 'dsh-usage-card-note' }, t('usage.reset', { duration: formatDuration(t, Number(resetAt) - Date.now()) }))
              : null,
          ),
        )
      }

      const dialog = !open
        ? null
        : ReactDOM.createPortal(
            h(
              'div',
              {
                ref: panelRef,
                className: 'dsh-usage-dialog',
                role: 'dialog',
                'aria-label': t('usage.dialog.title'),
                style: anchor === null ? undefined : { left: `${anchor.left}px`, bottom: `${anchor.bottom}px` },
              },
              h(
                'div',
                { className: 'dsh-usage-dialog-head' },
                h('span', { className: 'dsh-usage-dialog-title' }, t('usage.dialog.title')),
                plan === undefined ? null : h('span', { className: 'dsh-usage-plan' }, plan),
                h(
                  'button',
                  { type: 'button', className: 'dsh-usage-refresh', onClick: snapshot.refresh, title: t('usage.dialog.refresh') },
                  t('usage.dialog.refresh'),
                ),
              ),
              h(
                'div',
                { className: 'dsh-usage-dialog-sub' },
                data === undefined
                  ? t('usage.loading')
                  : t('usage.dialog.updated', { time: clockText(data.fetchedAt) }),
              ),
              unavailable
                ? h(
                    'div',
                    { className: 'dsh-usage-error' },
                    h('div', { className: 'dsh-usage-error-title' }, t('usage.error.title')),
                    h('div', { className: 'dsh-usage-error-text' }, snapshot.error),
                  )
                : h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'dsh-usage-cards' },
                      windowCard(five, resetFive, 'usage.window.fiveHour', 'five'),
                      windowCard(week, resetWeek, 'usage.window.weekly', 'week'),
                      credits === undefined
                        ? null
                        : h(
                            'section',
                            { className: 'dsh-usage-card dsh-usage-card-credits', key: 'credits' },
                            h(
                              'div',
                              { className: 'dsh-usage-card-body' },
                              h('div', { className: 'dsh-usage-card-title' }, t('usage.credits.title')),
                              h('div', { className: 'dsh-usage-card-value dsh-usage-card-value-large' }, formatUsdAmount(credits.total)),
                              h(
                                'div',
                                { className: 'dsh-usage-card-note' },
                                t('usage.wallet.breakdown', {
                                  monthly: formatUsdAmount(credits.monthly),
                                  purchased: formatUsdAmount(credits.purchased),
                                  free: formatUsdAmount(credits.free),
                                }),
                              ),
                              periodEnd === undefined
                                ? null
                                : h('div', { className: 'dsh-usage-card-note' }, t('usage.billing', { date: dateText(periodEnd) })),
                            ),
                          ),
                    ),
                    h('div', { className: 'dsh-usage-section-title' }, t('usage.history.title')),
                    h(UsageHistoryChart, {
                      key: `usage-chart-${String(data === undefined ? 0 : data.fetchedAt ?? 0)}`,
                      history: snapshot.history,
                      t,
                      now: Date.now(),
                    }),
                    summary === undefined
                      ? null
                      : h(
                          'div',
                          { className: 'dsh-usage-stats' },
                          h('span', null, t('usage.period.cost', { amount: formatUsdAmount(summary.totalCost) })),
                          h('span', null, t('usage.period.tokens', { tokens: formatTokens(summary.totalTokens) })),
                          h('span', null, t('usage.period.requests', { count: Number(summary.totalCount || 0).toLocaleString() })),
                          h('span', null, t('usage.period.success', { percent: Math.round(Number(summary.successRate) || 0) })),
                        ),
                  ),
            ),
            document.body,
          )

      return h(React.Fragment, null, button, dialog)
    }

    /**
     * Empty occupant for the two sidebar brand slots. The user asked for the
     * DeepSeek Harness wordmark and whale mark to be hidden: a `single` slot
     * renders its lowest-priority occupant first, so priority -1 beats the
     * official brand package (priority 0) and suppresses the shell fallback.
     * The sidebar keeps its layout, its session toggle and its tooltips.
     */
    function EmptyBrand() {
      return null
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, 'en', en), 'cost-display: en dictionary')
      ctx.effect(() => ctx.locale.register(NS, 'de', de), 'cost-display: de dictionary')
      ctx.effect(installStyles, 'cost-display: styles')
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.brand.mark', () =>
            ctx.slots.register({ name: 'sidebar.brand.mark', priority: -1 }, EmptyBrand),
          ),
        'cost-display: hide sidebar brand mark',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.brand.name', () =>
            ctx.slots.register({ name: 'sidebar.brand.name', priority: -1 }, EmptyBrand),
          ),
        'cost-display: hide sidebar brand name',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('conversation.composer.dock', () =>
            ctx.slots.register(
              {
                name: 'conversation.composer.dock',
                id: `${PACKAGE}:usage-meter`,
                order: -1,
                locale: NS,
              },
              UsageMeter,
            ),
          ),
        'cost-display: composer usage meter',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('conversation.composer.dock', () =>
            ctx.slots.register(
              {
                name: 'conversation.composer.dock',
                id: `${PACKAGE}:session`,
                order: 2,
                locale: NS,
              },
              CostPill,
            ),
          ),
        'cost-display: composer dock pill',
      )
      ctx.effect(
        () =>
          ctx.slots.inject('conversation.chat.turnTail', () =>
            ctx.slots.register(
              {
                name: 'conversation.chat.turnTail',
                id: `${PACKAGE}:turn`,
                locale: NS,
              },
              CostRow,
            ),
          ),
        'cost-display: turn tail row',
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
