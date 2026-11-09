# DeepSeek API pricing (for per-request cost estimation)

Single source: **<https://api-docs.deepseek.com/quick_start/pricing/>** (English "Models & Pricing" page),
cross-checked against the Chinese mirror <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/>,
which lists the same rates in CNY.

## Second source: CommandCode Provider API

The custom provider `commandcode` is priced from its own published model table,
**<https://commandcode.ai/docs/resources/pricing-limits>** (read 2026-11-08). The
table is generated into `COMMANDCODE_RATES` (`[cache-miss input, output,
cache-read input, cache-write input, peak multiplier]`, USD per 1M tokens) and
covers all 96 model ids returned by `GET https://api.commandcode.ai/provider/v1/models`.

- DeepSeek models on CommandCode mirror the DeepSeek peak/off-peak rules above
  (e.g. `deepseek/deepseek-v4.1-flash` = $0.15 / $0.60 / $0.003 off-peak, doubled
  in the peak window), so they resolve to the same numbers.
- Every other CommandCode model bills a flat rate (for example
  `z-ai/glm-5.3-flash` = $0.15 / $0.50 / $0.03, `meta/muse-spark-1.3-contributor`
  = $0.10 / $0.20 / $0.002).
- `stealth/glyph-cluster:free`, `stealth/crouton-alpha` and `reflection/beam:free`
  are free; any id ending in `:free` prices at zero.
- Model ids arrive provider-prefixed (`deepseek/deepseek-v4.1-flash`); one
  namespace segment is stripped for lookup. Unknown ids outside the table fall
  back to the DeepSeek Flash estimate (flagged `estimated` in the tooltip) so the
  display keeps counting instead of freezing at `0,00 €`.

## Suggested price table (USD per 1M tokens)

Base numbers below are **PEAK** rates — the conservative upper bound for an estimate. Use the
`offPeak` block instead when the request timestamp falls outside peak hours (see below).

```json
{
  "deepseek-flash": {
    "cacheHitInputPerMTok": 0.006,
    "cacheMissInputPerMTok": 0.3,
    "outputPerMTok": 1.2
  },
  "deepseek-v4-pro": {
    "cacheHitInputPerMTok": 0.044,
    "cacheMissInputPerMTok": 1.32,
    "outputPerMTok": 3.96
  },
  "deepseek-v4-flash": {
    "cacheHitInputPerMTok": 0.006,
    "cacheMissInputPerMTok": 0.3,
    "outputPerMTok": 1.2
  },
  "deepseek-v4-flash-vision-exp": {
    "cacheHitInputPerMTok": 0.006,
    "cacheMissInputPerMTok": 0.3,
    "outputPerMTok": 1.2
  }
}
```

### Optional off-peak variant (half of the above)

```json
{
  "offPeak": {
    "deepseek-flash": {
      "cacheHitInputPerMTok": 0.003,
      "cacheMissInputPerMTok": 0.15,
      "outputPerMTok": 0.6
    },
    "deepseek-v4-pro": {
      "cacheHitInputPerMTok": 0.022,
      "cacheMissInputPerMTok": 0.66,
      "outputPerMTok": 1.98
    }
  }
}
```

### Verbatim source rows (EN)

> | MODEL | deepseek-flash(1) | deepseek-v4-pro |
> | --- | --- | --- |
> | MODEL VERSION | DeepSeek-V4.1-Flash-1017 | DeepSeek-V4-Pro-0813 |
> | PRICING(2) | 1M INPUT TOKENS (CACHE HIT) | OFF-PEAK | $0.003 | $0.022 |
> | PEAK | $0.006 | $0.044 |
> | 1M INPUT TOKENS (CACHE MISS) | OFF-PEAK | $0.15 | $0.66 |
> | PEAK | $0.3 | $1.32 |
> | 1M OUTPUT TOKENS | OFF-PEAK | $0.6 | $1.98 |
> | PEAK | $1.2 | $3.96 |

Footnote (2) verbatim:

> (2) Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC,
> Monday through Friday, excluding Chinese public holidays. All other hours are off-peak, including
> weekends and Chinese public holidays in full.

The CNY mirror shows the same table as 0.04 / 0.30 / 8.00 (flash peak) and 0.30 / 9.00 / 27.00
(v4-pro peak) per 1M tokens — consistent with USD, no separate USD/CNY product.

## Cache writes: no separate charge

**DeepSeek does not charge for cache writes or cache storage separately.** A cache-miss input token is
simply billed at the cache-miss rate, and the disk cache is constructed automatically as part of that
request. Evidence:

- The pricing page has exactly three line items per model (cache-hit input, cache-miss input, output).
  No "cache write", "cache storage", or "cache creation" row exists. <https://api-docs.deepseek.com/quick_start/pricing/>
- Context Caching guide: "Each user request will trigger the construction of a hard disk cache."
  No fee is mentioned anywhere; cache is "enabled by default for all users". <https://api-docs.deepseek.com/guides/kv_cache/>
- Anthropic-compatible endpoint explicitly reports `cache_creation_input_tokens` as **0**:
  "`input_tokens` excludes cache hits, `cache_read_input_tokens` reports cache hits, and
  `cache_creation_input_tokens` is currently `0`." <https://api-docs.deepseek.com/guides/anthropic_api/>

### Handling DSH's `cacheWriteTokens`

DSH usage samples carry `cacheReadTokens`, `cacheWriteTokens`, and uncached `inputTokens`.

- `cacheReadTokens` → bill at `cacheHitInputPerMTok`.
- `inputTokens` (uncached) → bill at `cacheMissInputPerMTok`.
- `cacheWriteTokens` → **bill at 0** (per the official docs above; writes are folded into the
  cache-miss input price). If you want a defensible upper bound, charge `cacheWriteTokens` at
  `cacheMissInputPerMTok` instead — worst case it over-estimates, never under-estimates. Do **not**
  invent an Anthropic-style 1.25× write multiplier; DeepSeek publishes no such rate.
- `reasoningTokens` is a **subset** of `outputTokens` on DeepSeek — do not add it on top of output,
  or you double-count. `outputTokens` alone × `outputPerMTok` is correct.

## Assumptions and confidence

- **As-of date: 2026-11-08.** Both pricing pages were fetched live on that date. The pages carry no
  explicit "last updated" stamp (footer reads "Copyright © 2026 DeepSeek, Inc."). The most recent
  documented price change is **2026-09-10** ("API prices have been reduced", V4.1-Flash release,
  <https://api-docs.deepseek.com/updates/>); peak/off-peak pricing took effect **2026-08-16 16:00 UTC**
  (<https://api-docs.deepseek.com/updates/>, 2026-08-13 entry). Confidence: **high**.
- **Pricing page URL:** <https://api-docs.deepseek.com/quick_start/pricing/>
- **`deepseek-flash` exists and is listed by name** — it is the primary Flash model id, currently
  served by `DeepSeek-V4.1-Flash-1017`. Confidence: **high**. It is column 1 of the pricing table.
  `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are legacy ids still accepted and "billed at
  the Flash price" (retired models, requests routed to V4.1-Flash-1017) — safe to map to flash pricing.
  `deepseek-chat` / `deepseek-reasoner` were discontinued 2026-07-24 and have **no** current price row.
- **Only two priced model ids exist in the 2026 lineup:** `deepseek-flash` and `deepseek-v4-pro`.
  (Confirmed by the pricing page and by `GET /models`, <https://api-docs.deepseek.com/api/list-models/>.)
- **Unknown model id:** return "unknown / not priced" rather than guessing. Suggested fallback order:
  1. exact id; 2. legacy aliases above → flash; 3. `claude-opus*` → `deepseek-v4-pro`, `claude-sonnet*`
     / `claude-haiku*` → `deepseek-flash` (these are the Anthropic-endpoint mappings,
     <https://api-docs.deepseek.com/guides/anthropic_api/>); 4. otherwise emit `null` cost and surface
     "unpriced model" in the UI. Confidence for the alias mapping: high; for anything else: none.
- **Off-peak discounts DO apply** and matter for an estimator: rates are **halved** off-peak. Peak =
  01:00–04:00 and 06:00–10:00 UTC, Mon–Fri, excluding Chinese public holidays; everything else
  (including all weekend hours) is off-peak. For a DSH user in Europe/Vienna (UTC+1/+2), a large share
  of the working day falls in the 06:00–10:00 UTC peak window, so the peak default is the honest one.
  Compute the window in **UTC** from the request timestamp — never from local time.
- **Currency:** USD on the EN page; the zh-CN page quotes CNY (0.04 / 0.30 / 8.00 per 1M for flash
  peak). Use USD.
- **Not token-priced (ignore for token cost):** Search and Fetch are billed per successful request at
  **$0.75 per 1,000 calls** each (<https://api-docs.deepseek.com/quick_start/pricing/>). Note: calls via
  server-side tools in DeepSeek Harness were free until **2026-10-31 16:00 UTC**, after which they are
  billed (<https://api-docs.deepseek.com/news/news261017/>). Exclude from a pure token estimate, or add
  a separate per-search line if the tool wants total request cost.
- **Balance/pricing API:** DeepSeek publishes a balance endpoint — `GET /user/balance`
  (<https://api-docs.deepseek.com/api/get-user-balance/>) returning `is_available`,
  `balance_infos[].currency` (`CNY`/`USD`), `total_balance`, `granted_balance`,
  `topped_up_balance` — and `GET /models` for model discovery
  (<https://api-docs.deepseek.com/api/list-models/>). **No machine-readable pricing endpoint exists**;
  prices must be hard-coded/refreshed from the docs page.

## Sources

- <https://api-docs.deepseek.com/quick_start/pricing/> — price table (USD, official)
- <https://api-docs.deepseek.com/zh-cn/quick_start/pricing/> — CNY mirror of same table
- <https://api-docs.deepseek.com/> — `deepseek-flash` / `deepseek-v4-pro` model ids, legacy alias note
- <https://api-docs.deepseek.com/guides/kv_cache/> — cache is auto-built, `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`
- <https://api-docs.deepseek.com/guides/anthropic_api/> — `cache_creation_input_tokens` currently 0; claude→DeepSeek model mapping
- <https://api-docs.deepseek.com/updates/> — price-change dates (2026-09-10, 2026-08-16 peak/off-peak start)
- <https://api-docs.deepseek.com/news/news261017/> — Search & Fetch billing start 2026-10-31 16:00 UTC
- <https://api-docs.deepseek.com/api/get-user-balance/> — balance API
- <https://api-docs.deepseek.com/api/list-models/> — model discovery API

All figures above come from these official DeepSeek pages; no third-party pricing source was used.
