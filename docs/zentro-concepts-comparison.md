# Zentro Builder — Design Exploration Comparison (Phase 0.5)

Five full high-fidelity concepts rendered in `docs/zentro-concepts.html`
(open in a browser). Same hot-water system drawn in five design languages.
Goal: learn from the best engineering tools, then forge a Zentro-unique identity —
not copy any single product.

> Recommendation up front: **adopt Concept E (Zentro Original) as the base**, and
> graft specific strengths from A–D into it (table at the end). E is the synthesis.

---

## Scorecard (1–5; higher = better for Zentro's goal)

| Criterion | A Revit | B AutoCAD Plant 3D | C Siemens TIA | D Ignition/SCADA | **E Zentro** |
|---|---|---|---|---|---|
| Engineering credibility | 5 | 5 | 4 | 4 | 4.5 |
| Readability / calm | 4 | 3 | 3 | 2.5 | **5** |
| Fits a control-center (dark) | 2 | 4 | 2 | 5 | **5** |
| Hebrew / RTL fit | 3 | 2 | 3 | 4 | **5** |
| Modern / premium feel | 3.5 | 2.5 | 2.5 | 4 | **5** |
| Build (authoring) ergonomics | 5 | 4 | 4 | 3 | **5** |
| Monitor (live) strength | 2 | 2 | 3 | **5** | 4 |
| Scalable to other domains | 4 | 4 | 4 | 4 | **5** |

---

## Concept A — Revit inspired
**Strengths:** precise BIM feel; light, calm work area; excellent selection model
(grips/handles); thin accurate line-work; the "blue = active" convention is clear.
**Weaknesses:** light theme clashes with a 24/7 control-center; not "operations";
ribbon density can overwhelm a field technician; light bg tires eyes in a NOC.
**Adopt:** selection grips + alignment precision; the calm, uncluttered work area;
"one blue accent for active/selection".

## Concept B — AutoCAD Plant 3D inspired
**Strengths:** unmatched engineering authenticity (black model-space, ACI line
colors, dot grid, dashed selection + grips, command/coords discipline).
**Weaknesses:** intimidating for non-CAD technicians; mono/command-line paradigm is
power-user-only; heavy, cold; weak for live monitoring.
**Adopt:** the **engineering grid discipline** (visible major/minor, snap, coords in
status bar); crisp line symbols on a dark canvas; orthogonal routing rigor.

## Concept C — Siemens TIA Portal inspired
**Strengths:** enterprise structure; clear panel hierarchy; the orange-selection /
petrol-accent split reads "industrial automation".
**Weaknesses:** dated, "heavy enterprise" aesthetic; mixed light/dark chrome feels
old; not premium/modern; RTL not native.
**Adopt:** **structured panel hierarchy** and the idea of a **distinct selection
color separate from the brand accent** (we already separate medium vs accent).

## Concept D — Ignition / SCADA inspired
**Strengths:** best **live/operations** language — values on equipment, glowing
flow, high contrast, status-color driven; dark and modern; great for Monitor mode.
**Weaknesses:** too much glow/animation for an *editor* (violates "calm at rest");
can look "gamer/RGB" if overused (the exact trap the review warned about).
**Adopt:** reserve this language **for Monitor mode** — live value badges, animated
flow, status colors. Keep Build mode calm/static.

## Concept E — Zentro Original ★ (recommended base)
**Strengths:** dark, calm, premium; **one blue UI accent kept separate from medium
pipe colors**; thin P&ID line-work; square attached ports; visible engineering grid;
RTL Hebrew-first; subtle selection grips. Calm in Build, ready to host D's live
language in Monitor. Token-driven → scalable to HVAC/Energy/Electrical/Water/Gas.
**Weaknesses:** must avoid drifting back to neon glow; needs disciplined token use.
**This is the synthesis** of A's calm precision + B's grid discipline + C's structure
+ D's live language (mode-gated).

---

## What we ADOPT from each (the synthesis recipe for E)

| Source | What Zentro takes |
|---|---|
| Revit (A) | selection grips, calm work area, single blue active/selection accent |
| AutoCAD (B) | major/minor engineering grid, snap + coords discipline, crisp dark line symbols, orthogonal rigor |
| Siemens (C) | structured panel hierarchy, selection color ≠ brand accent |
| Ignition (D) | live value badges + animated flow + status colors — **Monitor mode only** |

## What is UNIQUE to Zentro (our identity, not borrowed)
1. **Dark, calm, premium** engineering aesthetic — control-center, not 1990s SCADA.
2. **Hebrew-first / RTL** as the native default (none of the four do this).
3. **Mode-gated visual language:** Build = calm & static (P&ID), Monitor = live &
   animated (HMI). One model, two visual registers — the Figma "view/edit" idea
   applied to engineering.
4. **Medium-color vs UI-accent strictly separated** — "what flows" never collides
   with "what's selected".
5. **Token + registry driven** so the same Builder serves every Zentro domain.
6. **LEGO-grade authoring ergonomics** (drag/connect/auto-arrange) on top of P&ID
   readability — easy like FigJam, rigorous like CAD.

---

## Decision requested
1. Approve **Concept E as the base** (recommended), or pick another / a blend.
2. Confirm the "adopt" grafts above (esp. **D's live language is Monitor-only**).
3. Then I fold the chosen direction back into the spec (Part I/II) as the final
   locked visual identity, and we proceed to Phase 1 implementation.

Open palette choice still pending from before: Zentro brand accent =
**#4f9cf9 (engineering blue, recommended)** vs keeping the current orange.
