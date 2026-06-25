# Zentro Digital Twin — Backend Integration Contract

**Stage 27 — Real Runtime Integration Readiness**

This document defines the exact boundary between the Zentro frontend Digital Twin and the Zentro backend. Nothing in this document is demo-specific; this is the production integration contract.

---

## Architecture Constraint

> **The frontend MUST NEVER connect directly to MQTT, Modbus, KNX, PLCs, controllers, or field devices.**
> All real data must arrive only through the Zentro backend ingestion contract defined here.

---

## 1. What is production-ready today

| Module | File | Status |
|--------|------|--------|
| Ingestion contract (`Ingestor`) | `src/ingestion/ingestion-contract.ts` | ✅ Production-ready |
| Payload loader (`loadFixture`) | `src/ingestion/fixture-adapter.ts` | ✅ Production-ready |
| Application bootstrap (`bootstrapApp`) | `src/app/bootstrap.ts` | ✅ Production-ready |
| Live store (`LiveStore`) | `src/telemetry/live-store.ts` | ✅ Production-ready |
| Alarm store + evaluator | `src/alarm/` | ✅ Production-ready |
| Projection pipeline (`useProjection`) | `src/app/useProjection.ts` | ✅ Production-ready |
| Domain types (`LiveSample`, `Binding`, …) | `src/domain/types.ts` | ✅ Production-ready |
| Payload validator | `src/ingestion/payload-validator.ts` | ✅ Production-ready |
| Backend source seam | `src/runtime/backend-runtime-source.ts` | ✅ Integration seam |

---

## 2. What is demo-only

| Module | File | Replace with |
|--------|------|--------------|
| Demo app entry | `src/app/demo.tsx` | Real entry point using `BackendRuntimeSource` |
| Hot-water payload builder | `buildHotWaterPayload()` in `fixture-adapter.ts` | Backend API call |
| Hot-water alarm rules | `HOT_WATER_ALARM_RULES` in `fixture-adapter.ts` | Backend-provided `AlarmRuleSnapshot` |
| Simulation engine | `src/simulation/hot-water-simulation.ts` | Real telemetry via backend WebSocket |
| Evaluation runner (demo cadence) | `src/simulation/evaluation-runner.ts` | Backend-triggered or retained with real samples |
| `DemoRuntimeSource` | `src/runtime/demo-runtime-source.ts` | `BackendRuntimeSource` |

---

## 3. Initial payload — HTTP contract

At startup the backend delivers one `ZentroPayload` object:

```typescript
interface ZentroPayload {
  graph:      GraphSnapshot;       // complete project topology
  profiles:   ProfileSnapshot;     // operational profiles (bands → NodeStatus)
  alarmRules: AlarmRuleSnapshot;   // alarm rules per component
  samples?:   LiveSample[];        // optional: current telemetry snapshot
}
```

### GraphSnapshot

```typescript
interface GraphSnapshot {
  project:     Project;       // { id, name, siteType }
  components:  Component[];   // all components with their bindings[]
  connections: Connection[];  // all connections with optional bindings[]
}
```

Key rules:
- `project.id` must be stable across updates — it is the store key.
- Each `Component.bindings[]` entry carries a `Binding` with `id`, `source`, `address`, `metric`, `ttlSeconds`. The `id` is the `bindingId` used in `LiveSample`.
- `ttlSeconds` drives `SensorState`: samples older than `ttlSeconds` → `Stale`; twice that → `Lost`.

### ProfileSnapshot

```typescript
interface ProfileSnapshot {
  profiles: OperationalProfile[];
}
```

Profiles must be delivered before samples are processed. `loadFixture` enforces this ordering.

### AlarmRuleSnapshot

```typescript
interface AlarmRuleSnapshot {
  rules: AlarmRule[];   // { id, componentId, triggerStatus[], debounceSeconds, severity, message }
}
```

Rules reference `componentId` values from `GraphSnapshot.components`. Unknown component IDs are silently ignored by the alarm evaluator.

---

## 4. Payload validation

Before calling `bootstrapApp`, validate the raw API response:

```typescript
import { assertValidPayload } from './ingestion/payload-validator.js';

const raw = await fetch('/api/zentro/v1/payload').then(r => r.json());
assertValidPayload(raw);   // throws with path-level errors if malformed
```

`assertValidPayload` checks:
- `graph`, `graph.project.id/name`, `graph.components[]`, `graph.connections[]` — present and typed
- Each component: `id`, `type`, `projectId` are non-empty strings
- `profiles.profiles` is an array
- `alarmRules.rules` is an array; each rule has `id` and `componentId`
- `samples` — if present, must be an array

---

## 5. Integration entry point (example)

```typescript
import { assertValidPayload }      from '../ingestion/payload-validator.js';
import { BackendRuntimeSource }    from '../runtime/backend-runtime-source.js';
import { bootstrapApp }            from './bootstrap.js';
import { createIngestor }          from '../ingestion/ingestion-contract.js';
import { buildRegistry }           from './registry.js';   // site-specific

const registry = buildRegistry();

// 1. Fetch and validate initial payload
const raw = await fetch('/api/zentro/v1/payload').then(r => r.json());
assertValidPayload(raw);

// 2. Bootstrap all stores
const source = new BackendRuntimeSource(raw);
const ctx    = bootstrapApp(source.getInitialPayload(registry), registry);

// 3. Start alarm evaluation loop (same pattern as demo)
const runner = createEvaluationRunner(
  ctx.projectId, ctx.stores, ctx.liveStore,
  ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
);
runner.start();

// 4. Render
root.render(<ZentroApp projectId={ctx.projectId} ... autoRefreshMs={1_000} />);
```

---

## 6. Live telemetry — WebSocket contract

After bootstrap, the backend pushes `LiveSample` frames over a WebSocket.

### LiveSample shape

```typescript
interface LiveSample {
  bindingId:   string;              // matches a Binding.id from GraphSnapshot
  value:       number | boolean | null;
  ts:          string;              // ISO 8601 — e.g. "2026-06-25T14:30:00.000Z"
  state:       SensorState;         // 'live' | 'stale' | 'lost' | 'unknown'
  provenance:  ValueProvenance;     // 'measured' | 'inferred' | 'unknown'
  confidence?: number;              // 0..1; only populate with a real model basis
}
```

### Frontend integration

```typescript
const ws = new WebSocket('wss://zentro-backend/api/zentro/v1/live');
const ingestor = createIngestor();

ws.onmessage = (ev) => {
  const sample: LiveSample = JSON.parse(ev.data);
  ingestor.ingestSample(sample, ctx.liveStore);
  // ZentroApp's autoRefreshMs clock picks up the new value on the next tick
};
```

Rules:
- `bindingId` unknown to the store is silently ignored (`liveStore.set` is a Map write; projection skips unknown bindings).
- The backend must set `state: 'lost'` when a field device goes offline — not just stop sending.
- The frontend derives `SensorState` from `sample.state`; `ttlSeconds` provides a client-side staleness fallback.

---

## 7. Payload update (graph changes)

If the building topology changes at runtime (component added/removed, binding updated), the backend re-delivers a full `GraphSnapshot` via WebSocket or a dedicated HTTP endpoint:

```typescript
const raw = await fetch('/api/zentro/v1/payload').then(r => r.json());
assertValidPayload(raw);
// Re-run loadFixture on existing stores — ingestGraph handles deletions
loadFixture(raw, createIngestor(), ctx.stores, ctx.profileStore, ctx.alarmStore, ctx.liveStore);
```

`ingestGraph` deletes entities absent from the new snapshot and upserts the rest. No component re-render is needed; `ZentroApp.autoRefreshMs` ticks derive new ViewModels automatically.

---

## 8. Production readiness checklist

| Concern | Frontend behavior | Backend responsibility |
|---------|------------------|----------------------|
| Stale data | `SensorState.Stale` when `nowMs − sample.ts > ttlSeconds` | Must send `state: 'stale'` proactively |
| Lost sensor | `SensorState.Lost` after 2× ttl | Must send `state: 'lost'` on device offline |
| Unknown sensor | `SensorState.Unknown` / `NodeStatus.Unknown` | No action — default state when no sample |
| Invalid payload | `assertValidPayload` throws before any ingestion | Must return well-formed `ZentroPayload` |
| Partial telemetry | Components with no bindings render as Unknown | Acceptable — no crash |
| Maintenance mode | `HealthState.Maintenance` suppresses alarms | Backend sets `component.mode = 'maintenance'` in graph |
| Offline WebSocket | Alarm evaluator keeps last known state | Backend must reconnect / notify frontend |

---

*Document owner: Zentro frontend team. Update when Type Contract v3 or the ingestion contract changes.*
