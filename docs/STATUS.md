# Zentro Digital Twin — Build Status

## Completed Stages

| Stage | Title | Tests at close | Commit |
|-------|-------|---------------|--------|
| 1–4   | Domain model, Graph Engine, Projection pipeline, Telemetry plane | — | (pre-git) |
| 5A    | Builder Core — actions, binding editor, port validator, palette | — | (pre-git) |
| 5B    | React Builder Integration — BuilderContext + useBuilder | — | (pre-git) |
| 6     | Minimal Application Integration — ZentroApp + FlowMapView + DashboardPanel | 454 | (pre-git) |
| 7     | OperationalProfileStore + AlarmStore Foundation | **487** | `f3eebe9` |

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

Stage 8 — pending proposal and approval.
