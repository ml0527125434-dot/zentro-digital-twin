# Zentro — Decision Log

Design/product decisions taken during implementation, recorded by the Lead
Implementation Engineer at the Reviewer's direction. The Master Specification
(`zentro-master-spec.md` §10) remains the source of truth for *locked* decisions;
this log captures the smaller calls made stage-to-stage.

| ID | Date | Decision | Status |
|----|------|----------|--------|
| DL-001 | 2026-06-29 | Port glyphs stay **neutral** (`--bg-mantle` fill + `--border-bright` keyline); do **not** implement medium-filled ports. | Adopted |

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
