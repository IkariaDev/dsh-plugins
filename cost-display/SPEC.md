# SPEC — DSH Web client extension points for a hand-written cost plugin

Reconstructed from the shipped asar (`…\resources\app.asar`) of the installed DSH 0.2.2-rc.1 desktop build.
Every claim below carries `FILE:LINE`. Anything not proven is in [§6](#6-not-proven--fallbacks).

## 0. Evidence base

Paths are the local extraction dir `C:\Users\besitzer\AppData\Local\Temp\dsh-recon\`; the asar-internal
path is given so any reader can re-extract with `asar-pkg.js`.

| Alias | Extracted file | asar path | What it is |
|---|---|---|---|
| `CONV` | `ui-conv\lib__client.js` (23145 L) | `/dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js` | declares `conversation.composer.dock`, owns Location/Turn/timeline |
| `CHAT` | `ui-chat\lib__client.js` (15589 L) | `/dsh/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js` | declares `conversation.chat.turnTail`, ships `UsagePill`/`ActivityPill`/`TurnTailNodeView` |
| `REND` | `dsh-client-ui-renderer\lib__client.js` (1884 L) | `…/@deepseek-ai/dsh-client-ui-renderer/lib/client.js` | the slot→React binder: **the authority on entry props** |
| `SESS` | `dsh-client-ui-session\lib__client.js` (1157 L) | `…/@deepseek-ai/dsh-client-ui-session/lib/client.js` | session-scope standard sources (`useProjection`, `sessionId`, …) |
| `SLOTS` | `webfront\assets__index-BgUyXZcc.js` (970 KB, minified) | `…/@deepseek-ai/dsh-web-frontend/dist/assets/index-BgUyXZcc.js` | static module table + minified `SlotCore` (ui-slots is **not** shipped as its own package; it is seeded statically into the web shell) |
| `MODS` | `client-modules\lib__client.js` (46 KB) | `…/@deepseek-ai/dsh-client-modules/lib/client.js` | `window.__ModuleLoader__` client half |
| `MODSH` | `client-modules\lib__index.js` (47 KB) | `…/@deepseek-ai/dsh-client-modules/lib/index.js` | host half: `dsh.client` scan, bundle serving, index rows |
| `PLAN` | `ui-plan\lib__client.js` (838 L) | `…/@deepseek-ai/dsh-client-ui-plan/lib/client.js` | a real third-party-shaped registration into `turnTail` |
| `TM` | `token-meter\lib__types__usage-projection.js` | `…/@deepseek-ai/dsh-token-meter/lib/types/usage-projection.js` | `tokenUsage` projection (definition + **wire view**) |
| `SS` | `session-stats\lib__types__projection.js` | `…/@deepseek-ai/dsh-session-stats/lib/types/projection.js` | `sessionStats` projection (definition + **wire view**) |

`ui-slots` / `ui-primitives` are **not** separate asar packages: they are seeded into the browser module
table by the web shell, next to React and Cordis (`SLOTS`, `function YZ()`).

---

## 1. Slot A — `conversation.composer.dock`

### 1.1 What kind of slot it is

It is **not** a top-level slot. It is a **child slot of the `conversation.composer.bar` registration**,
declared `kind: "list"`, `scope: "session"`.

`CONV:22958-22997` (inside `registerComposerBar`, `ctx.slots.register({ name: "conversation.composer.bar", … })`):

```js
const registerComposerBar = () => slots.register({
    name: "conversation.composer.bar",
    locale: NS,
    children: {
        "conversation.input.attachments": { kind: "single", scope: "session-maybe" },
        …
        "conversation.composer.dock": {
            kind: "list",
            scope: "session"
        }
    },
    inject: (sessionId) => { … },
}, ConversationComposerBar);
```

The bar itself is declared on `conversation.content` as `single` / **`session-maybe`** (`CONV:22812-22815`):

```js
"conversation.composer.bar": {
    kind: "single",
    scope: "session-maybe"
}
```

Consequences (all load-bearing for the plugin):

* `list` semantics: **`id` is mandatory**, duplicate `(id, priority)` throws, entries are ordered by
  `priority` asc then `order` asc (§1.2).
* `scope: "session"` is **strict**: the outlet refuses to render without a session binding
  (`REND:1133` `if (spec.scope === "session" && scopeBinding.key === void 0) throw …`), so a dock entry is
  always mounted under an active Session and `sessionId` is always a string.
* The outlet is only rendered for the real composer, never the hero/empty state:

`CONV:22216-22223`:

```js
(0, react_jsx_runtime.jsxs)("div", {
    className: InputBar_module_css_default.dock,
    "data-composer-dock": true,
    children: [variant === "composer" && input !== void 0 && sessionId !== void 0 ? renderSlot("conversation.composer.dock", {}) : null, activity ? null : (0, react_jsx_runtime.jsx)(ContextMeter, {
        useProjection,
        t
    })]
})
```

Note the second argument: **`{}` — the declaring owner passes no props at all.** Everything a dock entry
receives comes from the standard kit + its own `inject` (§1.5).

### 1.2 Exact `ctx.slots.register(options, Component)` options

Authority: the minified `SlotCore` in `SLOTS` (region starting at offset ≈507 844; the class is
`OI=class{…}`, exported as `SlotCore`). Reconstructed `register` (whitespace/formatting mine, identifiers verbatim):

```js
register(e, t) {                                     // e = options, t = Component
  const r = this.records.get(e.name);
  if (!r?.spec) throw new Error(`slot "${e.name}" is not declared (a parent entry's children table must declare it)`);
  const i = r.spec, n = e.priority ?? 0;
  switch (i.kind) {
    case "single": { … "single slot … already has a registration" … }
    case "keyed": { if (e.key === void 0) throw new Error(`keyed slot "${e.name}" requires options.key`); … }
    case "list": {
      if (e.id === void 0) throw new Error(`list slot "${e.name}" requires options.id`);
      const f = r.entries.find(h => h.options.id === e.id && (h.options.priority ?? 0) === n);
      if (f) throw new Error(`list slot "${e.name}" already has an entry with id "${e.id}" at priority ${n} …`);
      break
    }
    case "chain": if (e.select === void 0) throw new Error(`chain slot "${e.name}" requires options.select`); break
  }
  if (e.children) for (const f of Object.keys(e.children)) { … "is already declared" … }
  …
  const l = {
    component: t,
    options: {
      ...e.key !== void 0 ? { key: e.key } : {},
      ...e.id !== void 0 ? { id: e.id } : {},
      ...e.order !== void 0 ? { order: e.order } : {},
      ...e.label !== void 0 ? { label: e.label } : {},
      ...e.priority !== void 0 ? { priority: e.priority } : {}
    },
    ...e.select !== void 0 ? { select: e.select } : {},
    ...e.inject !== void 0 ? { inject: e.inject } : {},
    ...e.children !== void 0 ? { children: e.children } : {},
    ...e.store !== void 0 ? { store: e.store } : {},
    ...e.locale !== void 0 ? { locale: e.locale } : {},
    ...e.registrant !== void 0 ? { registrant: e.registrant } : {}
  };
  const u = [...r.entries, l];
  if (u.sort(i.kind === "list"
      ? (f, h) => (f.options.priority ?? 0) - (h.options.priority ?? 0) || (f.options.order ?? 0) - (h.options.order ?? 0)
      : (f, h) => (f.options.priority ?? 0) - (h.options.priority ?? 0)), …)
  …
  return () => { … dispose … }
}
```

So the accepted option set is exactly:

| option | applies to | meaning |
|---|---|---|
| `name` | all | **required**; must be an already-declared slot key |
| `id` | `list` | **required**; identity of the cell; duplicate at same priority throws |
| `order` | `list` | optional number, default 0; secondary sort (priority first) |
| `priority` | all | optional number, default 0; **lowest renders/elects**; different priority is how you shadow (`… register at a different priority to shadow it (lowest renders)` in the `single`/`keyed` error text) |
| `label` | all | optional; stored on the entry, surfaced in the debug snapshot only |
| `key` | `keyed` | required there; **not** valid for this slot |
| `select` | `chain` | required there; not valid for this slot |
| `inject` | all | `(sessionId, actions) => face` (§1.6) |
| `children` | all | child-slot table for slots your entry then renders itself; not needed here |
| `store` | all | a store handle **or** `() => handle` (`REND:1604`); enables `useStore`+`actions` props |
| `locale` | all | dictionary namespace string; enables the `t` prop |
| `registrant` | all | auto-stamped by the renderer (`REND:1605` `options.registrant ?? this.ctx.fiber?.name`); do not pass |

Note there is **no `scope`** at registration: the scope is fixed by the declaration
(`"conversation.composer.dock": { kind:"list", scope:"session" }`).

Reference usage — the two pills that already live there, `CHAT:15560-15576`:

```js
const statPillInject = () => ({ hooks: { performanceUsage } });
ctx.slots.inject("conversation.composer.dock", function* () {
    yield ctx.slots.register({
        name: "conversation.composer.dock",
        id: "activity",
        order: 0,
        locale: NS,
        inject: statPillInject
    }, ActivityPill);
    yield ctx.slots.register({
        name: "conversation.composer.dock",
        id: "usage",
        order: 1,
        locale: NS,
        inject: statPillInject
    }, UsagePill);
});
```

(`NS = "chat"`, `CHAT:6533`. `inject` returns a **fresh face per call** — it is memoized per
(entry × scope binding), see `REND:507-519`.)

`ctx.slots.register` is itself an effect: `REND:1815` `return this.ctx.effect(() => this["_register"](options, component), "slots.register()")`.
It returns an idempotent disposer, and is auto-disposed when the plugin unloads.

`ctx.slots.inject(key, callback)` (`REND:1368-1427`) is the **required** wrapper: it runs `callback`
immediately if the slot is already declared, otherwise inside the declaring `register()` call, and re-runs
it whenever the declaration epoch changes. The callback may return one disposer **or an iterable of
disposers** (hence `function*` + `yield` above).

### 1.3 Exact props of a `conversation.composer.dock` entry

Composition order, `REND:792-798` (`renderEntry`) and `REND:773-790` (`ContextualEntry`):

```js
<Comp {...kit} {...injected} {...slotInjected.props} {...contextual} {...ownerProps} />
```

`ownerProps` = `{}` for this slot (`CONV:22219`). `slotInjected.props` = the declaration-level
`children[...].inject` face — **the dock's declaration has none** (`CONV:22994-22997`), so it is `{}`.
`contextual` = deferred slot-level hook factories, also none here.

Therefore a dock entry receives exactly **`kit` ⊕ `injected`**:

```ts
// kit — REND:736-767 (standardKit) over REND:680-702 (standardProps)
interface ComposerDockKit {
  // ---- session-scope standard sources (SESS:755-764), strict session ----
  sessionId: string                                  // SESS:762  props: { sessionId: binding.sessionId }
  useSession: <T>(sel: (s: SessionSnapshot) => T, eq?: (a: T, b: T) => boolean) => T   // hook "session"
  useProjection: {                                   // keyed hook "projection" (SESS:757,761)
    (key: string): unknown
    (key: string, member: string): unknown
    <T>(key: string, sel: (v: T) => T, eq?: (a: T, b: T) => boolean): T
  }
  useAccess: (action: string) => boolean             // keyed hook "access" (SESS:1131-1134), optional source

  // ---- root-scope standard sources (SESS:1120-1129) ----
  useSessions: <T>(sel: (s: SessionsListSnapshot) => T, eq?) => T          // hook "sessions"
  useSessionStatus: <T>(sel, eq?) => T                                     // hook "sessionStatus"
  useSessionRetainInfo: (sessionId: string) => unknown                     // keyed "sessionRetainInfo"
  useSessionAccess: (sessionId: string, action?: string) => unknown        // keyed "sessionAccess"

  // ---- contributed by ui-chat's session source (CHAT:15328-15331) ----
  useChat: <T>(sel: (s: ChatSnapshot) => T, eq?: (a: T, b: T) => boolean) => T   // hook "chat"

  // ---- framework seats (REND:738-761) ----
  renderFactorySlot: (name: string, props?: object, options?: object) => React.ReactNode
  t?: (key: string, params?: Record<string, unknown>) => string   // ONLY when `locale` was passed
  useStore?: <T>(sel: (s: unknown) => T, eq?) => T                // ONLY when `store` was passed
  actions?: unknown                                              // ditto
  renderSlot?: (key: string, owner?: object, opts?: object) => React.ReactNode  // ONLY when `children`
  renderSlotChain?: (key: string, owner?: object, opts?: object) => React.ReactNode
  SessionProvider?: React.ComponentType<{ session?: string }>     // ONLY when a child is non-root scope
}
```

`injected` — whatever the entry's own `inject` returned, with its `hooks` / `keyedHooks` maps rewritten to
props, `REND:435-459`:

```js
function runInject(entry, binding, actions) {
    const inject = entry.inject;
    if (!inject) return EMPTY_INJECTED_PROPS;
    const args = [];
    if (binding !== void 0) args.push(binding.key);      // sessionId
    if (actions !== void 0) args.push(actions);          // store.actions, when `store` declared
    return bindInjectSources(inject(...args));
}
function bindInjectSources(face) {
    const sources = face["hooks"], keyedSources = face["keyedHooks"];
    …
    for (const [name, source] of Object.entries(sources ?? {}))
        bound[standardHookPropName(name)] = observableHook(source);
    for (const [name, source] of Object.entries(keyedSources ?? {}))
        bound[standardHookPropName(name)] = keyedObservableHook(source);
    return bound;                                        // all other keys are spread verbatim as props
}
```

with `SLOTS`: `function II(e){return`use${e[0]?.toUpperCase()??""}${e.slice(1)}`}` — i.e.
`performanceUsage → usePerformanceUsage`, `chat → useChat`, `projection → useProjection`.

Empirically confirmed by the two existing entries, which declare nothing but `locale` + `inject`:

`CHAT:9690` — `const UsagePill = react.memo(function UsagePill({ useProjection, usePerformanceUsage, t })`
`CHAT:9652` — `const ActivityPill = react.memo(function ActivityPill({ useChat, useProjection, usePerformanceUsage, t })`

`useProjection("tokenUsage")` reads the session projection and `useChat` reads the Chat target; both came from
the standard kit, not from any `inject` — `statPillInject` returns only `performanceUsage`.

### 1.4 Are `useChat` / `useProjection` guaranteed for a third-party entry?

* `useProjection` — **yes**, unconditionally, for any `scope:"session"` entry: it is part of
  `BUILTIN_SOURCE` in `SESS:755-764`, merged into every materialized session binding (`SESS:1028-1047`).
  Declared as a **keyed** hook: `keyedHooks: { projection: (key) => binding.session.projections.faceOf(key) }`.
* `useChat` — **yes while `@deepseek-ai/dsh-client-ui-chat` is active**, because ui-chat contributes it to
  the same session-scope roster: `CHAT:15328-15331`
  `ctx.uiSession.provide({ hooks: ["chat"], resolve: (binding) => ({ hooks: { chat: chatSource(binding) } }) })`.
  `ctx.uiSession.provide` is the public extension seam for session-scope standard hooks (`SESS:1033-1039`),
  and undeclared/duplicate names throw (`SESS:1085-1106`). If ui-chat were disabled the prop would simply be
  **absent** (`undefined`) — guard for that.
* `t` — **no**, not by default. It exists only when the registration passes `locale` (`REND:742-746`):
  ```js
  if (entry.locale !== void 0) {
      const face = host.locale;
      if (face === void 0) throw new SlotAssemblyError(`entry declares locale namespace '${entry.locale}' but no locale face is installed …`);
      kit["t"] = localeSeat(face, entry.locale);
  }
  ```
  and the namespace must have been registered with `ctx.locale.register(ns, {en: {...}, de: {...}, …})`
  (`CHAT:15332-15341` shows the exact call shape incl. the 8 shipped languages zh/en/ja/es/fr/de/ru/pt).
* `usePerformanceUsage` — **no**; that is ui-chat's own entry-level `inject` (`CHAT:15560`), not a scope
  source. A third-party entry must contribute its own source under `inject.hooks` if it wants one.
* `sessionId` — **yes** (`SESS:762`), and it is always a string here because the scope is strict.

### 1.5 `useProjection("tokenUsage")` / `useProjection("sessionStats")` — exact return shapes

`useProjection(key)` returns the **wire `view`** of the projection registered on the host, or `undefined`
when nothing serves that key (`faceOf` yields an absent source; ui-chat guards exactly this).

**`tokenUsage`** — `TM:30-35, 40-47, 86-119`:

```js
const projectionSchema = z.object({
    uncachedInputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    cacheWriteTokens: z.number().int().nonnegative(),
}).strict();
…
const tokenUsageProjectionDefinition = {
    key: 'tokenUsage',
    stateVersion: 2,
    stateSchema: tokenUsageStateSchema,          // { totals: projectionSchema, last: {turn,step,buckets}|null }
    init: () => ({ totals: zeroBuckets(), last: null }),
    apply: (state, event) => { … },
    wire: { viewSchema: projectionSchema, view: state => state.totals },   // ← wire view = totals
};
```

```ts
type TokenUsageView = {           // useProjection("tokenUsage")
  uncachedInputTokens: number     // always present
  outputTokens: number            // always present
  cacheReadTokens: number         // always present (0 when unreported)
  cacheWriteTokens: number        // always present (0 when unreported)
}
// NOTE: no totalTokens, no reasoningTokens, no routes, no per-turn data, no `last`.
// Whole-log billed input and the "1.3M-Token · Cache-Treffer: 94%" pill are derived client-side:
```

`CHAT:9534-9536` and `CHAT:9702`:

```js
function billedInputTokens(usage) {
    return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
}
…
const total = billedInputTokens(usage) + usage.outputTokens;
```

Cache-hit share = `cacheReadTokens / billedInputTokens` (`CHAT:9525-9528` passes
`usage.cacheReadTokens` and that denominator into `formatCacheHitPercent`).

**`sessionStats`** — `SS:27-36, 66-167`:

```js
const sessionStatsSchema = z.object({
    turns: z.number().int().nonnegative(),
    steps: z.number().int().nonnegative(),
    llmMs: z.number().nonnegative(),
    toolMs: z.number().nonnegative(),
    ttftMs: z.number().nonnegative(),
    ttftSteps: z.number().int().nonnegative(),
    decodeMs: z.number().nonnegative(),
    decodeTokens: z.number().nonnegative(),
}).strict();
…
export const sessionStatsProjectionDefinition = {
    key: 'sessionStats',
    stateVersion: 1,
    stateSchema: sessionStatsStateSchema,        // schema + lastTurn/openStep/pendingCalls
    wire: { viewSchema: sessionStatsSchema, view: state => ({ turns, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens }), summary: false },
};
```

```ts
type SessionStatsView = {          // useProjection("sessionStats")
  turns: number; steps: number
  llmMs: number; toolMs: number
  ttftMs: number; ttftSteps: number
  decodeMs: number; decodeTokens: number
}
```

Consumer template (fallback when the projection is absent) — `CHAT:9559-9563`:

```js
function useSessionStats(useChat, useProjection) {
    const settledNodes = useChat((s) => s.legacy.nodes);
    const projected = useProjection("sessionStats");
    return react.useMemo(() => projected ?? deriveStats(settledNodes), [projected, settledNodes]);
}
```

Decode speed ("1 234 tok/s") = `decodeTokens / (decodeMs / 1000)` (`CHAT:9564-9566`).

### 1.6 `inject` — contract, and can it inject dynamic hooks? 

Yes. `inject` is `(sessionId, actions?) => face` where `face` is an object whose:
* `hooks: { [name]: observableSource }` → bound to prop `use<Name>`; a source is `{ getSnapshot(), subscribe(l) }`;
* `keyedHooks: { [name]: (key, member?) => observableSource }` → bound to prop `use<Name>` with
  call forms `use<Name>(key)`, `use<Name>(key, memberName)`, `use<Name>(key, selector, equal?)`
  (`REND:244-287` `keyedHookCall` / `keyedObservableHook`);
* every other key → spread verbatim as a prop.

Call/memoization: `runInject(entry, binding, actions)` is invoked once per
(entry × scope binding) and cached (`REND:499-532`), i.e. **once per Session**, not per render. It therefore
must be a pure function of `(sessionId, actions)`; put mutable subscriptions in the source object, not in the
face construction. `ui-plan` proves the pattern is intended for third-party use (`PLAN:774-791`), incl. a
*callable* keyed hook that closes over a per-session Chat target:

```js
inject: (sessionId) => {
    const binding = ctx.sessions.binding(sessionId);
    if (binding === void 0) throw new Error(`ui-plan: unknown session "${sessionId}"`);
    const chat = ctx.uiConversation.binding(binding).target("chat");
    return {
        ...open(sessionId),
        keyedHooks: { plans: (turn) => {
            const snapshot = chat.getSnapshot();
            if (snapshot === void 0) throw new Error("ui-plan: Chat target is unavailable");
            return snapshot.nodes.turnDataSource(Number(turn), "submitted-plan");
        } }
    };
},
```

`sessionId` is a plain string (a `SessionId` brand) — the same value the standard `sessionId` prop carries
(`SESS:762` `props: { sessionId: binding.sessionId }`, `SESS:1041` `key: binding.sessionId`). Pass it straight
to `ctx.sessions.binding(sessionId)`.

### 1.7 Registration snippet (dock)

```js
ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
  name: 'conversation.composer.dock',
  id: 'cost-pill',            // REQUIRED (list slot)
  order: 2,                   // after the built-in activity(0) / usage(1)
  locale: 'cost-plugin',      // optional → gives `t`
  // inject is optional here: sessionId / useProjection / useChat are already in the kit
}, CostPill));
```

---

## 2. Slot B — `conversation.chat.turnTail`

### 2.1 What kind of slot it is

Child of the **`conversation.chat.node` keyed entry with key `"turn-tail"`**, declared `kind:"list"`,
`scope:"session"` — `CHAT:9327-9342`:

```js
ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "turn-tail",
    locale: NS,
    inject: () => ({ hooks: { performanceUsage } }),
    children: {
        "conversation.chat.turnTail": {
            kind: "list",
            scope: "session"
        },
        "conversation.chat.assistant-actions": {
            kind: "list",
            scope: "session"
        }
    }
}, TurnTailNodeView));
```

Render position — `CHAT:9042-9061`: the tail slot output is the **first child** of the turn-tail row `div`,
immediately **before** `MessageIconActions` (the message action row):

```js
return jsxs("div", {
    className: TurnTailNodeView_module_css_default.root,
    "data-turn-tail": data.turn,
    "data-actions-reveal": endsWithResponse ? "always" : "hover",
    children: [tail, jsx(MessageIconActions, { … })]
})
```

Render call — `CHAT:9030-9034`:

```js
const turn = node.location.kind === "turn" || node.location.kind === "step" ? node.location.turn : void 0;
if (turn === void 0) return null;
const closing = data.closing;
const tail = renderSlot("conversation.chat.turnTail", {
    turn,
    seq: closing?.finalNode.seq ?? data.seq,
    openFile
});
```

### 2.2 Exact props — and the `turn` contradiction

**`turn` is a Turn OBJECT, not a number.** Three independent proofs:

1. `CHAT:9027` — the value passed is `node.location.turn`, i.e. the Turn record of a Location, never
   `location.turn.turn`.
2. Location construction, `CONV:2422-2439`:
   ```js
   resolve(seq) {
       const coordinates = this.coordinates.get(seq);
       if (coordinates?.turn === void 0) return SESSION_LOCATION;
       const turn = this.timeline.turns.get(coordinates.turn);
       if (turn === void 0) return UNRESOLVED_LOCATION;
       if (coordinates.step === void 0) return { kind: "turn", turn };
       const step = this.stepsByTurn.get(coordinates.turn)?.get(coordinates.step);
       return step === void 0 ? { kind: "turn", turn } : { kind: "step", turn, step };
   }
   ```
   and the Turn value, `CONV:2214-2221`:
   ```js
   const value = {
       turn: draft.turn,
       start: draft.start,
       end: draft.end,
       status: draft.end !== void 0 ? "closed" : draft.start === void 0 ? "unknown" : "open",
       steps,
       data: this.turnData(draft.turn)
   };
   ```
3. The real consumer reads the number **through** the object — `PLAN:57-58`:
   ```js
   function PlanCards({ turn, usePlans, openPlan, t }) {
       const plans = usePlans(String(turn.turn));
   ```

```ts
interface TurnTailEntryProps {                      // kit + own inject + ownerProps
  // ---- ownerProps (CHAT:9030-9034) ----
  turn: Turn                                         // Location's Turn object (see below)
  seq: number                                        // closing?.finalNode.seq ?? turn-tail data.seq
  openFile: (path: string, options?: { line?: number }) => Promise<void>   // CHAT:15490-15496

  // ---- standard kit: identical seats to §1.3 ----
  sessionId: string
  useSession, useProjection, useAccess, useChat, useSessions, useSessionStatus,
  useSessionRetainInfo, useSessionAccess, renderFactorySlot, t?, useStore?, actions?
  // NO usePerformanceUsage: that hook belongs to the parent TurnTailNodeView's own inject (CHAT:9331),
  // it is NOT inherited by child-slot entries (slot-level props come from `children[key].inject`, REND:1135)
}

interface Turn {
  turn: number                                       // the durable Turn number
  start?: TurnStartEvent                             // engine event, has .seq/.time/.data
  end?: TurnEndEvent
  status: 'open' | 'closed' | 'unknown'
  steps: Step[]
  data: LocationDataMap                              // .get(key): T | undefined, .source(key)
}
interface Step { turn: number; step: number; start?: …; end?: …; status: …; data: LocationDataMap }
interface LocationDataMap {
  get<T = unknown>(key: string): T | undefined
  source<T = unknown>(key: string): { getSnapshot(): T | undefined; subscribe(l: () => void): () => void }
}
```

### 2.3 Per-Turn token usage — working recipe

The finished Turn's accounting is a **Location datum** written by ui-chat under the key `"turn-tail"`:

`CHAT:13258-13280` (`tailData`):

```js
const tokenUsage = context.start?.event.type === "turn/start"
    ? deriveTurnTokenUsage(context.matches.map((match) => match.event).filter(isSessionEvent))
    : void 0;
return {
    turn: end.event.data.turn,
    seq: end.event.seq,
    time: end.event.time,
    closing,
    branchUnavailable: closing === null || latestTranscriptSeq !== closing.finalNode.seq,
    ...tokenUsage === void 0 ? {} : { tokenUsage }
};
```

`CHAT:13099-13107` (`aggregateAttempts` return) — the exact per-Turn shape:

```ts
interface TurnTokenUsage {
  uncachedInputTokens: number          // required
  outputTokens: number                 // required
  totalTokens: number                  // required — provider-reported or derived, proven exact
  cacheReadTokens?: number             // absent when any attempt did not report it
  cacheWriteTokens?: number            // absent when any attempt did not report it
  reasoningTokens?: number             // absent when unreported; constrained ≤ outputTokens
  routes?: Array<{ provider: string; model: string }>   // unique (provider, model) pairs of the attempts
}
```

Confirmed by its only UI consumer, `CHAT:8915-8941` (`TurnUsagePanel`): `usage.totalTokens`,
`usage.outputTokens - …`, `usage.uncachedInputTokens`, optional `usage.cacheReadTokens`,
`usage.cacheWriteTokens`, `usage.reasoningTokens`, and
`usage.routes?.map(r => `${r.provider}/${r.model}`)`.

**Where the chat snapshot lives.** Two equivalent entrances:

```js
// (1) inside any session-scope slot entry, via the standard hook
useChat(snapshot => …)                       // snapshot: ChatSnapshot

// (2) before/outside rendering, via services (works inside `inject` too)
const binding = ctx.sessions.binding(sessionId);                 // sessions controller binding
const target  = ctx.uiConversation.binding(binding).target('chat');
const snapshot = target.getSnapshot();                            // ChatSnapshot | undefined
```

* `CONV:4135-4156` `binding(source)` accepts **either** a binding **or** a SessionId string
  (`const sessionId = typeof source === "string" ? source : source.sessionId;`).
* `CONV:3989-4004` `target(target)` → `{ getSnapshot(): T | undefined, subscribe(listener) }`;
  `getSnapshot()` returns `undefined` until the target is activated — **subscribing activates it**
  (`subscribe: l => { const u = this.snapshot.subscribe(l); this.activate(target); return u }`).
  Do not call `getSnapshot()` as a one-off before subscribing anywhere in the app, or force activation via
  a subscription / any rendered Chat view.

Snapshot shape: `CHAT:11503-11512` (`snapshot()`), `CHAT:120-143` (`EMPTY_CHAT_SNAPSHOT`),
`CHAT:9770-9781` (`chatNode`):

```ts
interface ChatSnapshot {
  order: string[]                                    // ordered node keys
  nodes: {
    get(key: string): ChatNode | undefined
    values(): ChatNode[]
    source(key: string): Obs<ChatNode | undefined>
    bottomSource(key: string): Obs<boolean>
    turnDataSource(turn: number, kind: string): Obs<ChatNode[]>   // ← keyed by turn number + kind
    processSource(key: string): Obs<…>
  }
  locations: {
    getTurn(turn: number): string[]                  // node keys for that Turn number
    getStep(turn: number, step: number): string[]
    getPosition?(key: string): { turn: number; previous?: string; next?: string }
  }
  navigation: { items(): … }
  timeline: {
    turnOrder: number[]                              // ascending Turn numbers
    turns: Map<number, Turn>                         // Turn.data.get('turn-tail') lives here
  }
  legacy: { nodes: ChatNode[]; turnTimings: Map<…>; turnEnds: Map<…>; partial: …; runningCalls: … }
}
interface ChatNode {
  key: string; kind: string; id: string; target: 'chat'
  anchorSeq: number; location: Location; visibility: string; groupTree?: string
  data: unknown                                     // for kind === 'turn-tail': TurnTailData
}
interface TurnTailData {
  turn: number; seq: number; time: number
  closing: AssistantStepData | null
  branchUnavailable: boolean
  tokenUsage?: TurnTokenUsage
}
```

**Snippet 1 — inside a `turnTail` entry (React, uses only props):**

```js
function TurnCost({ turn, useChat }) {
  // select a PRIMITIVE (or pass an equality fn): the hook is uSES-with-selector, Object.is by default
  const total = useChat(
    (snapshot) => snapshot.timeline.turns.get(turn.turn)?.data.get('turn-tail')?.tokenUsage?.totalTokens,
    Object.is,
  );
  const cacheRead = useChat(
    (snapshot) => snapshot.timeline.turns.get(turn.turn)?.data.get('turn-tail')?.tokenUsage?.cacheReadTokens,
  );
  if (total === undefined) return null;         // accounting not provable for this Turn
  return React.createElement('span', { className: '…' }, `${total} tok`);
}
```

**Snippet 2 — the turn-tail *node* for a Turn number (what the question asks for literally):**

```js
function turnTailNode(snapshot, turnNumber) {
  // locations.getTurn takes the NUMBER, not the Turn object
  for (const key of snapshot.locations.getTurn(turnNumber)) {
    const node = snapshot.nodes.get(key);
    if (node !== undefined && node.kind === 'turn-tail') return node;
  }
  return undefined;
}
// usage:
const node = turnTailNode(snapshot, turnNumber);
const usage = node?.data?.tokenUsage;   // TurnTokenUsage | undefined
```

**Snippet 3 — latest completed Turn without React** (mirrors ui-chat's own `forkAt`, `CHAT:15515`):

```js
function lastTurnUsage(ctx, sessionId) {
  const binding = ctx.sessions.binding(sessionId);
  if (binding === undefined) return undefined;
  const snapshot = ctx.uiConversation.binding(binding).target('chat').getSnapshot();
  if (snapshot === undefined) return undefined;
  const turns = [...snapshot.timeline.turns.values()];
  // last turn that actually published a tail
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const tail = turns[i].data.get('turn-tail');      // CHAT:13325 uses exactly this access
    if (tail !== undefined) return { turn: turns[i].turn, usage: tail.tokenUsage, seq: tail.seq };
  }
  return undefined;
}
```

(`CHAT:15515` for reference:
`[...chat.getSnapshot().timeline.turns.values()].find(turn => turn.end?.seq === seq)?.data.get("turn-tail")?.closing?.finalNode.messageId`.)

**Snippet 4 — session-wide totals inside a dock pill (no service access needed):**

```js
function CostPill({ useProjection, t }) {
  const usage = useProjection('tokenUsage');            // TokenUsageView | undefined
  const stats = useProjection('sessionStats');          // SessionStatsView | undefined
  if (usage === undefined) return null;
  const billedInput = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
  const total = billedInput + usage.outputTokens;
  const hitPercent = billedInput === 0 ? null : Math.round((usage.cacheReadTokens / billedInput) * 100);
  const tps = stats !== undefined && stats.decodeMs > 0
    ? stats.decodeTokens / (stats.decodeMs / 1000)
    : null;
  return React.createElement('span', { 'data-composer-stat': 'cost' },
    `${formatCompact(total)} Tokens`,
    hitPercent === null ? null : ` · Cache-Treffer: ${hitPercent}%`,
    tps === null ? null : ` · ${tps.toFixed(1)} tok/s`);
}
```

### 2.4 `inject: (sessionId) => …` for a third-party turnTail entry

Yes, and it is the same contract as §1.6 (`REND:435-442`; args = `[binding.key]`, plus `actions` only when
`store` is declared). It is the correct place to capture the per-session Chat target, because it runs once per
Session and gives you the string `sessionId` to hand to `ctx.sessions.binding(sessionId)`. Proof of the pattern
in a shipped third-party-style plugin: `PLAN:778-790` (quoted in §1.6).

`sessionId` type: `string` (a branded `SessionId`). It is `undefined` only for `session-maybe`/`root` scopes —
never for `session` scope, which both target slots use.

### 2.5 Registration snippet (turnTail)

```js
ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
  name: 'conversation.chat.turnTail',
  id: 'cost-turn',            // REQUIRED (list slot)
  order: 0,                   // optional
  locale: 'cost-plugin',      // optional → gives `t`
  // inject optional — sessionId / useProjection / useChat / t(if locale) are already in the kit
}, TurnCost));
```

---

## 3. Bundle mechanics (hand-written, plain JS)

### 3.1 `window.__ModuleLoader__.load({...})` — exact shape

`MODS:703-719` (`ClientModuleSystem.register`):

```js
register(registration) {
    const ownerId = stripClientSuffix(registration.id);
    if (registration.chunk !== void 0 && !CLIENT_CHUNK.test(registration.chunk)) throw …
    const id = registration.chunk === void 0 ? ownerId : chunkId(ownerId, registration.chunk);
    if (this.bootstrapIds.has(id) || this.factories.has(id)) {
        const registrationName = registration.chunk === void 0 ? registration.id : id;
        throw new Error(`client-modules: duplicate factory registration for "${registrationName}" (bundle executed twice without invalidate?)`);
    }
    this.factories.set(id, { factory: registration.factory, rev: … });
}
```

```ts
interface BundleRegistration {
  id: string                          // MUST be the package id (== the Loader entry name);
                                      //     a trailing "/client" is stripped (MODS:98-100), so both work
  factory: (require: Require) => object   // returns the module exports (a Cordis plugin, §3.3)
  chunk?: string                      // only for package-local `require.async('./client.X.js')` splits
}
type Require = ((spec: string) => unknown) & {
  asset(reference: string): string     // MODS:850  require.asset(...) → resolveAsset
  async(spec: string): Promise<unknown> // MODS:847-855
}
```

The factory is **not executed at load**; the bundle script only registers it. Materialization
(`MODS:805-831`) runs `factory(makeRequire(ownerId, edges))` once and memoizes in `loadCache`; the returned
object becomes the module's exports. Top-level side effects therefore run once, at plugin activation, and
`client.js` must be **classic script text** (bundles are concatenated into a plain `<script>`, no ESM
`import`/`export` — `MODSH:380-…` `buildComboScript` / `comboScript`).

### 3.2 What `require()` may import **without** `dsh.client.external`

Exactly the web shell's static module table — `SLOTS`, `function YZ()`
(also the only table the seed is built from: `MODS` ctor `this.seed = new Map(Object.entries(options.staticModules))`
and the shell passes `staticModules: YZ()`):

```js
{
  react:                       fk,
  "react/jsx-runtime":         gk,
  "react-dom":                 xk,
  "react-dom/client":          Ck,
  "@deepseek-ai/cordis":       Rb,
  zod:                         JS,
  "@tanstack/react-virtual":   rI,
  "@deepseek-ai/dsh-client-store":             SI,
  "@deepseek-ai/dsh-client-ui-slots":          MI,
  "@deepseek-ai/dsh-client-ui-primitives":     FU,
  "@deepseek-ai/dsh-client-ui-dockkit":        WZ,
}
```

Resolution order (`MODS:834-856` `makeRequire`): seed table → materialized `loadCache` → registered factory
→ else throw:

```
client-modules: require("…") missed the module table — not a platform seed word, not a materialized module,
and no registered package factory (a build-time externals drift, or a dynamic dependency that did not arrive)
```

So: `require('react')`, `require('react/jsx-runtime')`, `require('react-dom')` (and the 8 others) are free.
Importing another **plugin package** (`@deepseek-ai/dsh-client-ui-chat`, `…/conversation`, …) requires it to be
named in `dsh.client.external` **and** to be a graph row. **The cost plugin needs none of them** — it touches
those packages only through Cordis services, so `dsh.client.external` stays absent.

### 3.3 `exports` must be a Cordis plugin; which services may `apply` inject

The materialized exports are mounted as one Loader entry per package (`MODS:485-497`
`create(loader, id)` → `loader.create({ name: id })`), so the export is a normal Cordis plugin:

```js
exports.apply = apply;
exports.inject = inject;        // string[] of REQUIRED service names
```

Verified shipped examples: `brand-official\lib__client.js` (`const inject = ["slots"]; exports.apply = apply; exports.inject = inject;`)
and `ui-plan` (`PLAN:719-730`):

```js
const inject = ["slots", "remote", "remote.commands", "remote.session", "sessions", "locale",
                "uiConversation", "resources", "sidebarRight", "sidebarRightTabs"];
```

Service names proven from the service constructors: `slots` (`REND:1348` `super(ctx, "slots")`),
`uiConversation` (`CONV:4097`), `sessions` (Controller service used as `ctx.sessions`), `locale`
(used as `ctx.locale` in `CHAT:15332`, also listed by ui-chat/plan), plus `uiSession`, `uiWorkspace`,
`uiRenderer`, `configForms`, `remote`, `sidebarRight`, `fileDrag`.

**Yes, `apply` may inject `["slots", "sessions", "uiConversation", "locale"]`** — all four are real service
names in this build, and all four are used together by ui-chat/ui-plan-shaped plugins. Include only what you
touch (`sessions` is needed solely for the non-React `ctx.sessions.binding(...)` route; the React route needs
only `slots`).

Ordering caveat: **Cordis service injection does not order slot declarations.** `conversation.composer.dock`
exists only after ui-conversation's own `register` ran. That is exactly why every shipped plugin wraps its work
in `ctx.slots.inject('<slot key>', …)` (`REND:1368-1427`), which waits for the declaration and re-runs on
re-declaration. Always use it; never call `ctx.slots.register` directly from `apply`.

Package-level `dsh.client.inject` (`MODS:791-794`) only orders *module arrival* — the graph loader awaits the
named rows' arrival before materializing ours — and should still list the declaring packages:

```json
"inject": ["@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-chat"]
```

### 3.4 Bundle skeleton

`client.js` — classic script, no imports:

```js
window.__ModuleLoader__.load({
  id: '@local/cost-plugin',            // === package name
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;

    const NS = 'cost-plugin';

    function CostPill({ useProjection, t }) { /* §2.3 snippet 4 */ return null; }

    function TurnCost({ turn, useChat, t }) { /* §2.3 snippet 1 */ return null; }

    return {
      // Cordis: services that must exist before apply runs
      inject: ['slots', 'locale'],
      apply(ctx) {
        // 1) dictionary namespace first: the `t` seat needs an installed face + bound namespace
        ctx.effect(() => ctx.locale.register(NS, {
          en: { cost: { tokens: '{count} tokens' } },
          de: { cost: { tokens: '{count} Tokens' } },
        }), 'cost-plugin: dictionaries');
        // 2) declarations may not exist yet at apply time → wait for them
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock', id: 'cost-pill', order: 2, locale: NS,
        }, CostPill));
        ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
          name: 'conversation.chat.turnTail', id: 'cost-turn', order: 0, locale: NS,
        }, TurnCost));
      },
    };
  },
});
```

`index.js` (host half, UI-only — verbatim from `skill2\templates__decoration__index.js`):

```js
/** Host half of the decoration bundle; the Client module owns the rendering. */
export function apply() {}
```

`package.json`:

```json
{
  "name": "@local/cost-plugin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-chat"]
    }
  }
}
```

`cordis.patch.yml`:

```yaml
- insert:
    - id: cost-plugin
      name: '@local/cost-plugin'
```

Manifest rules enforced by the host: `dsh.client.platform` must be a string and equal `"web"`
(`MODSH:786-812` returns `null` otherwise → the package is not a client plugin);
`exports["./client"]` is **required** (`if (clientRel === void 0) throw new Error('client-modules: <pkg> declares dsh.client but exports no "./client" bundle')`);
`dsh.client.inject` / `external` must be string arrays; `immediately` must be boolean
(`MODS:60-75` `parseDshClient`). `./locale/*.json` is **only** plugin-market metadata
(`{ "meta": { "title": …, "description": … } }`, see `ui-plan\locale__de.json`), not runtime dictionaries —
the runtime `t` dictionary must be registered by the bundle itself.

### 3.5 Is `dsh.client.immediately: true` needed?

**No — not for loading or activation.** It only selects the prefetch tier:

* `SLOTS` (shell boot): `async prefetchImmediateTier(){ await Promise.all(this.manifest.plugins.filter(e => e.immediately).map(e => this.modules.prefetch(e.id).catch(() => {}))) }`
* `MODS:385-397` (`ClientEntries.start`): `await Promise.all(this.desired.plugins.map(async ({ id }) => { await this.create(loader, id) })); await loader.await();`
  — **every** manifest plugin gets an entry and is activated, `immediately` or not.
* `parseBootManifest` (`MODS:108-…`) copies `immediately` onto `plugins[]` only as a flag; it never filters.

So `immediately: true` is a boot-latency optimisation (prefetch the bundle before the mount point opens).
Keep it `true` to match the official template; the plugin would still work without it.

---

## 4. Type summary cheat-sheet

```ts
// conversation.composer.dock — list / session / child of conversation.composer.bar
register({ name, id, order?, priority?, locale?, inject?, store?, label? }, Component)
ComponentProps = { sessionId, useSession, useProjection, useAccess, useChat,
                   useSessions, useSessionStatus, useSessionRetainInfo, useSessionAccess,
                   renderFactorySlot, t?, useStore?, actions? }  // ownerProps = {}

// conversation.chat.turnTail — list / session / child of conversation.chat.node@key="turn-tail"
register({ name, id, order?, priority?, locale?, inject?, store?, label? }, Component)
ComponentProps = { turn: Turn, seq: number, openFile(path, {line?}) ⇒ Promise<void>,
                   …same standard seats as above… }

// session-wide usage
useProjection('tokenUsage')   → { uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } | undefined
useProjection('sessionStats') → { turns, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens } | undefined

// per-turn usage
snapshot.timeline.turns.get(turnNumber)?.data.get('turn-tail')?.tokenUsage
  → { uncachedInputTokens, outputTokens, totalTokens, cacheReadTokens?, cacheWriteTokens?,
      reasoningTokens?, routes?: {provider, model}[] } | undefined
snapshot.locations.getTurn(turnNumber) → string[] → snapshot.nodes.get(key)?.data.tokenUsage
```

---

## 5. Gotchas that will bite a hand-written plugin

1. **List slot needs `id`** — `register({ name: 'conversation.composer.dock' }, C)` throws
   ``list slot "conversation.composer.dock" requires options.id``.
2. **Duplicate `id` at the same priority throws** — pick a unique id (`cost-pill`, `cost-turn`).
3. **Never `ctx.slots.register` directly at `apply` time** — the slot may not be declared yet; the renderer
   throws ``slot "…" is not declared (a parent entry's children table must declare it)``. Use
   `ctx.slots.inject(key, cb)`.
4. **`t` requires `locale`**, and `locale` requires a registered namespace and an installed locale face,
   otherwise `SlotAssemblyError: entry declares locale namespace '…' but no locale face is installed`.
5. **`inject` is per-Session and cached** — do not read React state in it; return sources/plain functions.
6. **`useChat`/`useProjection` are selector hooks** (`useSyncExternalStoreWithSelector`, `Object.is` by
   default). Selecting a fresh object/array every call re-renders forever — select primitives or pass an
   equality function as the 2nd argument.
7. **The dock is only rendered for a real composer with a session** (`CONV:22219`), so it never appears on the
   empty/hero screen. Do not expect to style it into existence there.
8. **`conversation.chat.turnTail` is inside `StrictSessionEntry`** — switching Sessions remounts the entry
   (component-local state must not leak between Sessions; `REND:825-881`).

---

## 6. Not proven / fallbacks

| # | Item | Status | Fallback to implement |
|---|---|---|---|
| 1 | That the **client-side** value of `useProjection("tokenUsage")` is exactly the flat `totals` object | **High confidence, not runtime-verified.** Proven indirectly: `wire.view = state => state.totals` (`TM:118`), the strict 4-field schema (`TM:30-35`), and the fact that ui-chat's `UsagePill` reads the flat fields and *computes* the total itself (`CHAT:9692-9722`, `9534-9536`). No `totals`-nested reader exists anywhere in the shipped client. | Normalise defensively: `const u = usage && usage.totals ? usage.totals : usage;` then read the four fields. |
| 2 | `useProjection("tokenUsage")` can be `undefined` | Proven as *allowed* by the consumer guard (`CHAT:9693` `if (usage === void 0 …) return null`) and by `faceOf` returning an absent source; the exact absent-vs-served condition for a stock build was not observed at runtime. | Render nothing (or a `–`) when `undefined`; do not throw. |
| 3 | `turn.data.get('turn-tail')` on a Turn taken from `snapshot.timeline.turns` | Proven by shipped code paths: `CHAT:13325` `turnLocation(context)?.data.get("turn-tail")` and `CHAT:15515` `[...chat.getSnapshot().timeline.turns.values()]…?.data.get("turn-tail")`. Assumed the timeline only holds **loaded** turns (it is a paged window). | If the turn is older than the loaded window, fall back to `snapshot.locations.getTurn(n)` (same guarantee) and, if that is empty too, render nothing rather than guessing. Do **not** re-derive from raw events client-side. |
| 4 | `openFile` 2nd-arg type is `{ line?: number }` | Proven by the implementation `CHAT:15490-15496` (`options?.line`), not by a public type file (`.d.ts` files are not shipped in the asar). | Call it as `openFile(path)` — the options argument is fully optional. |
| 5 | `turn.start` / `turn.end` / `Step.start` payload types | Only inferred from usage (`CONV:2216-2217`, `CONV:2186-2189`); the engine event TS types are not in the asar. | Treat as opaque; read only `.seq` / `.time` / `.data` if needed. |
| 6 | Whether `ctx.locale.register` requires all 8 shipped languages or falls back to `en` | **Not proven.** The shipped packages always pass all 8 (`CHAT:15332-15341`); the locale service source was not extracted. | Pass `en` + `de` only, and wrap registration in a plain `ctx.effect`; if a missing-language error surfaces, add the remaining 6 keys (zh/ja/es/fr/ru/pt). |
| 7 | `store` option for a third-party entry | The path is proven (`REND:1604` `typeof options.store === "function" ? options.store() : options.store`; `REND:748-752` binds `useStore`/`actions`; `CHAT:4458-4459` uses `defineStore` from `@deepseek-ai/dsh-client-store`), but no third-party store was exercised. | **Don't use `store`** in v1 — keep state in a module-level `{getSnapshot, subscribe}` source exposed through `inject.hooks`, which is fully proven (§1.6). |
| 8 | `immediately` semantics beyond prefetch | Every code path was read: only `prefetchImmediateTier` filters on it; `ClientEntries.start` creates all entries. Marked "not required" with high confidence, not runtime-tested by toggling it. | Leave `immediately: true` (matches the shipped template; costs nothing). |
| 9 | Exact rendered width/placement in the dock | The dock is a flex row owned by `InputBar.module.css` (`CONV:22216-22223`); the CSS class names are hashed and not part of any contract. | Keep the entry inline and self-sized (like `PlainPill`: `span` + icon + label); do not set position/absolute/transform. |

## 7. Reference index (file:line)

| Topic | Location |
|---|---|
| dock declaration (`list`/`session`, child of `composer.bar`) | `CONV:22958-22997` |
| `composer.bar` declared `single`/`session-maybe` | `CONV:22812-22815` |
| dock render site, empty owner props, composer-only guard | `CONV:22216-22223` |
| existing dock entries (`activity`, `usage`) | `CHAT:15560-15576` |
| `UsagePill` / `ActivityPill` prop usage | `CHAT:9652`, `CHAT:9690` |
| token billing helpers (`billedInputTokens`, `cacheHitPercent`) | `CHAT:9525-9536` |
| `sessionStats` consumer + window fallback | `CHAT:9559-9563` |
| entry prop composition order | `REND:792-798`, `REND:773-790` |
| standard kit (`t`, `useStore`, `renderSlot`, `SessionProvider`) | `REND:736-767` |
| standard props materialization | `REND:667-702` |
| `inject` binding + `hooks`/`keyedHooks` → `use<Name>` | `REND:435-459` |
| `standardHookPropName` | `SLOTS`, `function II(e){return \`use${e[0]?.toUpperCase()??""}${e.slice(1)}\`}` |
| `ctx.slots.inject` declaration waiter | `REND:1368-1427` |
| `register` option validation + list sort | `SLOTS`, `SlotCore` region ≈ offset 507 844 |
| session-scope standard sources (`projection`, `sessionId`) | `SESS:755-764`, `SESS:1028-1047` |
| root-scope standard sources | `SESS:1120-1129` |
| ui-chat contributes `chat` hook | `CHAT:15328-15331` |
| `turn-tail` node + child slot declaration | `CHAT:9327-9342` |
| `renderSlot('conversation.chat.turnTail', {turn, seq, openFile})` | `CHAT:9030-9034` |
| turn-tail row composition (tail before action row) | `CHAT:9042-9061` |
| `Turn` object construction | `CONV:2214-2221`; Location resolve `CONV:2422-2439` |
| `PlanCards` reads `String(turn.turn)` | `PLAN:57-58` |
| per-turn `tokenUsage` derivation | `CHAT:13099-13107`, `CHAT:13258-13280` |
| `TurnUsagePanel` field usage | `CHAT:8915-8941` |
| chat snapshot construction / empty shape | `CHAT:11503-11512`, `CHAT:120-143` |
| `chatNode` shape | `CHAT:9770-9781` |
| `locations.getTurn(number)` | `CHAT:10739-10748` |
| `uiConversation.binding(source)` | `CONV:4128-4156` |
| `binding.target('chat')` | `CONV:3989-4004` |
| `tokenUsage` projection + wire view | `TM:30-47`, `TM:86-119` |
| `sessionStats` projection + wire view | `SS:27-36`, `SS:66-167` |
| module loader `load`/`register` | `MODS:703-719` |
| factory materialization + `makeRequire` | `MODS:805-856` |
| `dsh.client` declaration parser | `MODS:60-75` |
| host `resolveMeta` (platform / `./client` / manifest) | `MODSH:786-812` |
| static module table | `SLOTS`, `function YZ()` |
| entry creation / all-plugins activation | `MODS:385-397`, `MODS:485-497` |
| `immediately` used only for prefetch | `SLOTS` `prefetchImmediateTier`; `MODS:108-…` |
| classic-script bundle delivery | `MODSH:380-…` (`buildComboScript`) |
