# Stage 35 — Documentation vs Implementation Audit

Purpose: every capability the blueprint/keyboard reference claims is listed here with
its real status in the code as of the start of Stage 35 (`65fe3ad`). Each gap is either
**implemented** during Stage 35 (P0/P1) or the **claim is removed** from the docs.
The rule: docs must never advertise a capability that does not exist.

Source of current keyboard handling: `src/app/mission-control/MissionControlView.tsx`
(build-mode `keydown` handler) — at baseline it implements only `Escape`,
`Delete`/`Backspace`, and `Ctrl+D`.

## Keyboard shortcuts

| Shortcut | Blueprint claim | Baseline status | Stage 35 plan |
|---|---|---|---|
| `Ctrl+Z` | Undo, 50-step stack | ❌ not implemented | Implement (P0-2) |
| `Ctrl+Y` | Redo | ❌ not implemented | Implement (P0-2) |
| `Ctrl+Shift+Z` | Redo (alt) | ❌ not implemented | Implement (P0-2) |
| `Ctrl+A` | Select all | ❌ not implemented | Implement (P1) |
| `Escape` | Cancel placing / connecting / clear selection | ✅ implemented | Keep |
| `Shift+Click` | Add to selection | ⚠️ partial (multi-select state exists) | Verify + finish (P1) |
| `Ctrl+C` | Copy selection | ❌ not implemented | Implement (P1) |
| `Ctrl+V` | Paste (+40,+40 offset) | ❌ not implemented | Implement (P1) |
| `Ctrl+D` | Duplicate | ✅ implemented | Keep |
| `Delete` / `Backspace` | Delete component / connection / group | ⚠️ partial — silently blocked when component has pipes | Fix dead-end: "delete with its pipes" (P0-4) |
| `Ctrl+=` | Zoom in | ❌ not implemented | Implement or remove claim (P0-3) |
| `Ctrl+-` | Zoom out | ❌ not implemented | Implement or remove claim (P0-3) |
| `Ctrl+0` | fitView | ❌ not implemented | Implement (P0-3) |
| `→ ↑ ↓ ←` | Nudge 20px | ❌ not implemented | Implement (P0-3) |
| `Shift+Arrow` | Nudge 4px | ❌ not implemented | Implement (P0-3) |
| `F2` | Rename selected | ❌ not implemented | Implement, not buried (P1) |

## Capabilities

| Capability | Blueprint claim | Baseline status | Stage 35 plan |
|---|---|---|---|
| Save / load | implied by "Builder" | ❌ none — reload destroys design | Storage port + localStorage autosave (P0-1) |
| Export / import JSON | — | ❌ none | JSON export/import via storage abstraction (P0-1) |
| Undo toast (3s) | "[action] הוסר" + Ctrl+Y hint | ❌ none | Implement with undo (P0-2) |
| Zone navigation (קומה 1/2/גג) | mocked in monitor | ❌ not built (flat canvas) | Out of scope — **remove claim from docs** |
| 50-step history | principle 06 | ❌ none | Implement bounded stack (P0-2) |

## Decisions
- Items marked "Implement" are in Stage 35 scope (P0/P1).
- "Zone navigation" is explicitly out of Stage 35 scope (no new modules) → the doc claim
  will be softened/removed rather than implemented.

---

## Stage 35 progress update (Builder Completion)

The following previously-missing capabilities are now IMPLEMENTED and covered by
tests + a clean production build:

- **Save / load / autosave / export / import** — `src/persistence/*`, Build-mode
  toolbar (שמור / ייצוא / ייבוא). Behind a `ProjectRepository` port; documents
  carry `kind: 'zentro.digital-twin.document'`; alarm rules persisted.
- **Undo / redo** — `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`, bounded 50-step history
  (`src/builder/graph-history.ts`), with a 3s toast. Unit + end-to-end tests.
- **Copy / paste** — `Ctrl+C` / `Ctrl+V` with cascading offset and internal-edge
  recreation (`src/builder/clipboard.ts`).
- **Build-mode direct positioning** — stored `component.position` is honoured
  (no ELK reshuffle); Monitor still auto-layouts.
- **Connection valid/invalid highlighting** — `isValidConnection` (port validator)
  prevents invalid drops; green/red handle glow + larger hit radius for easier
  connecting.

Still pending (tracked separately, NOT claimed as done in-product):
- Arrow-key nudge, `Shift+Arrow` fine nudge, `F2` rename shortcut, `Ctrl+0`
  fitView, `Ctrl+A` select-all, zone/floor navigation.
