# Zentro — Decision Log

Design/product decisions taken during implementation, recorded by the Lead
Implementation Engineer at the Reviewer's direction. The Master Specification
(`zentro-master-spec.md` §10) remains the source of truth for *locked* decisions;
this log captures the smaller calls made stage-to-stage.

| ID | Date | Decision | Status |
|----|------|----------|--------|
| DL-001 | 2026-06-29 | Port glyphs stay **neutral** (`--bg-mantle` fill + `--border-bright` keyline); do **not** implement medium-filled ports. | Adopted |
| DL-002 | 2026-06-30 | Three non-blocking UI items (Hebrew port tooltip · sidebar icon-rail · Hebrew aria-labels) are **deferred** — integrate only if a stage's work directly touches them. | Deferred |

---

## DL-002 — Defer three non-blocking UI items

**Decision (Reviewer, entering Phase 4):** The following non-blocking follow-ups, surfaced
during Stages D–F, are **not** to be implemented on their own. Fold each in **only** if a
stage's work already touches that surface; otherwise it stays parked here.

1. **Hebrew port tooltip (§2.3)** — a `role · medium` tooltip on port hover (e.g.
   "כניסה · מים חמים"). Requires threading each port's role+medium into the ~10 node
   components; do it alongside the canvas-parity / per-port-metadata work, not before.
2. **Sidebar icon-rail (§9.6)** — collapse side panels to an icon rail under the width
   threshold (today they collapse fully + restore). A responsive refinement.
3. **Hebrew `aria-label`s** — a pass to ensure interactive controls expose Hebrew
   accessible names where they currently fall back to English/test ids.

**Rationale:** none blocks current functionality; each is small but cross-cutting, and
batching them avoids piecemeal churn. Revisit when a relevant stage makes them free, or as
a dedicated accessibility/polish pass in Phase 5.

---

## DL-001 — Keep port glyphs neutral (no medium-filled ports)

**Decision (Reviewer, after Stage D approval):** Port anchor glyphs remain neutral —
filled `--bg-mantle` with a `--border-bright` keyline. Medium-filled ports are **not**
to be implemented at this time.

**Rationale:**
- Medium identity is already carried by the **pipe colour**, so colouring the ports by
  medium would duplicate that signal.
- Neutral ports preserve the **quiet engineering UI** and avoid visual noise.
- Consistent with the **Brand DNA** and the explicit **"no neon"** direction.

**Implications:**
- The Stage D follow-up "per-medium port colour (§2.2)" is **closed as Won't-Do** for now.
- The role·medium hover **tooltip** (§2.3) remains a separate, still-open follow-up
  (information on hover ≠ persistent colour), to be revisited only if requested.

**Supersedes:** the literal §2.2 phrasing "filled with the medium colour" for the rest
state. The spec text should be read as "neutral glyph; medium is shown by the pipe."
