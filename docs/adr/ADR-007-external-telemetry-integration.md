# ADR-007 — External Telemetry Integration

**Status:** Accepted  
**Date:** 2026-06-25  
**Stage:** 6

---

## Context

The platform has three orthogonal data planes: CONFIG (bidirectional, versioned), TELEMETRY (one-way, live), and COMMAND. `LiveStore` is the runtime container for the TELEMETRY plane. As the application gained a React integration layer (Stage 5B–6), it was necessary to define precisely which layer owns `LiveStore` and which layers are permitted to write to it.

---

## Decision

### 1. Which layer owns `LiveStore`?

`LiveStore` is owned by the **application bootstrap layer** — the code that composes and mounts the application. It is constructed outside React, before any component mounts, and passed into the React tree via dependency injection (as a prop to `ZentroApp`).

`LiveStore` is **not** created, managed, or destroyed by any React component, hook, Builder action, Renderer, or Projection function. Its lifetime matches the application session, not any component's lifecycle.

### 2. Which layer is allowed to call `liveStore.set()`?

Only **external infrastructure adapters** — code that bridges a real or simulated physical data source into the platform. Specifically:

- MQTT client adapters (receive broker messages, parse payloads, call `liveStore.set()`)
- Modbus / BACnet / KNX polling adapters (poll registers on a timer, call `liveStore.set()`)
- WebSocket / REST push adapters (handle incoming frames, call `liveStore.set()`)
- Test fixtures and demo simulators (call `liveStore.set()` directly in setup code, outside React)

All callers of `liveStore.set()` live **outside the React tree**. They are not components, not hooks, and not effects. They are plain TypeScript modules or integration harnesses that run before or independently of the React render cycle.

### 3. What external adapters are expected?

| Adapter | Protocol | Trigger |
|---|---|---|
| MQTT adapter | MQTT over WebSocket / TCP | `message` event from broker |
| Modbus adapter | Modbus TCP / RTU | polling interval (configurable per binding `ttlSeconds`) |
| KNX adapter | KNX IP | group-address telegram event |
| Dry-contact adapter | Digital input polling | GPIO / edge-trigger callback |
| REST / webhook adapter | HTTP push or poll | HTTP response or schedule |
| Test / demo simulator | In-process | direct `liveStore.set()` call in fixture setup |

Each adapter reads the `Binding.address` and `Binding.source` fields from the CONFIG plane (GraphStore) to know what to subscribe to or poll. It then writes `LiveSample` objects keyed by `Binding.id` into `LiveStore`. Adapters are not part of Stage 6 and will be introduced in a future stage.

### 4. How React becomes aware of new telemetry

React does **not** observe `LiveStore` mutations. `LiveStore` is a plain mutable object with no reactive bindings.

React re-renders are triggered externally by one of two mechanisms:

1. **Timer-driven `nowMs` update:** The application bootstrap layer runs a `setInterval` (or equivalent) outside React. On each tick it calls a state setter (e.g. `setNowMs(Date.now())`) that was exposed to it by `ZentroApp`. This causes `ZentroApp` to re-render with a new `nowMs`, which causes `useProjection` to recompute all ViewModels against the current `LiveStore` state.

2. **Adapter-driven notification:** An infrastructure adapter, after writing to `LiveStore`, may call a notification callback provided by the bootstrap layer, which in turn calls the React state setter. This triggers an immediate re-render rather than waiting for the next timer tick.

In both cases the causal chain is:

```
External adapter → liveStore.set() → notification → setNowMs() → React re-render → useProjection() reads liveStore.get()
```

`useProjection` reads `LiveStore` synchronously during render. It does not subscribe, observe, or hold references between renders. Each render produces a fresh `ProjectionSnapshot` from the current state of the store.

### 5. Explicit write-prohibition statement

The following layers **must never call `liveStore.set()`** or write any `LiveSample` value:

| Layer | Prohibited action |
|---|---|
| React components (`FlowMapView`, `DashboardPanel`, `ZentroApp`, any future UI component) | `liveStore.set()` |
| React hooks (`useProjection`, `useBuilder`, `useBuilderMode`, any future hook) | `liveStore.set()` |
| Builder Core (`builder-actions`, `builder-state`, `binding-editor`, `port-validator`, `palette`) | `liveStore.set()` |
| BuilderContext / BuilderProvider | `liveStore.set()` |
| Renderer (`FlowMap`, node components, `FlowEdge`, `flow-transformers`, `elk-layout`, `theme`) | `liveStore.set()` |
| Projection (`projectComponent`, `projectConnection`, `deriveHealthState`, `evaluateProfile`) | `liveStore.set()` |
| Graph Engine (`addComponent`, `updateComponent`, `addConnection`, etc.) | `liveStore.set()` |
| Alarm state machine | `liveStore.set()` |

This prohibition extends to synthetic or simulated telemetry. A React hook that pushes fake `LiveSample` values to simulate sensor activity is architecturally equivalent to a hook that pushes real values — both violate the TELEMETRY plane boundary. Demo fixtures and test harnesses that need to simulate sensors must do so outside React, in setup code, before mounting components.

---

## Telemetry Event Flow

The following sequence describes the complete runtime path from a physical sensor reading to the rendered UI. Each arrow represents a handoff between layers. No step may be skipped or short-circuited.

```
Infrastructure Adapter
        │
        ▼
liveStore.set(bindingId, sample)
        │
        ▼
Application scheduler / external notifier
        │
        ▼
React re-render
        │
        ▼
useProjection()
        │
        ▼
projectComponent() / projectConnection()
        │
        ▼
ComponentViewModel / ConnectionViewModel
        │
        ├──────────────► FlowMap
        └──────────────► Dashboard
```

**`liveStore.set()` MUST NEVER trigger React directly. It only mutates the telemetry store. Scheduling a render is the responsibility of the application runtime.**

The separation between mutation (`liveStore.set()`) and render scheduling (application scheduler / notifier) is load-bearing. It means:

- An adapter that writes many samples in rapid succession does not cause an equal number of React renders. The scheduler may batch or throttle notifications.
- `LiveStore` may be written to before the React tree has mounted. The data will be present when the first render occurs.
- A future adapter that writes from a Web Worker or a server-sent event handler requires no React-aware code — it calls `liveStore.set()` and signals the scheduler by whatever mechanism is appropriate (postMessage, callback, EventEmitter). React remains uninvolved in the signalling.
- Tests simulate this contract by writing to `LiveStore` in setup code and then explicitly calling `rerender()`. This is the exact same two-step pattern the production runtime uses.

---

## Consequences

- **Testability:** Tests inject telemetry by calling `liveStore.set()` in `beforeEach` or between `rerender` calls. No mocking of React internals is required.
- **Separation of concerns:** Protocol-specific parsing (MQTT payloads, Modbus register decoding) never enters the React layer.
- **Predictability:** React re-renders are fully controlled by the bootstrap layer. The UI never self-triggers a re-render in response to its own telemetry write.
- **Future adapters:** Any new protocol adapter follows the same contract — write to `LiveStore`, optionally notify the bootstrap layer — without touching any React code.
