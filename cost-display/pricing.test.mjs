import assert from 'node:assert/strict'
import {
  COMMANDCODE_RATES,
  costOfTurnUsage,
  costOfUsage,
  formatTokens,
  formatUsd,
  isPeak,
  modelKey,
  normalizeModelId,
  ratesFor,
  cacheHitPercent,
} from './pricing.js'

// 2026-11-02 is a Monday.
const MONDAY_PEAK = Date.UTC(2026, 10, 2, 7, 0, 0) // 07:00 UTC Monday -> peak
const MONDAY_OFF = Date.UTC(2026, 10, 2, 12, 0, 0) // 12:00 UTC Monday -> off-peak
const SUNDAY = Date.UTC(2026, 10, 8, 7, 0, 0) // Sunday -> off-peak

assert.equal(new Date(MONDAY_PEAK).getUTCDay(), 1)
assert.equal(isPeak(MONDAY_PEAK), true)
assert.equal(isPeak(MONDAY_OFF), false)
assert.equal(isPeak(SUNDAY), false)

// --- official DeepSeek provider ------------------------------------------
const peak = ratesFor('deepseek-flash', 'deepseek-account', MONDAY_PEAK)
const off = ratesFor('deepseek-flash', 'deepseek-account', MONDAY_OFF)
assert.deepEqual([peak.cacheHit, peak.cacheMiss, peak.output], [0.006, 0.3, 1.2])
assert.deepEqual([off.cacheHit, off.cacheMiss, off.output], [0.003, 0.15, 0.6])
assert.equal(peak.estimated, false)

// 1M of each bucket, flash peak.
const million = { uncachedInputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 1e6 }
assert.equal(Math.round(costOfUsage(million, peak) * 1e6) / 1e6, 0.3 + 0.006 + 1.2)

// A realistic turn: 1200 uncached, 8800 cache hits, 400 output at peak flash.
const turn = { uncachedInputTokens: 1200, cacheReadTokens: 8800, outputTokens: 400, cacheWriteTokens: 0 }
const peakTurn = costOfTurnUsage({ ...turn, routes: [{ provider: 'deepseek-account', model: 'deepseek-flash' }] }, MONDAY_PEAK)
assert.equal(peakTurn.cost > 0, true)
// 1200*0.3 + 8800*0.006 + 400*1.2 = 360 + 52.8 + 480 = 892.8 -> /1e6
assert.ok(Math.abs(peakTurn.cost - 0.0008928) < 1e-12, String(peakTurn.cost))
const offTurn = costOfTurnUsage({ ...turn, routes: [{ provider: 'deepseek-account', model: 'deepseek-flash' }] }, MONDAY_OFF)
assert.equal(offTurn.cost, peakTurn.cost / 2)

// Legacy alias and Anthropic-endpoint aliasing on the official route.
assert.equal(modelKey('deepseek-chat', 'deepseek-account').id, 'deepseek-flash')
assert.equal(modelKey('claude-opus-4-6', 'deepseek-account').id, 'deepseek-v4-pro')

// --- CommandCode custom provider ----------------------------------------
assert.equal(normalizeModelId('deepseek/deepseek-v4.1-flash'), 'deepseek-v4.1-flash')
assert.deepEqual(modelKey('deepseek/deepseek-v4.1-flash', 'commandcode'), {
  kind: 'commandcode',
  entry: COMMANDCODE_RATES['deepseek/deepseek-v4.1-flash'],
})
assert.equal(modelKey('z-ai/glm-5.3-flash', 'commandcode').kind, 'commandcode')

// CommandCode DeepSeek models mirror DeepSeek's peak/off-peak rates.
const ccPeak = ratesFor('deepseek/deepseek-v4.1-flash', 'commandcode', MONDAY_PEAK)
const ccOff = ratesFor('deepseek/deepseek-v4.1-flash', 'commandcode', MONDAY_OFF)
assert.deepEqual([ccPeak.cacheMiss, ccPeak.output, ccPeak.cacheHit], [0.3, 1.2, 0.006])
assert.deepEqual([ccOff.cacheMiss, ccOff.output, ccOff.cacheHit], [0.15, 0.6, 0.003])
assert.equal(ccPeak.estimated, false)

// Flat CommandCode routes do not follow DeepSeek's peak window.
const glmPeak = ratesFor('z-ai/glm-5.3-flash', 'commandcode', MONDAY_PEAK)
const glmOff = ratesFor('z-ai/glm-5.3-flash', 'commandcode', MONDAY_OFF)
assert.deepEqual([glmPeak.cacheMiss, glmPeak.output, glmPeak.cacheHit], [0.15, 0.5, 0.03])
assert.deepEqual([glmPeak.cacheMiss, glmPeak.output, glmPeak.cacheHit], [glmOff.cacheMiss, glmOff.output, glmOff.cacheHit])

// Free CommandCode routes bill nothing but still price.
const free = ratesFor('reflection/beam:free', 'commandcode', MONDAY_PEAK)
assert.equal(free.free, true)
const freeTurn = costOfTurnUsage({ ...turn, routes: [{ provider: 'commandcode', model: 'reflection/beam:free' }] }, MONDAY_PEAK)
assert.equal(freeTurn.cost, 0)

// A CommandCode turn prices instead of collapsing to a zero "unknown" cost.
const ccTurn = costOfTurnUsage({ ...turn, routes: [{ provider: 'commandcode', model: 'deepseek/deepseek-v4.1-flash' }] }, MONDAY_PEAK)
assert.ok(Math.abs(ccTurn.cost - 0.0008928) < 1e-12, String(ccTurn.cost))

// Unknown models estimate with the flagged Flash fallback instead of freezing at zero.
const unpriced = costOfTurnUsage({ ...turn, routes: [{ provider: 'x', model: 'some-unknown-model' }] }, MONDAY_PEAK)
assert.equal(unpriced.cost > 0, true)
assert.equal(unpriced.rates.estimated, true)
assert.equal(COMMANDCODE_RATES['deepseek/deepseek-v4.1-flash'][4], 2)

// Formatting.
assert.equal(formatUsd(0.0008928), '$0.0009')
assert.equal(formatUsd(0.0123), '$0.012')
assert.equal(formatUsd(1.5), '$1.50')
assert.equal(formatTokens(358000), '358K')
assert.equal(formatTokens(1300000), '1.3M')
assert.equal(formatTokens(999), '999')
assert.equal(cacheHitPercent(turn), 88)

console.log('pricing self-test passed')
