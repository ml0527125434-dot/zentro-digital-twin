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

Stage 10 — pending proposal and approval.
