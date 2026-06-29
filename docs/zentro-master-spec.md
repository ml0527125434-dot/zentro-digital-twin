# Zentro — Master Specification (Single Source of Truth)
**Status:** ✅ **Phase 0 CLOSED** (decisions locked below). All energy is on
implementation. No further planning layers unless a material architecture need arises.

This is the authoritative document. Companion artifacts (visual detail, kept in
sync, referenced — not duplicated):
- `zentro-builder-pid-spec.md` — full engineering spec (Parts I/II, §0–§17)
- `zentro-identity.html` — live visual identity (open in browser)
- `zentro-builder-mockups.html` — workspace + states mockups
- `zentro-concepts.html` + `zentro-concepts-comparison.md` — Phase 0.5 exploration
- `zentro-brand-dna.md` — brand DNA narrative

---

## 1. Vision
Zentro's Builder is **not** a hot-water tool — it is the canvas, interaction model
and visual language for **all of Zentro's engineering domains** (Hydraulic/hot-water
first; then HVAC, Energy, Electrical, Water, Gas). One engineering platform; many
domains plugged in via registries. The goal: a technician sees a screenshot and
**knows it's Zentro** — calm, dark, precise, modern — and can build a complete system
from an empty canvas without friction.

## 2. Architecture Constraints (locked)
- **Stack:** React Flow (`@xyflow/react` v12) + `elkjs`. **Keep both. Do not switch
  canvases** (no JointJS/GoJS/mxGraph rewrite). **Zero new deps for v1.**
- **Domain model is generic:** components · ports (medium/role/anchor) · connections.
  Media and validation rules are **data/registries**, not hard-coded — enables new
  domains without redesign.
- **Persistence behind a port** (`ProjectRepository`): localStorage today; backend is
  a future drop-in adapter. Documents carry `kind: 'zentro.digital-twin.document'` +
  `schemaVersion` + migration. **No backend work in this track.**
- **One model, multiple lenses** (Build / Monitor / Presentation / Read-Only). Build
  is the only mutating mode.
- **No new equipment types** in this track; evolve visuals/UX only.

## 3. Design System  (detail: pid-spec §13 · live: identity.html)
- **Tokens only** (no hardcoded hex/px in components). Surfaces dark
  (`--bg #0b0f14` … `--elev #161d27`), text (`#e6edf6/#9fb0c3/#5c7086`).
- **One UI accent `#4f9cf9`** — interaction only (selection/active/focus); **never
  data.** Medium palette (hot/cold/recirc/gas/electric) + status palette
  (ok/warn/critical/offline/maintenance/commissioning) are separate.
- **Type:** Heebo (Hebrew UI) + IBM Plex Mono (all numerics, tabular). No UPPERCASE.
- **Scales:** spacing 4/8/12/16/24/32 · radius 4/6/8 · elevation E0/E1/E2.
- **Icons:** one line family (1.5px), no emoji.
- **States defined for every interactive element:** rest/hover/focus/selected/
  disabled/error/valid/invalid.

## 4. UX Principles  (detail: pid-spec §14)
Keyboard⟺mouse parity · locked mouse conventions (left=select/drag, port-drag=pipe,
middle/right=pan, right-click=menu, scroll=zoom) · canonical shortcut set · one
unified selection model · everything undoable · errors advisory, never blocking ·
RTL/Hebrew-first · calm at rest · discoverable (tooltips, `?`, first-run, empty states).

## 5. Builder Workflow  (detail: pid-spec §5, §9; modes §15)
Full-page workspace: top toolbar · left library · canvas (grid everywhere) · right
inspector · bottom status/validation bar · zoom/fit/pan. Interaction contract (must
not regress): add · move · connect · delete pipe · delete component (cascade) ·
multi-select · move group · copy/paste · duplicate · undo/redo · auto-layout.

## 6. Visual Identity  (live: identity.html · narrative: brand-dna.md)
Pipe language (orthogonal, thin, bright centerline, chevron arrows) · port language
(square attached chips) · selection (subtle accent grips) · status/alert language
(dots/chips/frames; single non-looping alert pulse) · motion (flow + meaningful
motion only) · empty/loading/error · presentation (outcome-first).

## 7. Brand DNA — the recognizability test  (detail: brand-dna.md)
**5 signatures:** (1) the Zentro equipment **chassis** (cut top corner + medium top
edge + blue keyline under the name); (2) **blue accent, interaction-only**; (3)
**monospace numerics**; (4) **orthogonal pipes with a bright centerline**; (5)
**calm-at-rest, meaningful motion.** Together these are unique to Zentro.
Every decision must pass: recognizable without the logo? · modern engineering? · calm
for hours? · current in 5 years?

---

# 8. Design Governance  (NEW — Phase 0.7)
Purpose: in a year, at 10× size and 6 domains, it must still feel like **one product**.

## 8.1 Design Principles (every UI/UX decision must satisfy ALL)
1. **One system over local cleverness** — consistency beats a clever one-off.
2. **Tokens only** — no hardcoded color/spacing/radius/type; everything from tokens.
3. **Color = meaning** — accent is interaction; medium/status carry data; never mix.
4. **Calm at rest** — motion only when it conveys information.
5. **Engineering truth** — orthogonal, gridded, precise; never reads as a toy.
6. **RTL/Hebrew-first** — mirrors correctly; numbers/units stay LTR.
7. **Scales to 10×** — must hold up at 500+ components and across domains.
8. **Performance is a feature** — interactions stay smooth; heavy work is lazy/virtualized.
9. **Accessible by default** — visible focus, sufficient contrast, full keyboard parity.
10. **Reversible & non-blocking** — undoable; errors advisory, never wall the canvas.

## 8.2 Design Review Checklist (every new feature passes before merge)
- [ ] Conforms to **Brand DNA** (passes the 4 questions).
- [ ] Uses **Design Tokens only** (no hardcoded values).
- [ ] Preserves the **engineering language** (orthogonal/grid/precise).
- [ ] Adds **no unnecessary visual load** (calm; nothing competes with data).
- [ ] **Consistent** with existing patterns (no new bespoke component if one exists).
- [ ] Works in **RTL** (and LTR where relevant).
- [ ] Holds up for **large systems** (perf + layout at scale).
- [ ] Maintains **performance** (no jank on the canvas / 60fps target).
- [ ] **Accessible** (focus, contrast, keyboard).
- [ ] **Domain-generic** where possible (not hot-water-hardcoded).
- [ ] Has an **approved mockup** and matches it.

## 8.3 Definition of Done — UI/UX (a feature is NOT done without all)
1. **Approved mockup** exists and the implementation matches it.
2. **Design System** conformance (tokens, components, states).
3. **Brand DNA** conformance (the 5 signatures respected).
4. **RTL verified** (Hebrew, mirrored layout, LTR numerics).
5. **Usability verified** (real task path tested — e.g., in Chrome).
6. **Basic accessibility verified** (focus order, contrast, keyboard).
7. **Performance verified** (no regression; smooth on a non-trivial model).
8. **Tests green + production build clean** (engineering DoD, retained).

## 8.4 Governance process
- The checklist + DoD live in this doc; PRs reference them.
- The master spec is versioned; any visual change updates tokens/spec **first**,
  then code (spec leads code, never the reverse).
- One owner approves design changes against this SSOT.

---

# 9. Implementation Roadmap (post-approval)
Phases gated; each stage = one commit with build + tests + Chrome verification + DoD.
- **Phase 1 — Visual core:** A orthogonal pipes+elbows+arrow · B grid/snap align ·
  C pipe thickness/palette. (zero new deps)
- **Phase 2 — Workspace shell:** top toolbar · full-page canvas · bottom status/
  validation bar · collapsible panels (Section 5/§9).
- **Phase 3 — CAD interactions:** D attached port glyphs · E smart alignment guides ·
  F on-demand ELK auto-arrange.
- **Phase 4 — Polish (gated):** G tee junctions / crossing hops · routing upgrade
  (`@jalez/react-flow-smart-edge` or `libavoid-js`) only if needed.

(Carried, pre-existing Stage-35 work already merged: persistence/port, undo/redo,
copy/paste, cascade delete, selection persistence, Hebrew naming, translate-crash fix.)

---

## 10. Locked Decisions (Phase 0 CLOSED)
Authoritative record — changing any of these requires an Architecture Escalation.

1. **Visual identity:** Concept E (Zentro Original) is the official identity.
2. **UI accent:** `#4f9cf9` (engineering blue) — interaction only, never data.
3. **Elbow radius:** 3px.
4. **Grid / snap:** 20px (visible grid == snap), major line every 100px.
5. **Pipe thickness:** 4–6px by medium (per §3 / Design System §0).
6. **Crossing hops:** deferred (not in v1).
7. **Pipe routing v1:** React Flow `getSmoothStepPath` — **zero new dependencies**.
8. **Builder shell:** full-page workspace.
9. **Stack:** React Flow (`@xyflow/react` v12) + `elkjs` — official, locked.
10. **Design Governance (§8):** binding on every Stage.

**Phase 1 is OPEN.** Stages execute per §9; each Stage is gated by the Reviewer
(`zentro-review-process.md`) with a 10-section Review Packet + verdict, and the
Technical Debt Register (`zentro-tech-debt-register.md`) is kept current.
Changes to the locked decisions above = Architecture Escalation only.
