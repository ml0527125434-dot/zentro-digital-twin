# Zentro Digital Twin — Engineering Backlog

> **Single source of truth.** Every defect, gap, and cleanup is tracked here. All other planning
> documents defer to this file. No work item is invented as a *new feature* — every item below
> **repairs, completes, or polishes** the Builder that already exists. New-product ideas surfaced
> during review (scenes, automations, marketplace, home view, mobile) are explicitly **out of scope**
> and parked in the appendix, governed by the separate BOS roadmap.

- **Created:** 2026-06-29 · derived from `docs/ux-blueprint.html` (80 findings) + a full code audit.
- **Scope rule:** repair → complete → polish. No architectural redesign unless explicitly requested.
- **Priority order (always):** 1 correct architecture · 2 complete functionality · 3 reliability · 4 UX · 5 visual polish.

## Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Trust-breaking. The product cannot be shown to a customer until these are fixed (loses work, or claims capabilities it lacks). |
| **P1** | Coherence. The product works but feels assembled from three different apps; unify it. |
| **P2** | Completion & flow. Builder must reach Figma/FigJam/Miro table-stakes parity. |
| **P3** | Polish & cleanup. Visual refinement and technical-debt removal. |

| Effort | Wall-clock |
|--------|-----------|
| XS | < 2 h |
| S | ~ half day |
| M | 1–2 days |
| L | 3–5 days |
| XL | > 1 week |

---

## Summary table

| ID | Title | Priority | Phase | Effort | Depends on |
|----|-------|:--------:|:-----:|:------:|-----------|
| ZB-001 | Persistence design (graph + document schema, versioning, migration) | P0 | 3 | M | — |
| ZB-002 | Save / Load to local storage | P0 | 4 | M | ZB-001 |
| ZB-003 | Autosave + crash recovery | P0 | 4 | M | ZB-002 |
| ZB-004 | JSON Import / Export | P0 | 4 | S | ZB-001 |
| ZB-005 | Undo / Redo (command history) | P0 | 4 | L | ZB-006-arch |
| ZB-006 | Align documentation with reality | P0 | 1–2 | S | — |
| ZB-007 | Delete-with-pipes (remove silent delete failure) | P0 | 4 | S | — |
| ZB-008 | Stabilise ELK ↔ manual-layout interaction | P0 | 4 | M | — |
| ZB-010 | Unify design system — tokens only, one accent | P1 | 5 | L | — |
| ZB-011 | Single source of truth for component metadata | P1 | 7 | M | — |
| ZB-012 | Canvas ↔ palette visual parity | P1 | 5 | M | ZB-011 |
| ZB-013 | Separate medium-colour from status-colour | P1 | 5 | S | ZB-010 |
| ZB-014 | Fix duplicate / conflicting CSS keyframes | P1 | 7 | XS | — |
| ZB-015 | Fix Hebrew copy defects (typo, truncated labels) | P1 | 5 | XS | — |
| ZB-020 | Unify Builder ↔ Monitor selection model | P2 | 4 | M | — |
| ZB-021 | Connection UX — pre-drop compatibility hints | P2 | 4 | M | — |
| ZB-022 | Inline rename (un-bury from expander) | P2 | 4 | S | — |
| ZB-023 | Copy / Paste | P2 | 4 | M | ZB-005 |
| ZB-024 | Group operations / multi-select batch actions | P2 | 4 | M | ZB-020 |
| ZB-025 | Alignment & smart snapping | P2 | 4 | M | — |
| ZB-026 | Complete keyboard-shortcut layer | P2 | 4 | M | ZB-005 |
| ZB-027 | Canvas find / jump-to-component | P2 | 4 | S | — |
| ZB-028 | Context-menu parity & canvas-specific actions | P2 | 4 | S | ZB-024,ZB-025 |
| ZB-029 | Single placement model (reconcile click vs drag) | P2 | 4 | S | — |
| ZB-030 | Mode-switch affordance | P2 | 5 | XS | — |
| ZB-040 | Remove dead code | P3 | 7 | S | ZB-011 |
| ZB-041 | De-duplicate translations / mappings | P3 | 7 | S | ZB-011 |
| ZB-042 | Visual hierarchy, spacing, typography pass | P3 | 5 | L | ZB-010 |
| ZB-043 | Empty / hover / selection state consistency | P3 | 5 | M | ZB-010 |
| ZB-050 | Quality gate automation | P3 | 8 | S | — |

---

# P0 — Trust

## ZB-001 — Persistence design
- **Description:** Produce the complete persistence design (this is Phase 3) covering graph schema, document schema, versioning, migration strategy, autosave lifecycle, recovery, JSON import/export. No code until approved.
- **Root cause:** The product was built telemetry-first and demo-first. CONFIG lives only in an in-memory `GraphStore`; there has never been a serialization or storage layer in the app.
- **User impact:** Today a browser refresh destroys an entire plant design. This is the single highest-impact gap — it makes the Builder a demo, not a tool.
- **Technical solution:** Document schema = `SystemModel` (`{ project, operationalProfiles, components, connections, alarmRules }`) plus a wrapper envelope (`schemaVersion`, `savedAt`, `appVersion`). Reuse the existing `ingestion-contract` snapshot semantics. Define a forward-only migration registry keyed by `schemaVersion`. See `docs/PERSISTENCE_DESIGN.md`.
- **Dependencies:** none.
- **Effort:** M.
- **Definition of Done:** `docs/PERSISTENCE_DESIGN.md` complete and approved; every downstream persistence item (ZB-002/003/004) references a concrete schema and lifecycle.

## ZB-002 — Save / Load to local storage
- **Description:** Persist the current `SystemModel` to `localStorage` (or IndexedDB if size warrants) and restore it on load; explicit Save and Load affordances in the Builder.
- **Root cause:** No persistence layer exists (see ZB-001).
- **User impact:** Work survives reloads and sessions; the Builder becomes usable for real projects.
- **Technical solution:** A `ProjectStore` service that serializes `GraphStore`+profiles+alarmRules through the ZB-001 envelope; bootstrap reads it before falling back to the demo fixture. Round-trips through `ingestion-contract`.
- **Dependencies:** ZB-001.
- **Effort:** M.
- **Definition of Done:** Build a plant, reload → identical graph restored; tests cover serialize→deserialize round-trip equality; no console errors.

## ZB-003 — Autosave + crash recovery
- **Description:** Debounced autosave after every committed mutation; on next load, offer to recover the last autosaved state if it is newer than the last explicit save.
- **Root cause:** No persistence; no lifecycle hooks tied to mutations.
- **User impact:** No lost work even without manual saves; matches Figma-class expectation.
- **Technical solution:** Subscribe to the existing mutation signal (`onMutation`); debounce (~1 s) a write through `ProjectStore`; keep a separate `:autosave` slot + timestamp; reconcile on boot.
- **Dependencies:** ZB-002.
- **Effort:** M.
- **Definition of Done:** Kill the tab mid-edit → reopen → recovery prompt restores the latest state; autosave never blocks the UI thread perceptibly.

## ZB-004 — JSON Import / Export
- **Description:** Export the current design as a downloadable `.json`; import a `.json` to replace the current design (with validation).
- **Root cause:** No serialization endpoint; `payload-validator` exists for ingestion but isn't surfaced.
- **User impact:** Designs become shareable, versionable in git, and movable between machines/backends.
- **Technical solution:** Reuse `payload-validator` on import; export the ZB-001 envelope. Two buttons in the Builder toolbar; file via Blob download / `<input type=file>`.
- **Dependencies:** ZB-001.
- **Effort:** S.
- **Definition of Done:** Export→import on a fresh session reproduces the design; invalid JSON is rejected with a non-blocking error; round-trip test passes.

## ZB-005 — Undo / Redo
- **Description:** A real, UI-wired undo/redo stack covering place, move, rename, connect, disconnect, delete, duplicate, paste, and group operations. Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y).
- **Root cause:** The principles and keyboard reference claim "Ctrl+Z always / 50-action stack," but the only Ctrl handler wired is Ctrl+D. The substrate exists (every `graph-engine` mutation appends a `DomainEvent` and bumps `VersionStore`) but nothing consumes it for inverse operations.
- **User impact:** Mis-edits are currently permanent — unacceptable for a configuration tool. Removes the fear behind every destructive action.
- **Technical solution:** Introduce a command layer in front of `builder-actions`: each command carries its inverse (place↔remove, move(old→new)↔move(new→old), connect↔disconnect, etc.). Maintain undo/redo stacks in `BuilderContext`. Snapshot-based fallback for compound operations. Documented in `docs/BUILDER_ARCHITECTURE.md` §Command flow before coding.
- **Dependencies:** Builder architecture doc (command/event flow) — ZB-006/Phase 2.
- **Effort:** L.
- **Definition of Done:** Every mutation is reversible and re-appliable; stack depth ≥ 50; redo cleared on new branch; tests per command type; no orphaned connections after undo of a delete.

## ZB-006 — Align documentation with reality
- **Description:** Remove or correct every claim in `docs/ux-blueprint.html` (and inline comments) that advertises behaviour the build does not have: Ctrl+Z, arrow-key nudge, Shift-nudge, F2 rename, Ctrl+0 fitView, "50-action stack," zone navigation ("קומה 1/2/גג"). Either mark them as *planned* (linking to the backlog ID) or delete them.
- **Root cause:** The blueprint was written aspirationally, ahead of implementation.
- **User impact:** Credibility — a spec that over-promises erodes trust with reviewers and future maintainers.
- **Technical solution:** Audit the keyboard-reference and principles sections; annotate each unbuilt capability with its ZB-id and a "Planned" tag; keep only shipped behaviour as "Current."
- **Dependencies:** none (informational); coordinate with ZB-005/ZB-026 as they ship.
- **Effort:** S.
- **Definition of Done:** No statement in the blueprint describes unbuilt behaviour as current; each future capability is tagged with its backlog ID.

## ZB-007 — Delete-with-pipes
- **Description:** When a user deletes a component that still has connections, either (a) cascade-delete its pipes after a clear confirmation, or (b) explain why it is blocked — never fail silently.
- **Root cause:** The engine blocks `removeComponent` while connections reference it; the keyboard path wraps it in an empty `catch`, so Delete does nothing with no feedback.
- **User impact:** A confusing dead end during routine editing.
- **Technical solution:** In the delete handlers, detect referencing connections; offer "delete component and N pipes"; on confirm, disconnect-then-delete as one undoable compound command (ties to ZB-005).
- **Dependencies:** benefits from ZB-005 (compound undo) but can ship standalone with immediate cascade.
- **Effort:** S.
- **Definition of Done:** Deleting a connected component gives a visible choice or reason; cascade removes pipes cleanly; covered by tests; reversible once ZB-005 lands.

## ZB-008 — Stabilise ELK ↔ manual-layout interaction
- **Description:** Define and enforce a single source of truth for node positions so auto-layout and manual drag no longer fight.
- **Root cause:** `useElkLayout` re-lays-out while `moveComponent` also persists manual positions; the recent "canvas collapses to zero width in Build Mode" bug is a symptom. Mixed ownership of `position`.
- **User impact:** Nodes jump, layouts get undone, and the canvas has shown a hard collapse bug.
- **Technical solution:** Make ELK an explicit, user-invoked "auto-arrange" action; once a node has a manual position, ELK does not move it unless re-arranged. Gate ELK to first-layout / explicit trigger. Document the layout-ownership rule in the architecture doc.
- **Dependencies:** none; informed by Phase 2 render-flow doc.
- **Effort:** M.
- **Definition of Done:** Manual positions are never silently overwritten; "auto-arrange" is explicit; the zero-width collapse cannot reproduce; regression test added.

---

# P1 — Coherence

## ZB-010 — Unify design system (tokens only, one accent)
- **Description:** One design-token system used everywhere. Eliminate raw hex in TSX. Pick a single brand accent and a restrained neutral palette; reconcile the Monitor (sky-blue on `#0d1117`) and Builder-palette (neon on `#050810`) identities into one.
- **Root cause:** `styles.css` declares "No hex in TSX files," but the entire Builder hardcodes hex (`#fb923c`, `#4a6080`, the 9-colour category palette). Two surfaces evolved independently.
- **User impact:** The product currently looks like two or three different apps; theming is impossible; colours drift.
- **Technical solution:** Extend the CSS token set (accent, surfaces, category accents, radii scale, type scale); replace inline hex with `var(--…)`; one accent decision (recommend the sky `--accent`, demote orange to a single "active/placing" semantic token).
- **Dependencies:** none; foundational for ZB-012/013/042/043.
- **Effort:** L.
- **Definition of Done:** Zero literal hex in `src/**/*.tsx`; Monitor and Builder share one visual language; a single accent is dominant; tokens documented.

## ZB-011 — Single source of truth for component metadata
- **Description:** One registry entry per component type carrying Hebrew name, category, accent, and illustration — consumed by palette, canvas, and inspector.
- **Root cause:** `HE_NAME` is duplicated in `BuilderPalettePanel` and `BuilderPropertyPanel`; `TYPE_ACCENT` and `medColors` are duplicated inline in several places; illustrations live in yet another module.
- **User impact:** Inconsistency and drift (a renamed type or new accent must be edited in many files); higher defect risk.
- **Technical solution:** Add display metadata to the existing component registry/definitions (or a thin `component-display` map keyed by typeId); refactor palette/inspector/nodes to read from it. Removes the duplicate maps.
- **Dependencies:** none; unblocks ZB-012, ZB-040, ZB-041.
- **Effort:** M.
- **Definition of Done:** `HE_NAME`/`TYPE_ACCENT`/`medColors` defined exactly once; all consumers read the single source; tests confirm parity.

## ZB-012 — Canvas ↔ palette visual parity
- **Description:** The illustration you pick up in the palette is the illustration that appears on the canvas. Eliminate the gray-box fallback that renders English ALL-CAPS type ids.
- **Root cause:** `GenericNode` has bespoke SVG bodies for only four types; the rest fall through to a `typeId.toUpperCase()` gray box, while the palette has rich per-type art.
- **User impact:** The brick ≠ the result; English ALL-CAPS labels appear inside a Hebrew-first product.
- **Technical solution:** Drive canvas node bodies from the same illustration source as the palette (ZB-011); remove the ALL-CAPS fallback; ensure every registered type has a canvas representation.
- **Dependencies:** ZB-011.
- **Effort:** M.
- **Definition of Done:** No node renders an English ALL-CAPS fallback; palette and canvas use one illustration set; visual check across all 24 types.

## ZB-013 — Separate medium-colour from status-colour
- **Description:** Resolve the dual meaning of orange/blue/red — currently both "what flows" (medium) and "is it OK" (status) on the same canvas.
- **Root cause:** The colour language for media (hot/cold) overlaps the colour language for health (critical/warn/ok).
- **User impact:** Momentary ambiguity reading the canvas; an alarm-red pipe vs a hot-red pipe.
- **Technical solution:** Assign distinct visual channels — e.g. medium → pipe hue/texture, status → node border/badge only; or desaturate medium colours and reserve saturated red/amber/green strictly for status. Decide in ZB-010's palette work.
- **Dependencies:** ZB-010.
- **Effort:** S.
- **Definition of Done:** Status and medium are visually distinguishable at a glance; documented in the token guide.

## ZB-014 — Fix duplicate / conflicting CSS keyframes
- **Description:** `@keyframes emptyPulse` is defined twice in `styles.css` with different values (0.3/0.7 vs 0.2/0.35). Keep one.
- **Root cause:** Two stages added the same keyframe name independently.
- **User impact:** Animation behaviour depends on cascade order — a latent inconsistency.
- **Technical solution:** Delete one definition; reconcile callers to the surviving values.
- **Dependencies:** none.
- **Effort:** XS.
- **Definition of Done:** Exactly one `emptyPulse` definition; visual check of all consumers.

## ZB-015 — Fix Hebrew copy defects
- **Description:** Fix the empty-canvas typo "ורשור" → "וגרור"; stop truncating category labels to the first word (`heLabel.split(' ')[0]`), which turns "נקודות צריכה" into "נקודות".
- **Root cause:** A typo in the CTA string; a label-shortening hack in the category tab.
- **User impact:** The first words a new user reads contain a spelling error; category meaning is lost.
- **Technical solution:** Correct the string; render full labels (wrap or ellipsis with title), not first-word-only.
- **Dependencies:** none.
- **Effort:** XS.
- **Definition of Done:** No typo; category tabs show full, legible labels.

---

# P2 — Completion & flow (Figma/FigJam/Miro parity)

## ZB-020 — Unify Builder ↔ Monitor selection model
- **Description:** One selection concept shared across modes instead of two disjoint systems.
- **Root cause:** Monitor uses local `selectedComponentId`; Builder uses the FSM `selectedComponentId`. They never carry across a mode switch.
- **User impact:** Selecting a node and switching mode loses the selection; behaviour feels inconsistent.
- **Technical solution:** Lift selection into a single shared state (or derive Monitor selection from the FSM); reconcile ESC/Delete handling into one place.
- **Dependencies:** none; unblocks ZB-024.
- **Effort:** M.
- **Definition of Done:** Selection persists across mode switches where sensible; one code path handles select/clear; tests cover both modes.

## ZB-021 — Connection UX — pre-drop compatibility hints
- **Description:** While dragging a connection, highlight compatible target ports and dim incompatible ones with a reason; surface validity before release.
- **Root cause:** Validation (`port-validator` + engine) only runs after a full selection; drag-to-connect gives no pre-drop feedback.
- **User impact:** Users only learn a connection was invalid after releasing — trial and error.
- **Technical solution:** On connect-start, compute compatible targets from `port-validator`; style handles accordingly; show the medium being routed. Keep the form path as a secondary option.
- **Dependencies:** none.
- **Effort:** M.
- **Definition of Done:** Compatible ports visibly indicated during drag; invalid drop explains why; no regression in existing connect tests.

## ZB-022 — Inline rename
- **Description:** Rename a component inline (double-click name / F2) without expanding a "פרטים נוספים" section that re-collapses on every selection.
- **Root cause:** Rename lives under an expander reset on each selection change.
- **User impact:** Naming a plant's worth of components is dozens of expand-type-confirm cycles.
- **Technical solution:** Make the inspector name field directly editable; add double-click-to-rename on the node label and an F2 shortcut.
- **Dependencies:** none; pairs with ZB-026.
- **Effort:** S.
- **Definition of Done:** Rename in ≤ 1 interaction; F2 and double-click both work; undoable (ZB-005).

## ZB-023 — Copy / Paste
- **Description:** Copy selected component(s) (and their internal connections) and paste them, offset, with new ids.
- **Root cause:** Not implemented; only single-component duplicate (Ctrl+D) exists.
- **User impact:** Repetitive layouts (e.g. identical riser per floor) must be rebuilt by hand.
- **Technical solution:** Clipboard model (in-memory + optionally system clipboard JSON); paste regenerates ids, remaps internal connections, offsets positions; one undoable compound command.
- **Dependencies:** ZB-005 (compound undo).
- **Effort:** M.
- **Definition of Done:** Copy/paste of single and multi-selection works; internal pipes preserved; ids unique; reversible.

## ZB-024 — Group operations / multi-select batch actions
- **Description:** Batch delete / move / duplicate / align on a multi-selection; optional logical grouping.
- **Root cause:** Multi-select (Shift, box-select) exists but the only batch action is Ctrl+D.
- **User impact:** Editing many components at once is impossible from the panel.
- **Technical solution:** Extend the property panel to a multi-selection state with batch actions; wire batch operations as compound undoable commands.
- **Dependencies:** ZB-020 (unified selection).
- **Effort:** M.
- **Definition of Done:** Batch delete/move/duplicate/align on N nodes; single undo reverses the batch.

## ZB-025 — Alignment & smart snapping
- **Description:** Align/distribute tools and snap-to-neighbour guides, beyond the current 20 px grid.
- **Root cause:** Only `snapToGrid` (20 px) exists.
- **User impact:** Tidy layouts require manual pixel-fiddling.
- **Technical solution:** Add alignment commands (left/center/right/top/middle/bottom, distribute) and dynamic snap guides against other nodes' edges/centers.
- **Dependencies:** none.
- **Effort:** M.
- **Definition of Done:** Align/distribute act on a selection; snap guides appear while dragging; positions remain undoable.

## ZB-026 — Complete keyboard-shortcut layer
- **Description:** Implement the shortcut set the docs already advertise: undo/redo, arrow-key nudge (+Shift fine), F2 rename, Ctrl+0 fitView, plus existing Delete/Esc/Ctrl+D. Keyboard-complete build flow (add → connect → name without the mouse).
- **Root cause:** Only Delete/Esc/Ctrl+D are wired; the rest are documented but absent (see ZB-006).
- **User impact:** No fast lane for power users; accessibility gap for keyboard-only users.
- **Technical solution:** Central keymap module; nudge via `moveComponent`; fitView via React Flow API; everything routed through the command layer (undoable).
- **Dependencies:** ZB-005.
- **Effort:** M.
- **Definition of Done:** Every documented shortcut works or is removed from docs; a full plant can be built keyboard-only; tests cover the keymap.

## ZB-027 — Canvas find / jump-to-component
- **Description:** Search a component by name and center/zoom it on the canvas.
- **Root cause:** No find feature; large plants require visual hunting.
- **User impact:** Hard to locate a specific node in a big design.
- **Technical solution:** A search box (reuse the palette search pattern) that filters components and pans/zooms to the match via React Flow's viewport API.
- **Dependencies:** none.
- **Effort:** S.
- **Definition of Done:** Typing a name centers the matching node; keyboard navigable; no perf hit on large graphs.

## ZB-028 — Context-menu parity & canvas-specific actions
- **Description:** Make the right-click menu add value: align, lock, group, bring-to-front, plus the existing rename/duplicate/delete.
- **Root cause:** The context menu currently only repeats panel actions.
- **User impact:** Missed opportunity for fast canvas-native operations.
- **Technical solution:** Extend `BuilderContextMenu` with the new actions once ZB-024/ZB-025 land; context-sensitive items for single vs multi selection.
- **Dependencies:** ZB-024, ZB-025.
- **Effort:** S.
- **Definition of Done:** Context menu offers canvas-specific actions; items adapt to selection size.

## ZB-029 — Single placement model
- **Description:** Reconcile the two placement mechanisms (click-palette-then-click-canvas via FSM, and drag-from-palette) into one clear primary with the other as a deliberate secondary.
- **Root cause:** Two code paths (FSM `placing` + `onPaneClick`, and React-Flow drop) reach the same outcome, doubling bug surface and mental models.
- **User impact:** Ambiguity about how to add a component; duplicated maintenance.
- **Technical solution:** Choose drag as primary (per the design principle) and keep click-to-place as an explicit accessibility fallback that routes through the same command; remove redundant branches.
- **Dependencies:** none; coordinate with ZB-008 (positioning).
- **Effort:** S.
- **Definition of Done:** One documented primary placement path; both routes share a single command; bug surface reduced.

## ZB-030 — Mode-switch affordance
- **Description:** Give the Monitor↔Build switch real presence instead of a 10 px header toggle.
- **Root cause:** A fundamental context change is rendered as a tiny segmented control.
- **User impact:** Users miss or mis-trigger the mode switch.
- **Technical solution:** Larger, clearly-labelled, keyboard-reachable switch; consistent placement; obvious active state. (Polish, not workflow change.)
- **Dependencies:** ZB-010 (tokens).
- **Effort:** XS.
- **Definition of Done:** The switch is unmistakable and accessible; active mode is obvious.

---

# P3 — Polish & cleanup

## ZB-040 — Remove dead code
- **Description:** Delete confirmed-dead code: `_noop_illustration_stub` (~280 lines in `BuilderPalettePanel`), the superseded `DashboardPanel`, and any other unused components found during the pass.
- **Root cause:** Superseded code left in place across stages.
- **User impact:** None directly; raises defect risk and reading cost (also TD-002 in STATUS.md).
- **Technical solution:** Remove after confirming no imports; rely on the test suite + build to catch references.
- **Dependencies:** ZB-011 (metadata move) to avoid deleting still-referenced art.
- **Effort:** S.
- **Definition of Done:** Dead modules removed; build + tests green; no broken imports.

## ZB-041 — De-duplicate translations / mappings
- **Description:** Collapse duplicated `HE_NAME`/`MEDIUM_HE`/`TYPE_ACCENT`/`medColors` into the single sources (ZB-011) and the i18n layer.
- **Root cause:** Copy-paste across panels.
- **User impact:** Drift risk; inconsistent Hebrew/colours.
- **Technical solution:** Route medium labels through i18n; component display via the registry; delete the inline copies.
- **Dependencies:** ZB-011.
- **Effort:** S.
- **Definition of Done:** Each mapping defined once; consumers updated; tests pass.

## ZB-042 — Visual hierarchy, spacing, typography pass
- **Description:** Establish a type scale and spacing rhythm; reduce SCADA-level density; replace ad-hoc weights (600/700/800/900) and radii (3–14 px) with scales; reconsider emoji category icons.
- **Root cause:** No defined scales; per-component improvisation.
- **User impact:** Dense, technical feel; weak hierarchy.
- **Technical solution:** Define type/spacing/radius tokens (ZB-010); apply across panels, nodes, KPI bar; swap emoji icons for a consistent icon set.
- **Dependencies:** ZB-010.
- **Effort:** L.
- **Definition of Done:** All sizes/weights/radii reference tokens; consistent hierarchy; no raw emoji as functional icons.

## ZB-043 — Empty / hover / selection state consistency
- **Description:** One language for empty states (currently ⬡ / ✦ / ⬡ across three places), hover, and selection.
- **Root cause:** States added per-component without a shared spec.
- **User impact:** Inconsistent feedback; small but pervasive.
- **Technical solution:** Define shared empty/hover/selection components and tokens; apply everywhere.
- **Dependencies:** ZB-010.
- **Effort:** M.
- **Definition of Done:** Empty/hover/selection states are consistent across Builder and Monitor.

## ZB-050 — Quality-gate automation
- **Description:** A single command (or CI step) that runs build + tests and reports console/runtime errors, as the Phase 8 gate.
- **Root cause:** Quality checks are manual/ad-hoc.
- **User impact:** Indirect — protects every other item from regressions.
- **Technical solution:** npm script chaining `vite build` + `vitest run`; document the manual-QA checklist; wire into the commit policy.
- **Dependencies:** none.
- **Effort:** S.
- **Definition of Done:** One command verifies the Phase 8 gate; documented; used before each push.

---

# Appendix A — Out of scope (deferred to BOS roadmap)

These surfaced in the design review but are **new features / product redesign**, explicitly excluded by the
current mandate ("do not invent new features; do not redesign"). They are recorded so nothing is lost and are
governed by the separate BOS roadmap, to be revisited only after the Builder is production-grade.

- Home / summary "is my building OK?" view in plain language.
- Scenes & automations (morning boost, legionella cycle, vacation mode).
- Rooms / zones / floor spatial metaphor and zone navigation.
- Intent-level relationships that auto-generate the schematic.
- Narrative event timelines; actionable/reassuring alarm cards.
- Component marketplace / branded visual equipment library (2.5D).
- Shareable read-only output (link / PDF / commissioning report).
- Mobile / tablet operator surface.
- Unifying Monitor + Build into one model with a single view/edit lens (architectural — requires explicit approval).

# Appendix B — Dependency notes

- **Persistence chain:** ZB-001 → {ZB-002 → ZB-003, ZB-004}.
- **Undo substrate:** ZB-005 underpins ZB-007 (compound), ZB-023, ZB-026.
- **Metadata SoT:** ZB-011 underpins ZB-012, ZB-040, ZB-041.
- **Design tokens:** ZB-010 underpins ZB-013, ZB-030, ZB-042, ZB-043.
- **Selection:** ZB-020 underpins ZB-024 → ZB-028.

# Appendix C — Status log

| Date | Event |
|------|-------|
| 2026-06-29 | Backlog created (Phase 1). 30 items, de-duplicated from 80 review findings + code audit. |
