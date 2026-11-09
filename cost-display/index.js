/**
 * Host half of the CommandCode cost/usage bundle.
 *
 * The browser cannot read the provider API key (credentials are write-only
 * across the wire), so this half resolves `COMMANDCODE_API_KEY` from the Host
 * credential seam and serves the account usage snapshot to the client:
 *
 *   GET /api/commandcode-usage
 *
 * The CommandCode "alpha" billing endpoints require a bearer key and a
 * non-default User-Agent (`cli`); a stock HTTP client user agent is answered
 * with Cloudflare 403 / error 1010. The route is registered through the
 * connection Fetch registry, so it keeps the browser-session authentication
 * and the Host/Origin fence of every other /api route.
 */

const API_BASE = 'https://api.commandcode.ai'
const USER_AGENT = 'cli'
const CREDENTIAL_REF = 'COMMANDCODE_API_KEY'
const CACHE_MS = 30_000
const TIMEOUT_MS = 20_000

/**
 * Read one JSON endpoint with the CommandCode-required headers.
 * @param {string} path endpoint path below the API base.
 * @param {string} key bearer credential.
 * @param {AbortSignal} signal request cancellation.
 * @returns {Promise<unknown>} decoded body.
 */
async function readEndpoint(path, key, signal) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      authorization: `Bearer ${key}`,
      'user-agent': USER_AGENT,
      accept: 'application/json',
    },
    signal,
  })
  if (!response.ok) throw new Error(`${path} answered HTTP ${String(response.status)}`)
  return response.json()
}

/**
 * Mount the usage route.
 * @param {object} ctx Host plugin context.
 */
export function apply(ctx) {
  ctx.inject(['connection', 'credentials'], (scope) => {
    /** @type {{ at: number, value: unknown } | undefined} */
    let cache
    let inflight

    async function snapshot() {
      const now = Date.now()
      if (cache !== undefined && now - cache.at < CACHE_MS) return cache.value
      if (inflight !== undefined) return inflight
      const credentials = scope.get('credentials')
      if (credentials === undefined) throw new Error('this composition mounts no credential provider')
      const resolved = await credentials.resolve(CREDENTIAL_REF)
      const key = resolved && typeof resolved.value === 'string' ? resolved.value.trim() : ''
      if (key === '') throw new Error(`credential ${CREDENTIAL_REF} is not configured`)
      const signal = AbortSignal.timeout(TIMEOUT_MS)
      inflight = (async () => {
        const [credits, summary, subscription] = await Promise.all([
          readEndpoint('/alpha/billing/credits', key, signal),
          readEndpoint('/alpha/usage/summary', key, signal),
          readEndpoint('/alpha/billing/subscriptions', key, signal),
        ])
        const value = { fetchedAt: Date.now(), credits, summary, subscription }
        cache = { at: Date.now(), value }
        return value
      })()
      try {
        return await inflight
      } finally {
        inflight = undefined
      }
    }

    scope.effect(
      () =>
        scope.connection.fetch.register({
          path: '/api/commandcode-usage',
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async () => {
            try {
              return Response.json(await snapshot(), { headers: { 'cache-control': 'no-store' } })
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              return Response.json({ error: message }, { status: 502, headers: { 'cache-control': 'no-store' } })
            }
          },
        }),
      'cost-display: /api/commandcode-usage',
    )
  })
}
