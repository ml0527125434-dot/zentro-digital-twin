# Zentro Builder — Engineering Visual Specification (P&ID / Revit-lite)

Status: **DRAFT for approval.** No code until this is approved.
Scope: Build-Mode visual + interaction language only. No backend, no new equipment
types, no domain/architecture changes. Evolves the existing React Flow Builder.

Grounding (current code): edges render with `getBezierPath` (diagonal) in
`src/renderer/components/edges/FlowEdge.tsx`; every node already mounts React Flow
`Handle`s on its correct side (`Position.Left/Right/Top/Bottom`) per the definition
`anchor`; the canvas grid is `Background gap=32` while `snapGrid=[20,20]` (mismatched);
ELK auto-layout exists (`useElkLayout` / `elk-layout.ts`) but is bypassed in Build
mode (stored positions win). Medium colors already exist in `FlowEdge` and `theme`.

The target: when two components connect, the user sees an **organized orthogonal
pipe route with proper elbows and a flow arrow**, equipment sitting on a visible
engineering grid — a technical drawing, not a graph toy.

---

## 0. Design tokens (single source of truth)

These become CSS variables / constants consumed everywhere. Numbers are the spec.

| Token | Value | Notes |
|---|---|---|
| `GRID` | **20 px** | visible grid == snap step (must match) |
| `SNAP` | **20 px** | equipment + routing snap to this |
| `PORT_PITCH` | **20 px** | min spacing between two ports on the same side |
| `PIPE_MIN_PARALLEL_GAP` | **16 px** | min gap between parallel pipe runs |
| `ELBOW_RADIUS` | **3 px** | near-sharp 90° corner (technical, not bubbly) |
| `PORT_SIZE` | **9 px** | square port glyph on the equipment outline |
| `PORT_STUB` | **6 px** | short stub line from port into the pipe |
| `COMPONENT_GAP_MIN` | **40 px** (2 grid) | min clear distance between equipment |
| `LABEL_GAP` | **6 px** | gap between equipment and its name |

### Medium → color (locked; already in code)
| Medium | Color | Hebrew |
|---|---|---|
| hot_water | `#f97316` | מים חמים |
| cold_water | `#38bdf8` | מים קרים |
| recirc | `#2dd4bf` | סירקולציה |
| gas | `#fbbf24` | גז |
| electric | `#a78bfa` | חשמל |
| air | `#94a3b8` | אוויר |
| mixed/unknown | `#64748b` | מעורב |

### Medium → pipe thickness (toned down from today's 7–10 px "toy" pipes)
| Class | Width (rest) | Width (live flow) |
|---|---|---|
| hot_water | 5 px | 6 px |
| cold_water / recirc | 4.5 px | 5.5 px |
| gas / electric | 4 px | 5 px |
| air / other | 3.5 px | 4.5 px |

Rationale: thin, consistent strokes read as engineering line-work; thick neon
strokes read as a game.

---

## 1. Pipe routing rules

1.1 **Orthogonal only.** Every pipe is composed of horizontal + vertical segments.
No diagonal segments, ever. Implementation: replace `getBezierPath` with
`getSmoothStepPath` (React Flow built-in) using `borderRadius = ELBOW_RADIUS`.

1.2 **Elbows.** Each 90° turn renders as a single corner with `ELBOW_RADIUS=3px`
(near-sharp). No multi-bend wandering: smoothstep produces the minimal Z/L route
between the two port sides.

1.3 **Exit/entry direction.** A pipe leaves a source port **perpendicular** to the
equipment edge the port sits on (right port → exits right, top port → exits up),
and enters the target port perpendicular as well. This is automatic from the
handle `Position` already set on every node.

1.4 **Tee junctions (T).** A tee appears wherever **3 pipes meet at one component
port-cluster** (e.g., a manifold supply with multiple branches, or a recirc return
into a tank). Rendered as: the pipes meet at a shared point with a **filled
junction dot** (`r = pipe width`, medium color). Mid-pipe branching (tapping into
the middle of an existing pipe) is **out of scope for v1** — branches originate at
component ports only. (Document as future.)

1.5 **Cross junctions (+).** True 4-way crossings are **avoided** by routing. When
two unrelated pipes must cross, the crossing renders with a **"hop" (small arc
bridge)** on the pipe drawn second, so it's clear they are not connected. v1 may
ship without hops (simple overlap) and add hops in a later step — flagged.

1.6 **Pipe spacing.** Parallel runs keep ≥ `PIPE_MIN_PARALLEL_GAP (16px)`. Achieved
by port pitch (1.x) + auto-layout spacing; not individually hand-routed in v1.

1.7 **Flow arrows.** Direction is shown by a **static arrowhead at the pipe
midpoint** (filled triangle, medium color), always visible at rest — this is the
P&ID convention and the single most important "not a toy" signal. Live flow
(Monitor) adds the existing animated dashes/markers on top.

1.8 **Animated flow rules.** Animation is **Monitor-only / live-data-only**. In
Build Mode pipes are **static** (arrowhead + solid stroke) — an editor should be
calm. Flow animation states stay as today: flowing = forward dashes, reverse =
reverse dashes, no-flow = static, alarm = red. Build Mode forces "static".

---

## 2. Port model

2.1 **Where ports appear.** Each port is fixed to the side given by its definition
`anchor` (left/right/top/bottom). Multiple ports on one side are distributed evenly
with `PORT_PITCH=20px` spacing. (Most components already do this; spec makes it
uniform.) Inlets conventionally on the left/bottom, outlets on the right/top.

2.2 **How ports look.** A **9px square** sitting centered on the equipment outline
(half inside / half outside), filled with the **medium color**, 1.5px dark border,
plus a **6px stub line** continuing the pipe direction. At rest in Build Mode ports
are visible but quiet (60% opacity). Not floating neon circles.

2.3 **Hover behavior.** Hovering a port: scales to ~1.4×, full opacity, shows a
small Hebrew tooltip `role · medium` (e.g., "כניסה · מים חמים"). Cursor =
crosshair. Hovering equipment reveals all its ports at full opacity.

2.4 **Valid / invalid target behavior.** While dragging a pipe from a source port
(`isValidConnection`, already wired to the port validator): compatible target ports
glow **green** with a ring; incompatible ports dim to 30% and show **red** if hovered;
the live preview pipe is the source medium color. Invalid release = no pipe + brief
red flash (today's behavior kept).

2.5 **Magnetic snapping.** Pipe endpoints snap to the nearest valid port within
`connectionRadius = 28px` (already set). Increase the perceived magnetism: when the
cursor is within radius, the preview pipe locks onto the port and the port enlarges.

2.6 **Physical attachment.** The pipe's first/last segment is **collinear with the
port stub** so the pipe visibly grows out of the equipment, with the junction dot
hidden under the port glyph. No gap, no overshoot between pipe end and equipment.

---

## 3. Grid and snapping

3.1 **Grid size.** Visible background grid = **20px** lines (fix today's 32px),
with a heavier line every **5th** (100px) for an engineering "major/minor" grid.

3.2 **Snap size.** Equipment position snaps to **20px**. Visible grid == snap, so
equipment always lands on a visible line (this is the core "aligned/CAD" feeling).

3.3 **Alignment rules.** On drop and on drag-stop, equipment origin snaps to grid.
Ports therefore also fall on/near grid, helping pipes run on grid lines.

3.4 **Smart guides.** When moving a component, show **alignment guides** (thin
cyan dashed lines) when its center/edges align with another component's
center/edges, with a soft snap to that alignment. (New, small; Step 4.)

3.5 **Component spacing.** Auto-layout enforces ≥ `COMPONENT_GAP_MIN=40px`.
Manual placement is free but smart guides + grid discourage overlap.

3.6 **Minimum distances.** No hard block on overlap in v1 (keep freedom), but
auto-layout and guides keep a clean ≥40px gap.

---

## 4. Equipment layout rules

4.1 **Standard footprints** (grid-aligned; based on current SVG sizes). Each type
declares a footprint in grid units so everything is visually consistent:

| Class | Footprint | Example |
|---|---|---|
| Tank (storage/buffer) | 120 × 160 | upright cylinder |
| Source (heat pump / gas / electric / solar / exchanger) | 140 × 120 | box |
| Pump | 80 × 80 | circle on the line |
| Valve | 70 × 70 | bowtie/diamond |
| Sensor / meter | 56 × 56 | small circle |
| Consumer (shower/tap) | 90 × 110 | fixture |
| Manifold | 160 × 60 | horizontal bar |

4.2 **Orientation.** Fixed per type in v1. Inlets/outlets on the sides defined by
`anchor`. **Rotation is out of scope for v1** (note as future; would require port
re-anchoring + routing recompute).

4.3 **Connection sides.** As defined by `anchor` today (e.g., tank: cold_in bottom,
hot_out top, heat_in left, recirc_in right). Spec freezes these conventions:
- Sources: outlet **right**, inlet **left**.
- Pumps/valves/sensors: inlet **left**, outlet **right** (sit on a horizontal line).
- Tanks: hot_out **top**, cold_in **bottom**, heat in **left**, recirc **right**.

4.4 **Naming placement.** Component Hebrew name centered **below** the symbol,
`LABEL_GAP=6px` under it, 10–11px, weight 600, **not uppercase**, single line with
ellipsis. Type sublabel optional in inspector only, not on canvas.

4.5 **Selection behavior.** Selected equipment: 1.5px accent outline + corner
handles; ports stay visible. Multi-select: each selected gets the outline + a
shared light bounding rectangle. Hover (unselected): subtle outline only.

---

## 5. Builder workflows (behavioral contract — mostly already implemented)

| Action | Gesture | Result |
|---|---|---|
| Add component | drag from palette → drop, OR click card → click canvas | placed at cursor, snapped to grid, Hebrew auto-name |
| Move component | drag body | follows cursor, snaps on release, smart guides |
| Connect | drag port → port | orthogonal pipe with elbow + arrow; valid/invalid highlight |
| Delete pipe | select pipe → Delete, or pipe context delete | pipe removed |
| Delete component | select → Delete | component + its pipes removed (cascade) |
| Multi-select | Shift-click / box-select / Ctrl+A | group selected (persists) |
| Move group | drag any selected | all move together, snap |
| Copy / paste | Ctrl+C / Ctrl+V | offset clones incl. internal pipes |
| Duplicate | Ctrl+D | offset clone |
| Undo / redo | Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z | 50-step, toast |
| Auto-layout | "סדר אוטומטית" button | ELK orthogonal tidy (Section 6) |

This section is a **regression contract**: the visual rework must not break any row.

---

## 6. Auto-layout

6.1 **When it runs.** **On demand only**, via a Build-Mode "סדר אוטומטית" button.
Never automatically in Build Mode (manual positions are sacred while editing).
Monitor Mode continues to auto-layout for display.

6.2 **Manual vs automatic.** Build Mode = stored positions (manual). Pressing the
button computes ELK positions, applies them as the new stored positions (so it's
undoable and persisted). User can then nudge.

6.3 **ELK settings.**
- `elk.algorithm: layered`
- `elk.direction: RIGHT` (flow left→right: source → storage → distribution → consumer)
- `elk.edgeRouting: ORTHOGONAL`
- `elk.layered.spacing.nodeNodeBetweenLayers: 80`
- `elk.spacing.nodeNode: 60`
- `elk.layered.spacing.edgeNodeBetweenLayers: 24`
- snap resulting coordinates to `GRID`.

6.4 **Direction rules.** Primary flow axis is horizontal (RIGHT). Vertical is used
for branches (multiple consumers/zones stack vertically).

6.5 **Pipe routing after layout.** Pipes remain smoothstep orthogonal; ELK's
orthogonal routing aligns nodes so the smoothstep routes look clean (minimal bends).

6.6 **Preserving user positions.** Auto-layout is explicit and undoable (one history
entry). Nothing reflows behind the user's back. Telemetry/ViewModel updates never
trigger layout (already guaranteed by the topology-key memo).

---

## 7. Visual language

7.1 **Style target:** P&ID / Revit-lite. Thin consistent orthogonal line-work,
equipment as clean schematic symbols on a visible engineering grid, a muted
technical palette where **color encodes medium**, calm at rest.

7.2 **Must NEVER look like a toy:**
- ❌ diagonal or curved pipes
- ❌ thick neon strokes with big glow halos
- ❌ floating circular "dots" as ports
- ❌ constant animation/pulsing while editing
- ❌ equipment floating at random sub-grid offsets
- ❌ English ALL-CAPS labels

7.3 **What makes it feel professional:**
- ✅ 90° pipe runs on grid lines, sharp small elbows
- ✅ static direction arrowheads (P&ID convention)
- ✅ ports as square stubs physically attached to equipment
- ✅ everything aligned to a visible major/minor grid
- ✅ thin, medium-colored lines; restrained motion (motion = live data only)
- ✅ Hebrew names below symbols

7.4 **Acceptable vs unacceptable (pipe example):**
- Acceptable: tank `hot_out` (top) → rises 1 grid → turns right (3px elbow) → runs
  horizontally on a grid line → turns down into pump `in` (left), thin orange 5px,
  small arrowhead at midpoint.
- Unacceptable: a 10px glowing orange bezier curving diagonally across the canvas
  with three animated chevrons while nothing is flowing.

---

## 8. Implementation stages (small, verified, no big-bang)

Each stage: independently shippable, build + tests + Chrome check, one commit.

**Stage A — Orthogonal pipes + elbows + static arrow**
- Objective: replace bezier with smoothstep; add static midpoint arrowhead; keep
  colors/animation/label/hit-area; Build Mode = static.
- Files: `src/renderer/components/edges/FlowEdge.tsx` (+ maybe `flow-transformers` for a `builderMode` flag passed via edge data).
- Risk: Low (single edge component; path source swap).
- Validation: build; renderer smoke test; Chrome — connect two nodes, see 90° route + arrow.
- Done when: no diagonal pipes anywhere; arrow visible at rest; Monitor animation intact.

**Stage B — Grid/snap alignment**
- Objective: background grid = 20px with major line every 100px; snapGrid stays 20; equipment lands on visible lines.
- Files: `src/renderer/components/FlowMap.tsx` (Background gap + a second Background for major lines).
- Risk: Low.
- Validation: Chrome — drop equipment, verify it sits on a visible line; build.
- Done when: visible grid == snap; placement looks aligned.

**Stage C — Pipe thickness + medium palette polish**
- Objective: apply Section 0 thicknesses (toned down); ensure Build Mode strokes are calm.
- Files: `FlowEdge.tsx`.
- Risk: Low.
- Validation: Chrome visual; renderer smoke test.
- Done when: pipes read as technical line-work, not neon.

**Stage D — Port glyph redesign (attached square stubs)**
- Objective: render ports as 9px squares on the outline with a 6px stub; hover scale + Hebrew tooltip; valid/invalid green/red (reuse existing isValidConnection).
- Files: `src/styles.css` (handle styling, build-scoped), possibly a shared `PortHandle` wrapper; touch node files only if needed for stub.
- Risk: Medium (touches handle visuals across nodes; keep it CSS-first to avoid editing 11 node files).
- Validation: Chrome — hover ports, drag-connect shows green/red; build.
- Done when: ports look attached; no floating dots; validity obvious.

**Stage E — Smart alignment guides**
- Objective: while dragging, show cyan dashed guides when edges/centers align; soft snap.
- Files: `FlowMap.tsx` (a helper component using node positions) or a small overlay; React Flow `onNodeDrag`.
- Risk: Medium (drag-time computation).
- Validation: Chrome — drag a node near another, see guide + snap; build.
- Done when: aligning two components is effortless.

**Stage F — "סדר אוטומטית" (on-demand ELK orthogonal)**
- Objective: Build-Mode button runs ELK (Section 6 settings), applies snapped positions as a single undoable mutation.
- Files: `MissionControlView.tsx` (button + handler), reuse `elk-layout.ts`/`useElkLayout` logic invoked imperatively; i18n key.
- Risk: Medium (must write positions through the engine so undo/autosave work; must not fight the topology memo).
- Validation: Chrome — messy layout → one click → tidy orthogonal; Ctrl+Z restores; build + suite.
- Done when: one click produces a clean engineering layout; undoable; persisted.

**Stage G — Tee junction dots + (optional) crossing hops**
- Objective: filled junction dots where 3 pipes share a port-cluster; optionally hops on crossings.
- Files: `FlowEdge.tsx` / a junction overlay.
- Risk: Medium–High (geometry); ship dots first, hops flagged optional.
- Validation: Chrome — manifold/tank with 3 pipes shows clean tee; build.
- Done when: multi-pipe meetings read as engineering tees, not overlaps.

Stages A–C are the 80/20 of "looks professional." D–F complete the CAD feel.
G is polish. Each stage is revertible and does not depend on later stages.

---

## Out of scope (explicit, for this direction)
- Backend, new equipment types, domain/schema changes.
- Rotating equipment; mid-pipe branch taps; true-physical-scale dimensions
  (no per-type dimension data exists).
- Monitor-mode redesign (only inherits the new edge/grid where shared).

## Open decisions for you to confirm before coding
1. **Elbows:** near-sharp 3px (spec default) vs fully sharp 0px vs rounded 8px?
2. **Grid module:** 20px (matches current snap) vs 24px (a touch roomier)?
3. **Pipe thickness:** the toned-down 4–6px set above — OK, or keep them bolder?
4. **Crossing hops (Stage G):** ship in v1, or defer?

---
---

# ADDENDUM (supersedes the ordering in Section 8)

## 9. Full-page engineering workspace layout

The Builder must stop being "a component inside a page" and become a **full-page
engineering environment** (full viewport in Build mode / a dedicated route).

```
┌───────────────────────────────────────────────────────────────────────────┐
│  TOP TOOLBAR  (44px, full width)                                            │
│  [מצב: בנייה|ניטור]  | קובץ: חדש שמור ייצוא ייבוא | עריכה: ↶ ↷ ⧉ 🗑 |        │
│  פריסה: סדר-אוטומטית · התאם · 100% | תצוגה: רשת ⊞ | חיפוש 🔍                │
├───────────┬───────────────────────────────────────────────┬───────────────┤
│  LEFT      │                                               │  RIGHT        │
│  LIBRARY   │            FULL CANVAS                         │  INSPECTOR    │
│  280px     │   (grid visible across the ENTIRE area)       │  300px        │
│  collapse◄ │                                               │ ►collapse     │
│  categories│   equipment on grid · orthogonal pipes        │ selected item │
│  + search  │                                               │ or group      │
│  + cards   │   [zoom − / 100% / + ] [fit] [pan]  (bottom-L)│ or empty      │
├───────────┴───────────────────────────────────────────────┴───────────────┤
│  BOTTOM STATUS / VALIDATION BAR  (28px, full width)                         │
│  ● מוכנות: 3 אזהרות תכן  |  נבחרו: 2  |  זום 100%  |  X:120 Y:80  | נשמר ✓  │
└───────────────────────────────────────────────────────────────────────────┘
```

**9.1 Top toolbar (new).** Replaces the tiny header toggle. Grouped, labelled,
icon+text, Hebrew, with tooltips. Groups: Mode · File · Edit · Layout · View ·
Search. Always discoverable (addresses "discoverability of every action").

**9.2 Left library.** Collapsible (280px). Category tabs + search + equipment
cards (LEGO feel). Drag-to-canvas is the primary verb.

**9.3 Center canvas.** Fills all remaining space. Grid rendered across the whole
region (major/minor). Zoom/fit/pan controls bottom-left. This is the only place
the eye should rest.

**9.4 Right inspector.** Collapsible (300px). Empty / single-component / group /
pipe states. Inline rename. Validation messages for the selected item.

**9.5 Bottom status / validation bar (new).** Full-width, ~28px. Left: design
readiness ("מוכנות") + count of design-validation issues (e.g., "מיכל ללא מקור
חום"). Center: selection count + zoom %. Right: live cursor coords + autosave
state. This is the "design-level health" surface from the original review.

**9.6 Responsiveness.** Sidebars collapse to icons under a width threshold; the
canvas never collapses (the past 0-width bug is a hard "never again").

**9.7 What this fixes:** the current "four stacked strips above a small canvas"
becomes one calm full-page workspace with a real toolbar and a status/validation
bar — the difference between "a widget" and "an engineering tool".

---

## 10. Library research & recommendations (grounded in current ecosystem)

Principle: **do not reinvent if a quality base exists — but do not rewrite the app
either.** Zentro already runs on **React Flow (@xyflow/react v12) + elkjs**, both
healthy and capable. The recommendation is to **stay on this stack and enhance**,
not to swap canvases.

### 10.1 Canvas framework — DECISION: keep React Flow
- **JointJS** (+ libavoid) is the gold standard for P&ID and has the best
  obstacle-avoiding routing, **but** adopting it = full Builder rewrite. ❌ (violates
  "do not rewrite").
- **GoJS** — excellent, but **commercial license** (paid). ❌
- **mxGraph/draw.io, Sprotty** — heavier, different paradigm. ❌ for now.
- **React Flow** — already integrated, working, free (MIT). ✅ **Keep.**

### 10.2 Orthogonal pipe routing
- **v1 (use now): React Flow built-in `getSmoothStepPath`** — orthogonal L/Z routes
  with elbows, **zero new dependency**. Covers Stage A perfectly for port-to-port runs.
- **v2 (only if overlaps become a real problem): `@jalez/react-flow-smart-edge`** —
  maintained fork for @xyflow v12, A* **orthogonal (no-diagonal)** pathfinding that
  **routes around equipment**. Drop-in custom edge. ✅ recommended upgrade path.
- **v3 (premium, optional): `libavoid-js` / `elkjs-libavoid`** — WASM port of the
  library JointJS uses; best-in-class obstacle-avoiding orthogonal routing + nudging.
  Heavier (async WASM, ~8–11× slower than native but still fine). Consider only if
  v2 is insufficient. ⚠️ defer.
- Avoid the React Flow **Pro** "smart edge" paid example. ❌ (paid; OSS fork exists).

### 10.3 Auto-layout
- **elkjs (already installed)** with `algorithm: layered`, `edgeRouting: ORTHOGONAL`,
  `direction: RIGHT`. ✅ Official React Flow ELK examples confirm the pattern.
- Optional later: **elkjs-libavoid** for ELK placement + libavoid edge routes. ⚠️ defer.

### 10.4 Alignment guides / smart snapping
- React Flow's official **"Helper Lines"** example is **Pro (paid)**. ❌ don't buy.
- The technique is simple and documented (compute equalisation lines on
  nodeChanges). ✅ **Implement in-house** (small, Stage E). No dependency.
- Grid + snap: React Flow built-in `snapGrid` + `<Background>`. ✅ no library.

### 10.5 Symbols
- Open ISA-5.1 SVG sets exist (Wikimedia Commons; community libraries; pyDEXPI SVG
  export). **But** Zentro already has bespoke per-type SVG node renderers that look
  better and are branded.
- ✅ **Keep the existing custom symbols.** Optionally align them to ISA conventions
  for readability. Pull from an open ISA set **only** if a brand-new symbol is needed
  (none planned — "no new equipment types").

### 10.6 Net dependency impact of the plan
- **v1 (Stages A–F): ZERO new dependencies** — all from React Flow + elkjs already
  present. This is the recommended scope.
- Optional future: add `@jalez/react-flow-smart-edge` (small) and/or `libavoid-js`
  (WASM) **only** if routing quality demands it, each behind its own gated stage.

---

## 11. BINDING WORK ORDER (must follow in order; each gate needs explicit approval)

**Phase 0 — UI/UX & Library Research ONLY**  ← (this document)
- No code. No repo/source changes. Only this spec doc.
- Deliverables: complete UX spec (Sections 0–9) ✅, full-page layout (Section 9) ✅,
  library research + recommendations (Section 10) ✅.
- Exit gate: **your approval of this document** + answers to the 4 open decisions
  + sign-off on "keep React Flow, zero new deps for v1".

**Phase 1 — Visual core (after approval): Stages A → B → C**
- Orthogonal pipes + elbows + static arrow; grid/snap alignment; pipe thickness/palette.
- Zero new deps. The 80/20 of "looks professional".

**Phase 2 — Workspace shell: Section 9 layout**
- Top toolbar, full-page canvas, bottom status/validation bar, collapsible panels.

**Phase 3 — CAD interactions: Stages D → E → F**
- Attached port glyphs; smart alignment guides; on-demand ELK auto-arrange.

**Phase 4 — Polish (optional/gated): Stage G + routing upgrade**
- Tee junctions / crossing hops; evaluate smart-edge / libavoid only if needed.

Rule: do not advance a phase without your approval. Each stage inside a phase is an
independent commit with build + tests + Chrome verification.

---

## 12. Decisions still needed from you (to finalize Phase 0)
1. Elbow radius: **3px** (default) / 0 / 8px?
2. Grid module: **20px** / 24px?
3. Pipe thickness: the toned-down **4–6px** set / bolder?
4. Crossing hops (Stage G): ship v1 / defer?
5. Routing engine for v1: **smoothstep, zero-dep** (recommended) / go straight to
   smart-edge obstacle-avoidance?
6. Full-page Builder: a **dedicated route/full-viewport in Build mode** (recommended)
   / keep it inside the current ZentroApp shell but expanded?

---
---

# PART II — ENGINEERING PLATFORM SINGLE SOURCE OF TRUTH
(Design System · UX Principles · Modes · Future Vision · Mockups)
Visual mockups live in `docs/zentro-builder-mockups.html` (open in a browser).

## 13. Engineering Design System

### 13.1 Foundations — color tokens (dark engineering theme)
| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#0b0f14` | app background |
| `--bg-crust` | `#0e131a` | toolbar / status bar |
| `--bg-panel` | `#121821` | side panels |
| `--bg-elevated` | `#161d27` | cards, popovers, dialogs |
| `--border` | `#1e2a38` | hairlines, dividers |
| `--border-strong` | `#2b3a4d` | input borders, focus base |
| `--text-base` | `#e6edf6` | primary text |
| `--text-sub` | `#9fb0c3` | secondary |
| `--text-dim` | `#5c7086` | tertiary / placeholders |
| `--accent` | `#4f9cf9` | **single UI accent** (selection, active, focus) |
| `--accent-soft` | `rgba(79,156,249,0.14)` | accent fills |
| `--status-ok` | `#22c55e` | healthy / valid |
| `--status-warn` | `#f59e0b` | warning |
| `--status-error` | `#ef4444` | error / critical |
| `--status-info` | `#38bdf8` | info |

**Rule:** the UI accent (`#4f9cf9`) is **distinct from medium/pipe colors** so "what
flows" (Section 0 medium palette) never collides with "what is selected/active".
This resolves the review's "color carries two meanings" defect.

### 13.2 Typography
| Role | Family | Size / Weight |
|---|---|---|
| UI font | `--font-ui`: "Heebo", "Assistant", system-ui, sans-serif | RTL-first Hebrew |
| Numeric / values | `--font-mono`: "IBM Plex Mono", ui-monospace | `font-variant-numeric: tabular-nums` |
| Type scale | 11 / 12 / 13 / 14 / 16 / 20 / 24 px | — |
| Weights | 400 body · 600 medium · 700 strong · 800 headings | no 900 |
| Casing | never force UPPERCASE (breaks Hebrew); Title/normal only |

### 13.3 Iconography
- **One line-icon family**, 1.5px stroke, 16/20px grid. Recommend **lucide** (MIT)
  or an inline SVG set. **No emoji anywhere** (replaces ♨🛢⚙ etc. — review defect).
- Equipment symbols are a separate concern (bespoke SVG, Section 4); UI icons are
  the line set.

### 13.4 Spacing, radius, elevation (kill the "chaos" the review flagged)
- Spacing scale: **4 / 8 / 12 / 16 / 24 / 32** only.
- Radius scale: **`--r-sm:4` · `--r-md:6` · `--r-lg:8`** only (no 3/7/9/10/12/14 mix).
- Elevation: **E0** flat (border only) · **E1** panel (`1px border`) · **E2** popover
  (`0 8px 24px rgba(0,0,0,.45)` + border). Dialogs use E2 + backdrop.

### 13.5 Components (specs)
- **Toolbar** (44px): grouped icon+label buttons, 1px group separators, tooltips,
  RTL order. Active = accent text + accent-soft fill.
- **Panel** (left/right): header 30px (label + collapse), scrollable body, 1px
  divider sections.
- **Inspector**: hero (symbol + inline name), sections (connections / details),
  contextual to selection (empty / single / multi / pipe).
- **Context menu**: rows 28px, `icon · label · shortcut`, dividers, max 240px,
  E2 elevation, opens at cursor, closes on Esc / outside click.
- **Dialog**: centered, max 480px, header (title + ✕) / body / footer (secondary +
  primary). Used for destructive confirm, import errors, auto-arrange confirm.
- **Status bar** (28px): readiness · validation count · selection · zoom · coords ·
  save state.

### 13.6 Interaction states (every interactive element defines all)
| State | Treatment |
|---|---|
| Rest | `--bg-elevated` / transparent, `--text-sub` |
| Hover | +6% lightness bg, `--text-base`, cursor pointer |
| Focus (keyboard) | 2px `--accent` ring (`box-shadow: 0 0 0 2px accent`) |
| Selected / active | `--accent` text + `--accent-soft` fill + 1px accent border |
| Disabled | 40% opacity, `cursor: not-allowed`, no hover |
| Error | `--status-error` border + helper text |
| Valid (port target) | `--status-ok` ring; Invalid: `--status-error` ring |

---

## 14. Engineering UX Principles (behavior, not just looks)

14.1 **Keyboard ⟺ mouse parity.** Every action has a shortcut AND a visible control.
Nothing is mouse-only or keyboard-only.

14.2 **Mouse conventions (locked):**
- Left-click = select; left-drag on equipment = move; left-drag on pane = box-select.
- Left-drag from a port = create pipe.
- Middle-drag / right-drag = pan. Right-click = context menu.
- Scroll = zoom to cursor; Shift+scroll = horizontal pan (CAD convention).

14.3 **Drag & drop:** palette → canvas drops at cursor, snapped to grid, ghost
preview while dragging, magnetic port snapping for pipes.

14.4 **Shortcuts (canonical — the doc/impl audit must match this exactly):**
`Ctrl+Z/Y`, `Ctrl+Shift+Z`, `Ctrl+A`, `Esc`, `Shift+Click`, `Ctrl+C/V`, `Ctrl+D`,
`Delete/Backspace`, `Ctrl+= / Ctrl+- / Ctrl+0` (zoom/fit), `F2` rename, arrows nudge
(`Shift+arrows` fine), `Ctrl+S` save, `Ctrl+F` find component.

14.5 **Selection model:** one unified selection (single + multi), reflected
identically in canvas, inspector, and status bar. No two competing selection systems.

14.6 **Everything is undoable; errors never block.** No modal blocks the canvas
except explicit destructive confirms. Validation is advisory, surfaced in the status
bar + inspector, never a wall.

14.7 **RTL-first.** Hebrew is the default; layout mirrors correctly; numbers/units
stay LTR (°C, bar, kW/h).

14.8 **Calm at rest.** Motion only conveys live data (Monitor). The editor does not
animate while idle.

14.9 **Discoverability.** First-run hint, tooltips on every control, a `?` shortcuts
overlay, empty-state guidance.

---

## 15. Builder Modes (one model, multiple lenses)

| Mode | Purpose | Editable? | Panels | Motion |
|---|---|---|---|---|
| **Build** | author the system | yes (full) | toolbar, library, inspector, status | static |
| **Monitor** | observe live telemetry | no graph edits | KPIs, inspector (live), alarms, status | live animation |
| **Presentation** | stakeholder full-screen | no | canvas only (chrome hidden) | live animation |
| **Read-Only** | shared/handoff view | no | canvas + inspector (read) | optional |
| *Future: Review/Commissioning* | checklists, sign-off | annotate only | canvas + checklist | — |
| *Future: Compare/Versions* | diff two revisions | no | dual canvas / diff | — |

Principles: **one document, switchable lens** (Figma view/edit model). Selection,
zoom and focus carry across modes. Mode is explicit (toolbar), never accidental.
Build = the only mutating mode.

---

## 16. Future Vision — Builder as Zentro's engineering substrate

The Builder is **not** a hot-water tool; it is the canvas + interaction + visual
language for **every Zentro engineering domain**. Hot-water is domain #1.

Planned domains (same Builder, different registries/rules):
**Hydraulic / hot-water · HVAC · Energy · Electrical · Water · Gas.**

Design implications (so today's decisions stay scalable):
1. **Medium palette is a registry**, not hard-coded — new domains add media (e.g.,
   refrigerant, steam, 3-phase power) with colors + rules.
2. **Symbols are per-domain libraries** plugged into the same node-renderer contract.
3. **Port/medium/role model is generic** (already is) — compatibility rules are data.
4. **Validation is pluggable per domain** ("tank needs heat source" ≈ "duct needs
   AHU"); the status-bar/readiness surface is domain-agnostic.
5. **Layout (ELK), grid, routing, selection, undo, persistence** are domain-neutral
   infrastructure — built once, reused everywhere.
6. **Tokens + Design System** are global; only symbols + media + rules vary.

Decision filter from now on: *"Does this choice generalize across domains, or does it
hard-code hot-water?"* Prefer the general one.

---

## 17. UI Mockups

Static, reviewable mockups are delivered as a single self-contained file:
**`docs/zentro-builder-mockups.html`** — open directly in a browser (no dev server).

It renders, styled with the Section 13 design system:
1. Full-page Workspace (toolbar + library + canvas + inspector + status bar)
2. Toolbar (groups + states) — detail
3. Left Library (categories, search, cards)
4. Canvas (engineering grid, equipment on grid, orthogonal pipes + elbows + arrows, ports)
5. Right Inspector (empty / single / multi / pipe states)
6. Bottom Status / Validation Bar
7. Dialog (destructive confirm + import error)
8. Context Menu (canvas + component + pipe)

Mockups are **non-interactive visual targets** — the contract the implementation
must match. Approve these before any Phase 1 code.
