# Zentro Digital Twin — Builder Architecture

> **Phase 2 deliverable.** This documents the Builder **as it is built today**, so that every
> interaction is understood before it is changed. Where the current design has a known gap, the
> relevant backlog ID (`ZB-xxx` in `docs/ENGINEERING_BACKLOG.md`) is cited. This is descriptive,
> not aspirational — claims here are traceable to source files.

- **Created:** 2026-06-29.
- **Audience:** anyone implementing Phase 4 (Builder completion).
- **Golden rule of the codebase:** React holds **FSM state only**. The **GraphStore is the single
  source of truth** for CONFIG. React never writes telemetry, never executes commands, never mutates
  a store directly — all CONFIG writes go through `builder-actions` → `graph-engine`.

## The three planes (architectural law)

| Plane | Store(s) | Direction | Builder's relationship |
|-------|----------|-----------|------------------------|
| **CONFIG** | `GraphStore`, `VersionStore`, `EventStore` | read/write, versioned | **The Builder operates entirely here.** |
| **TELEMETRY** | `LiveStore` | one-way: world → store → views | Builder reads projected values only; never writes. |
| **COMMAND** | Command Service (backend) | views initiate, backend executes | Not used by the Builder. |

---

## 1. State Machine (FSM)

**Source:** `src/builder/builder-state.ts`, reducer in `src/builder/BuilderContext.tsx`.

The Builder is driven by a pure finite-state machine. State is held in React via `useReducer`;
every transition is a pure function returning a new `BuilderState`. No side effects, no Graph writes.

```
BuilderMode =
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                    │
  │   idle ──START_PLACING──▶ placing ──(place on canvas)──▶ idle      │
  │    │  ◀─CANCEL_PLACING──────┘                                      │
  │    │                                                               │
  │    ├─SELECT_COMPONENT──▶ selected-component ─CLEAR_SELECTION─▶ idle │
  │    │                                                               │
  │    ├─SELECT_CONNECTION─▶ selected-connection ─CLEAR_SELECTION▶ idle │
  │    │                                                               │
  │    └─START_CONNECTING──▶ connecting ──CANCEL_CONNECTING──▶ idle     │
  │            (latent — see note)                                     │
  └──────────────────────────────────────────────────────────────────┘
```

### States
| Mode | Meaning | Extra state |
|------|---------|-------------|
| `idle` | Nothing selected, nothing pending. | — |
| `placing` | A type was picked from the palette; the cursor "carries" it. | `pendingTypeId` |
| `connecting` | A source port is chosen; awaiting a target. | `pendingFromPort` |
| `selected-component` | A component is selected (drives the property panel). | `selectedComponentId` |
| `selected-connection` | A connection is selected. | `selectedConnectionId` |

### FSM actions (`FsmAction`, reduced in `fsmReducer`)
`START_PLACING` · `CANCEL_PLACING` · `START_CONNECTING` · `CANCEL_CONNECTING` ·
`SELECT_COMPONENT` · `SELECT_CONNECTION` · `CLEAR_SELECTION`.

### ⚠ Known facts / gaps
- **`connecting` is latent.** The FSM models a `connecting` mode, but the UI creates connections via
  React Flow's native handle-drag (`onConnect`), **not** via `START_CONNECTING`. The mode is dead in
  practice. Reconcile when implementing **ZB-021** / **ZB-029**.
- **The FSM only covers Build mode.** Monitor-mode selection is separate React state — see §3.
- There is **no `dragging`, `box-selecting`, or `multi-select` FSM state** despite the blueprint
  depicting them; multi-select is tracked outside the FSM via React Flow selection events (**ZB-020**).

---

## 2. Component lifecycle

**Sources:** `builder-actions.ts`, `BuilderContext.tsx`, `graph-engine.ts`.

```
 PLACE ─▶ (exists) ─┬─▶ MOVE      (drag-stop / nudge → new position)
                    ├─▶ RENAME    (inspector / F2*)
                    ├─▶ DUPLICATE (Ctrl+D / context menu)
                    └─▶ DELETE    (blocked while connections reference it)
```

| Action | useBuilder method | builder-action | Engine call | Notes |
|--------|-------------------|----------------|-------------|-------|
| Place | `placeComponent` | `placeComponent` | `addComponent` | id = `cmp_` + 8 hex; validates `typeId` in registry; `bindings: []`. |
| Move | `moveComponent` | `moveComponent` | `updateComponent` | only `position` changes; persisted on drag-stop. |
| Rename | `renameComponent` | `renameComponent` | `updateComponent` | rejects empty/whitespace name. |
| Duplicate | `duplicateComponent` | `duplicateComponent` | `addComponent` | name + " (copy)", position + {40,40}. |
| Delete | `deleteComponent` | `deleteComponent` | `removeComponent` | **engine blocks if any connection references the component.** |

\* F2 rename is documented but not yet wired (**ZB-022/ZB-026**).

### ⚠ Delete is a silent dead-end today
`removeComponent` throws when connections still reference the component; the keyboard/menu handlers
wrap it in an empty `catch`, so the user sees nothing. Fix = **ZB-007** (delete-with-pipes).

---

## 3. Selection model

**Sources:** `MissionControlView.tsx` (Monitor), `BuilderContext`/FSM (Build).

There are **two disjoint selection systems** today:

```
 MONITOR mode          BUILD mode
 ───────────           ──────────
 local React state     FSM state
 selectedComponentId   state.selectedComponentId / selectedConnectionId
 (useState)            (useReducer)
        │                     │
        └── do NOT share ─────┘   ← switching modes loses selection
```

- **Monitor:** `selectedComponentId` `useState` in `MissionControlView`; drives `InspectorPanel`;
  ESC clears it (guarded so it doesn't collide with presentation-mode ESC).
- **Build:** the FSM holds the selection; drives `BuilderPropertyPanel`; ESC clears or cancels placing.
- **Multi-select (Build only):** tracked in `multiSelectedIds` `useState`, fed by React Flow's
  `onSelectionChange`. Used solely for Ctrl+D today.

**Target:** unify into one selection concept — **ZB-020** (unblocks batch ops **ZB-024**).

---

## 4. Connection model

**Sources:** `domain/types.ts` (`Connection`), `port-validator.ts`, `graph-engine.addConnection`.

A `Connection` links an **outlet/bidirectional** port on one component to an **inlet/bidirectional**
port on another, carrying a `medium` and a `topologicalDirection` (`forward` | `bidirectional`).

```
 Component A                         Component B
 ┌─────────┐   medium (hot_water)    ┌─────────┐
 │  outlet ○───────────────────────▶○ inlet   │
 └─────────┘   topologicalDirection └─────────┘
              = forward
```

### Two creation paths (redundant — see ZB-021/ZB-029)
1. **Drag-to-connect (primary, canvas):** React Flow handle→handle → `FlowMap.onConnect` →
   `MissionControlView.handleConnect`. Medium is **inferred from the source port** definition;
   direction defaults to `forward`. On engine error a red toast appears (auto-dismiss 3.5 s).
2. **Form (secondary, panel):** the 4-step cascade of `<select>`s under "פרטים נוספים" in
   `BuilderPropertyPanel` → `validateConnectionDraft` → `connectPorts`.

### Deletion
- Selected edge + Delete key → `handleEdgeDelete` → `disconnectPorts` → `removeConnection`.
- Or the connection-selected property panel's "מחק צינור" button.
- id = `cn_` + 8 hex.

---

## 5. Drag & Drop lifecycle

**Sources:** `BuilderPalettePanel.ComponentCard`, `FlowMap.DropZoneCapture`, `MissionControlView`.

```
 PALETTE                         CANVAS (FlowMap, [data-flowmap-drop])
 ───────                         ─────────────────────────────────────
 dragstart                       dragover  → preventDefault
   set dataTransfer                        → dropEffect = 'copy'
     'application/zentro-type'             → add .flowmap-drag-active (glow)
   build neon ghost pill         dragleave → remove glow (if truly leaving)
        │                        drop      → read 'application/zentro-type'
        ▼                                  → screenToFlowPosition(clientX,Y)
   (user drags) ───────────────────────────▶ onDropComponent(typeId, x, y)
                                                   │
                                                   ▼
                                  MissionControlView.handleDropComponent
                                  → auto-name "<label> N" → placeComponent
                                  → CANCEL_PLACING → onMutation()
```

### Alternative: click-to-place (FSM path)
Palette card click → `START_PLACING(typeId)` → cursor shows crosshair, placing banner appears →
canvas `onPaneClick` → `handlePaneClick` → place at a staggered position → `CANCEL_PLACING`.

### ⚠ Two placement code paths reach the same outcome (**ZB-029**). The drag ghost (a pill) does not
resemble the placed node (full SVG) — visual-parity follow-up under **ZB-012**.

---

## 6. Validation engine

**Source:** `src/builder/port-validator.ts` (pre-flight) + `graph-engine.addConnection` (authoritative).

Validation is **non-blocking** (principle: never block the canvas). Errors render in the property
panel or as a transient toast; no modal dialogs.

`validateConnectionDraft(draft, registry, existingConnections)` returns **all** violations at once:

| # | Rule | Message domain |
|---|------|----------------|
| 1 | No self-loop (`from ≠ to` component) | "Cannot connect a component to itself." |
| 2 | Source port exists on the source type | "Port … does not exist…" |
| 3 | Target port exists on the target type | "Port … does not exist…" |
| 4 | `medium` matches the **source** port medium | "Medium … does not match source port…" |
| 5 | `medium` matches the **target** port medium | "Medium … does not match target port…" |
| 6 | Source port is **not** an `inlet` (must be outlet/bidirectional) | "… is an inlet…" |
| 7 | Target port is **not** an `outlet` (must be inlet/bidirectional) | "… is an outlet…" |
| 8 | No duplicate connection (same from/to component+port) | "A connection … already exists…" |

The drag-to-connect path currently relies on the engine's own checks and shows a single toast on
failure; it does **not** pre-compute compatible targets. Surfacing rules 4–7 **before** drop is
**ZB-021**.

---

## 7. Property panel lifecycle

**Source:** `src/app/builder/BuilderPropertyPanel.tsx`.

The panel is a pure function of the FSM mode:

```
 mode = idle | placing | connecting   →  blank slate ("בחר רכיב לעריכה", ✦)
 mode = selected-connection           →  connection card (from → medium → to) + delete
 mode = selected-component            →  hero (illustration + name + duplicate/delete)
                                          + ports status list
                                          + "פרטים נוספים" expander:
                                                · rename input
                                                · 4-step new-connection form
```

- A `useEffect` keyed on `selectedId` re-syncs the rename value and **resets the expander to collapsed**
  on every selection change — the root of the rename friction (**ZB-022**).
- A custom DOM event `zentro:builder:focusRename` lets the context menu focus the rename input.

---

## 8. Command flow (write path)

```
 UI event (click / drag / key)
        │
        ▼
 useBuilder().<mutation>()            ── React layer (BuilderContext)
        │
        ▼
 builder-actions.<action>()           ── high-level CONFIG action
        │
        ▼
 graph-engine.<mutation>()            ── authoritative; for every write:
        │   1. validate
        │   2. write GraphStore            (source of truth)
        │   3. VersionStore.record(...)    (monotonic version++)
        │   4. EventStore.append(event)    (append-only, Art. 13)
        ▼
 MutationResult { data, event }
        │
        ▼
 onMutation()  →  setNowMs(Date.now())   ── triggers re-projection + re-render
```

Every mutation already produces a `DomainEvent` and bumps a version. **This is the substrate for
undo/redo** (**ZB-005**): the missing piece is a command layer that records each operation's inverse.

---

## 9. Event flow

**Sources:** `domain/event-store.ts`, `domain/events.ts`, `domain/project-version.ts`.

- `EventStore` is **append-only**, keyed by `projectId` (Constitution Art. 13).
- Every CONFIG mutation appends a typed `DomainEvent` and `VersionStore` increments
  (`version` starts at 1; `getCurrentVersion` returns 0 when none).
- **Today nothing in the UI consumes events** — no history view, no undo, no version restore,
  despite the stores existing. Consumption is planned: **ZB-005** (undo) and the deferred
  history/versioning UI (out of scope appendix).

---

## 10. Render flow (read path)

**Sources:** `flow-transformers.ts`, `useElkLayout.ts`, `FlowMap.tsx`, `renderer/components/nodes/*`.

```
 GraphStore.getComponents / getConnections      (CONFIG source of truth)
        │
        ▼
 useProjection(...) → componentVMs / connectionVMs   (CONFIG + TELEMETRY → view models)
        │
        ▼
 buildFlowGraph(components, connections, VMs)   → { nodes, edges }
        │
        ▼
 useElkLayout(nodes, edges)                     → { layoutNodes, isReady }
        │
        ▼
 FlowMap → <ReactFlow nodeTypes=NODE_TYPES edgeTypes=EDGE_TYPES>
        │      · typeId → node component (TankNode, PumpNode, …, GenericNode fallback)
        │      · flowEdge → FlowEdge
        │      · measuredRef preserves handleBounds across the 1 s refresh tick
        ▼
 SVG nodes + animated pipe edges
```

### ⚠ Layout ownership is ambiguous
`useElkLayout` re-lays-out while `moveComponent` also persists manual positions. The recent
"canvas collapses to zero width in Build Mode" bug originates here. Fix = **ZB-008** (make ELK an
explicit "auto-arrange," never silently overwrite manual positions). The 1 s refresh re-creates node
objects each tick; `measuredRef` exists specifically to stop React Flow from resetting
`measured`/`handleBounds` (and hiding nodes) on every tick — preserve this when refactoring.

---

## 11. Interaction → implementation index

A quick map from a user interaction to the code that handles it (entry points for Phase 4):

| Interaction | Entry point |
|-------------|-------------|
| Pick from palette (click) | `BuilderPalettePanel.handleSelect` → `START_PLACING` |
| Pick from palette (drag) | `ComponentCard.handleDragStart` (sets `application/zentro-type`) |
| Drop on canvas | `FlowMap.DropZoneCapture` → `handleDropComponent` |
| Click empty canvas while placing | `FlowMap.onPaneClick` → `handlePaneClick` |
| Select node | `FlowMap.onNodeClick` → `handleSelectComponent` |
| Select edge | `FlowMap.onEdgeClick` → `handleEdgeClick` |
| Drag node | `FlowMap.onNodeDragStop` → `handleNodeMoved` |
| Connect (drag handle) | `FlowMap.onConnect` → `handleConnect` |
| Delete (key) | `MissionControlView` keydown → `deleteComponent` / `disconnectPorts` |
| Duplicate | Ctrl+D / context menu → `duplicateComponent` |
| Right-click node | `FlowMap.onNodeContextMenu` → `BuilderContextMenu` |
| Box / multi select | `FlowMap.onSelectionChange` → `multiSelectedIds` |
| Rename | `BuilderPropertyPanel` expander / `zentro:builder:focusRename` event |
| Switch mode | header toggle → `setBuildMode` in `ZentroApp` |

---

## 12. Architectural invariants to preserve (do not break in Phase 4)

1. React holds **FSM state only**; CONFIG writes go **only** through `builder-actions` → `graph-engine`.
2. The **GraphStore is the single source of truth**; projections/render are derived, never authoritative.
3. Mutations remain **validated → versioned → evented** (keep the `MutationResult { data, event }` contract).
4. **Never block the canvas**: validation and errors are non-modal.
5. Telemetry and Command planes stay **out** of the Builder.
6. Keep `measuredRef` (or an equivalent) so the 1 s refresh tick never hides nodes.
