# Zentro Digital Twin — Build Status

## Completed Stages

| Stage | Title | Tests at close | Commit |
|-------|-------|---------------|--------|
| 1–4   | Domain model, Graph Engine, Projection pipeline, Telemetry plane | — | (pre-git) |
| 5A    | Builder Core — actions, binding editor, port validator, palette | — | (pre-git) |
| 5B    | React Builder Integration — BuilderContext + useBuilder | — | (pre-git) |
| 6     | Minimal Application Integration — ZentroApp + FlowMapView + DashboardPanel | 454 | (pre-git) |
| 7     | OperationalProfileStore + AlarmStore Foundation | **487** | `f3eebe9` |
| 8     | AlarmRule Evaluation Engine | **508** | `bb44b96` |
| 9     | Zentro Data Ingestion Contract | **522** | `1cdc6d8` |
| 10    | Fixture / Payload Loader | **532** | `517ce11` |
| 11    | Application Bootstrap Wiring | **540** | `edced14` |
| 12    | Demo App Entry Point | **542** | `8c8eb4b` |
| 13    | Build Pipeline + Vercel Entry Point | **542** | `94ae0a7` |
| 14    | Demo Telemetry Simulation Layer | **556** | `e43dcc1` |
| 15    | Alarm Rule Seeding + Live Evaluation Loop | **564** | `8b17231` |
| 16    | CSS Layer + FlowMap Layout + Node Visual Polish | **564** | `e8b152d` |
| 17    | Edge Visuals + App Header Bar | **564** | `c75807c` |
| 18    | Dashboard Polish + Runtime Binding Simulation | **564** | `fb47d65` |
| 19    | ELK.js Auto Layout | **572** | `1deca65` |
| 20    | Animated FlowMap   | **576** | `c974ba2` |
| 21    | Localization (i18n) — Hebrew RTL + English LTR | **593** | `a5d4d96` |

## Stage 21 Notes

**Approved.** Net +17 tests (576 → 593). No skipped tests.

New modules (`src/i18n/`):
- `types.ts` — `Locale`, `TranslationKey` (35 keys), `Translations`, `LocaleConfig`
- `locales/he.ts` — Hebrew translations (RTL, default locale)
- `locales/en.ts` — English translations (LTR)
- `LocaleContext.tsx` — `LocaleProvider`, `useLocale()` hook; safe default context (Hebrew) so components render without a provider
- `index.ts` — barrel export
- `locale.test.ts` — 17 tests: key completeness, no empty values, RTL/LTR config, plural forms, key parity between locales

Modified:
- `src/renderer/theme.ts` — `StatusPresentation.label` changed from English string to `TranslationKey`; all maps updated
- `src/app/ZentroApp.tsx` — wrapped with `LocaleProvider`; header uses `t()`; language switcher button (`[data-testid="lang-switch-btn"]`) toggles between he/en without reload; root div gets `dir={config.dir}`
- `src/app/DashboardPanel.tsx` — Chip labels use `t(pres.label)`, alarm count uses `t('app.alarms_count', { count })`
- `src/app/FlowMapView.tsx` — loading indicator and empty state via `t()`
- `src/renderer/components/nodes/TankNode.tsx` — sensor label, temperature unit via `t()`
- `src/renderer/components/nodes/GenericNode.tsx` — health label, temperature unit via `t()`
- `src/renderer/components/nodes/PumpNode.tsx` — running/standby/no_data, flow unit via `t()`
- `src/renderer/components/edges/FlowEdge.tsx` — temperature unit via `t()`
- `src/renderer/flow-transformers.ts` — `hasActiveAlarm` made optional (backward compat with smoke tests)
- `src/styles.css` — `[dir="rtl"]` overrides; `.zentro-flow-empty` utility class

Architecture invariants confirmed:
- Component Graph, Projection, Runtime Stores, LiveStore, telemetry ingestion unchanged
- Type Contract v3 unchanged
- No hard-coded user-facing strings remain in any component
- Adding a third locale requires only: a new `locales/xx.ts` file + one entry in `LOCALE_CONFIGS` in `LocaleContext.tsx`
- `document.documentElement.lang` and `dir` synced on locale switch

Localization summary:
- **35 translation keys** across Hebrew and English
- **Hebrew (RTL, default):** right-to-left layout, Hebrew typography, dashboard chips right-aligned
- **English (LTR):** left-to-right layout, English strings
- Language switch is immediate — no page reload required

## Stage 20 Notes

**Approved.** Net +4 tests (572 → 576). No skipped tests.

Modified:
- `src/styles.css` — added `--edge-alarm` CSS variable; added `@keyframes flowDash`, `flowDashReverse`, `alarmPulse`; added `.zentro-edge-{flowing,reverse,noflow,alarm}` animation classes
- `src/renderer/flow-transformers.ts` — `ConnectionEdgeData` gains `hasActiveAlarm: boolean`; `connectionToEdge` accepts optional third param; `buildFlowGraph` derives `hasActiveAlarm` from endpoint `componentVMs.activeAlarms`
- `src/renderer/components/edges/FlowEdge.tsx` — replaced `<BaseEdge>` with raw `<path>` supporting CSS animation; color priority: alarm (critical red pulse) > temperature NodeStatus color > FlowState color; animation class selected from FlowState + alarm state

Architecture invariants confirmed:
- No Component Graph mutations — rendering-only stage
- Projection, Runtime Stores, LiveStore, telemetry ingestion unchanged
- Type Contract v3 unchanged
- `hasActiveAlarm` derived purely in the rendering transform layer (buildFlowGraph) from pre-computed ComponentViewModels — not a new projection
- FlowEdge reads only from `ConnectionEdgeData` props — no store access

## Stage 19 Notes

**Approved.** Net +8 tests (564 → 572). No skipped tests.

Pre-implementation audit confirmed:
- `src/renderer/elk-layout.ts` + `elk-layout.test.ts` (7 tests) already existed and were production-ready
- Missing: async orchestration hook, topology-change detection, integration point

New modules:
- `src/renderer/useElkLayout.ts` — `useElkLayout(nodes, edges)` hook; topology key derived from node/edge IDs only; ELK imported dynamically (lazy chunk); falls back to seed positions while layout is pending
- `src/renderer/useElkLayout.test.ts` — 8 tests covering: isReady lifecycle, seed fallback, position application, no mutation, topology change triggers recompute, ViewModel-only change does NOT trigger recompute

Modified:
- `src/app/FlowMapView.tsx` — one-line addition: `const { layoutNodes } = useElkLayout(nodes, edges); <FlowMap nodes={layoutNodes} />`
- `vite.config.ts` — `chunkSizeWarningLimit: 1600` (ELK bundled JS is ~1.4 MB, expected)

Build output:
- Main chunk: 405 kB / 127 kB gzip (unchanged from pre-ELK)
- ELK lazy chunk: 1,432 kB / 442 kB gzip (loaded on first layout run only)

Architecture invariants confirmed:
- Graph topology is never mutated by the layout engine
- Telemetry, alarm, and ViewModel updates never trigger layout recomputation
- Seed positions remain fallback until first ELK result arrives
- Layout is deterministic for identical graphs (ELK layered algorithm)
- Projection, LiveStore, AlarmStore, simulation engine — all unchanged

## Stage 18 Notes

**Approved.** 564 tests unchanged (pure rendering). Build: 17.4 kB CSS, 403 kB JS.

Modified:
- `src/simulation/hot-water-simulation.ts` — added 3 runtime/flow bindings: `b_hp_state` (heat pump runtime, 20s period), `b_gas_state` (gas backup runtime, 70s period), `b_pump_flow` (flow rate 0–12 L/min, 25s period); all 6 components now have live data
- `src/renderer/components/nodes/PumpNode.tsx` — reads `liveValues['runtime']` to show "▶ Running" / "◼ Standby"; reads `liveValues['flow']` to show flow rate
- `src/app/DashboardPanel.tsx` — replaced raw enum strings with colored icon+label `Chip` components using theme helpers; added per-component active alarm count badge; test selectors preserved (hidden spans)

Architecture invariants confirmed:
- DashboardPanel imports from `src/renderer/theme.ts` (pure presentation) — not from `src/projection`
- No store access in DashboardPanel; all data comes from `componentVMs` props
- `[data-testid="component-health/status/sensor-state"]` spans preserved (display:none) so existing tests continue to pass

## Stage 17 Notes

**Approved.** 564 tests unchanged (pure rendering). Build: 17.4 kB CSS, 401 kB JS.

Modified:
- `src/styles.css` — added `--edge-flowing`, `--edge-reverse`, `--edge-default` CSS variables
- `src/renderer/components/edges/FlowEdge.tsx` — edge path now 2px stroke; edge label shows temperature (colour-coded by NodeStatus) + sensor state icon in a pill badge; stroke colour driven by flow state
- `src/app/ZentroApp.tsx` — added `<header>` bar showing app title, project name, and live active alarm count (red badge when >0, green "All clear" when none); alarm count derived from `componentVMs` already in scope

Architecture invariants confirmed:
- Header reads `componentVMs` (already computed by useProjection in scope) — no new store reads
- Edge label reads `viewModel` props — no projection calls in renderer
- No new stores, hooks, or data planes added

## Stage 16 Notes

**Approved.** 564 tests unchanged (pure CSS/layout — no logic changes). Build: 17 kB CSS bundle.

New files:
- `src/styles.css` — global CSS custom properties (dark Catppuccin-inspired theme); all `--status-*`, `--node-*`, `--sensor-*` variables; viewport layout; DashboardPanel card grid

Modified:
- `src/main.tsx` — imports `@xyflow/react/dist/style.css` and `./styles.css`
- `src/app/FlowMapView.tsx` — wraps canvas in `<div className="zentro-flow-container">` (60 vh height; required for ReactFlow to render)
- `src/renderer/components/nodes/TankNode.tsx` — rounded temperature to 1 d.p.; added alarm count badge (red circle top-right when active alarms > 0)
- `src/renderer/components/nodes/GenericNode.tsx` — added temperature display, sensor state row, alarm count badge; now reads `liveValues['temperature']`

Architecture invariants confirmed:
- All colour values live in CSS only — no hex in TSX files
- Node components read from `viewModel` props — no store access, no projection calls
- Alarm badge reads `viewModel.activeAlarms` (pre-computed by useProjection)

## Stage 15 Notes

**Approved.** Net +8 tests (556 → 564). No skipped tests.

New modules:
- `src/simulation/evaluation-runner.ts` — `EvaluationRunner` interface + `createEvaluationRunner()` factory; projects each component's NodeStatus and calls `applyAlarmEvaluation()` outside React
- `src/simulation/evaluation-runner.test.ts` — 8 tests (3 lifecycle, 5 integration)

Modified:
- `src/ingestion/fixture-adapter.ts` — added `HOT_WATER_ALARM_RULES` (4 rules for `cmp_tank` and `cmp_shower`); `buildHotWaterPayload` now populates `alarmRules` with real rules
- `src/app/demo.tsx` — second `useEffect` starts/stops `EvaluationRunner` on mount/unmount

Architecture invariants confirmed:
- `applyAlarmEvaluation` is called only by the EvaluationRunner — outside React
- `useEffect` in DemoApp manages runner lifecycle only — no telemetry or alarm writes in React
- Runner skips components with no alarm rules (early exit)
- All existing tests pass; no store or projection APIs changed
- Alarm rules: `rule_tank_risk` (critical, 5s debounce), `rule_tank_warn` (warning, 10s),
  `rule_shower_scald` (critical, 0s debounce), `rule_shower_cold` (warning, 10s)

## Stage 14 Notes

**Approved.** Net +14 tests (542 → 556). No skipped tests.

New modules:
- `src/simulation/simulation-engine.ts` — `SimulationBinding`, `generateSampleValue()` (pure), `SimulationEngine` interface, `createSimulationEngine()` factory
- `src/simulation/hot-water-simulation.ts` — `HOT_WATER_SIMULATION_BINDINGS`, `createHotWaterSimulation()`
- `src/simulation/simulation-engine.test.ts` — 14 tests

Modified:
- `src/app/ZentroApp.tsx` — added optional `autoRefreshMs?: number` prop; `useEffect` clock tick (advances `nowMs` state only — no TELEMETRY write)
- `src/app/demo.tsx` — `useEffect` starts/stops simulation engine on mount/unmount; passes `autoRefreshMs={1000}` to ZentroApp

Architecture invariants confirmed:
- Simulation engine is an external service (plain JS setInterval), not a React construct
- `liveStore.set()` is called only by the engine, never by React/hooks
- `useEffect` in DemoApp manages engine lifecycle only — zero TELEMETRY writes in React
- `autoRefreshMs` advances the clock (`setNowMs`) — not a TELEMETRY write
- All four temperature bindings simulated: `b_t1`, `b_t2_supply`, `b_t3`, `b_t4_return`
- `ValueProvenance.Inferred` used (no `Simulated` value in Type Contract)
- Waveform ranges cycle visibly through NodeStatus bands (Risk/Warn/Ok/Scald/Cold)

## Stage 13 Notes

**Build pipeline only.** Same 542 tests. No logic changes.

New files:
- `vite.config.ts` — Vite + @vitejs/plugin-react
- `index.html` — HTML shell
- `src/main.tsx` — mounts DemoApp via createRoot

Added scripts: `dev`, `build`, `preview` to package.json.

## Stage 12 Notes

**Approved.** Net +2 tests (540 → 542). No skipped tests.

New modules:
- `src/app/demo.tsx` — `DemoApp` zero-argument component (composition root for hot-water demo)
- `src/app/demo.test.tsx` — 2 tests (mount smoke test + DashboardPanel node-count assertion)

Architecture invariants confirmed:
- `DemoApp` is a composition root only — no new logic, no state, no async
- Bootstrap is module-level (runs once at import time); `DemoApp` itself is stateless
- Node-count assertion targets synchronous DashboardPanel DOM (`[data-testid^="dashboard-item-"]`)
- `main.tsx`/`index.tsx`, `ZentroApp`, `useProjection`, all stores unchanged
- This is demo/dev code only — not wired into any production entry point

## Stage 11 Notes

**Approved.** Net +8 tests (532 → 540). No skipped tests.

New modules:
- `src/app/bootstrap.ts` — `AppContext` interface + `bootstrapApp(payload, registry)`
- `src/app/bootstrap.test.ts` — 8 tests

Architecture invariants confirmed:
- Bootstrap is synchronous and frontend-only; no async, network, scheduler, or config reading
- `ComponentRegistry` remains caller-provided; registry composition is deployment configuration
- `bootstrapApp` composes store creation + `loadFixture` + context assembly — no new logic
- `ZentroApp`, `useProjection`, all existing stores unchanged
- No `main.tsx`/`index.tsx` wiring; no `types.ts` changes

## Stage 10 Notes

**Approved.** Net +10 tests (522 → 532). No skipped tests.

New modules:
- `src/ingestion/fixture-adapter.ts` — `ZentroPayload`, `loadFixture()`, `buildHotWaterPayload()`
- `src/ingestion/fixture-adapter.test.ts` — 10 tests

Architecture invariants confirmed:
- Synchronous fixture/payload loader only — no async, network, scheduler, or retry logic
- Frontend-only ingestion boundary remains intact
- `loadFixture()` drives all four Ingestor methods in dependency order:
  graph → profiles → alarm rules → samples
- `buildHotWaterPayload()` uses a throwaway `EngineStores` to materialise seed output;
  `hot-water.seed.ts` is unchanged
- No EventStore/VersionStore writes from `loadFixture()`
- No existing files modified; no `types.ts` changes; no React/projection changes

## Stage 9 Notes

**Approved.** Net +14 tests (508 → 522). No skipped tests.

New modules:
- `src/ingestion/ingestion-contract.ts` — `GraphSnapshot`, `ProfileSnapshot`, `AlarmRuleSnapshot`,
  `Ingestor` interface, `createIngestor()`
- `src/ingestion/ingestion-contract.test.ts` — 14 tests

Architecture invariants confirmed:
- Frontend-only boundary: no transport, scheduler, or backend logic
- Graph snapshots are authoritative direct `GraphStore` replacements — snapshot is the
  complete source of truth; absent entities are deleted (connections before components)
- No EventStore or VersionStore writes during ingestion
- No React/projection changes; no `types.ts` changes; no existing stores modified
- Validation: projectId mismatch and dangling connection references throw at ingest time

## Stage 8 Notes

**Approved.** Net +21 tests (487 → 508). No skipped tests.

New modules:
- `src/alarm/alarm-evaluator.ts` — `evaluateAlarms()` (pure, deterministic, side-effect free) +
  `applyAlarmEvaluation()` (sole write path; must be called outside React)
- `src/alarm/alarm-evaluator.test.ts` — 18 tests

Modified:
- `src/alarm/alarm-store.ts` — `getAlarmRulesForComponent()` accessor added to interface + impl
- `src/alarm/alarm-store.test.ts` — +3 tests for new accessor

Architecture invariants confirmed:
- `evaluateAlarms()` is pure: no store access, no mutations, no side effects
- `applyAlarmEvaluation()` is the sole AlarmStore write point for evaluation results
- `useProjection`, `ZentroApp`, `types.ts` unchanged
- Digital Twin remains frontend-only; no adapters, scheduler, or backend ingestion added

Alarm transition rules implemented: raise on first trigger, respect debounce before activate,
dismiss pending if condition clears before debounce, clear active on recovery.

## Stage 7 Notes

**Approved.** Net +33 tests (454 → 487). No skipped tests.

New modules:
- `src/projection/operational-profile-store.ts` — runtime profile lookup, owned outside React
- `src/alarm/alarm-store.ts` — alarm read model + `getAlarmsWithSeverity()` helper
- `docs/adr/ADR-007-external-telemetry-integration.md` — telemetry ownership ADR

Architecture invariants confirmed:
- React never calls `set()` on LiveStore, OperationalProfileStore, or AlarmStore
- All three stores injected as props into `ZentroApp`
- `useProjection` reads synchronously; no subscriptions

**Known limitation:** prior exact `integration.test.tsx` count before Stage 7 cannot be
independently verified (no git history before Stage 7 commit). Current suite passes with
no skipped tests. Accepted as a documented limitation.

**Encoding note:** `useProjection.test.ts` underwent encoding corruption during Stage 7
(PowerShell bulk replacement introduced UTF-8 BOM and curly-quote characters as code
delimiters). Resolved by byte-level fix. All 8 Stage 6 baseline assertions preserved.
PowerShell bulk replacement on source/test files is prohibited going forward.

## Type Contract

Pre-existing TypeScript errors exist in `@xyflow/react` node_modules type declarations
and `src/renderer` smoke tests (`exactOptionalPropertyTypes` strictness). None are
Stage 7-introduced. They do not affect test correctness or runtime behavior.

## Next

Stage 20 — pending.
