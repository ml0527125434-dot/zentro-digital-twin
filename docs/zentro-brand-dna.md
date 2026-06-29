# Zentro — Brand DNA (Phase 0.6)

Visual identity system rendered in `docs/zentro-identity.html` (open in a browser —
includes live motion). This document is the written DNA the identity sheet expresses.

## The one-line DNA
**A calm, dark, precise engineering system where color means something and motion
means something — never decoration.** Modern control-center, not 1990s SCADA.

## The 5 signatures (recognizable as Zentro WITHOUT the logo)
1. **The Zentro chassis** — every piece of equipment sits on an identical tile with a
   **cut top corner** + a **2px medium-colored top edge** + a **blue keyline under the
   name**. This silhouette is the instant tell.
2. **One blue accent (`#4f9cf9`), interaction-only** — selection/active/focus. It is
   *never* used for data. Medium colors (hot/cold/recirc/gas) carry meaning; the blue
   never competes. This restraint is itself the brand.
3. **Monospace numerics everywhere** (IBM Plex Mono, tabular) — every value/unit reads
   as instrumentation. Heebo for Hebrew UI.
4. **Orthogonal P&ID line-work with a thin bright centerline** — pipes look like real
   tubes; 90° only; small 3px elbows; chevron flow arrows.
5. **Calm-at-rest, meaningful motion** — the editor never animates idle; flow dashes
   and a single (non-looping) alert pulse appear only when data demands.

## Design principles (the rules every decision obeys)
- Color = meaning (medium or status), never mood.
- Dark, low-glare surfaces for hours of work; no neon glow, no drop-shadow halos.
- One accent, one type system, one icon family (line, 1.5px, no emoji).
- RTL Hebrew is native, not translated; numbers/units stay LTR.
- Mode-gated language: **Build** = static & precise; **Monitor** = live & animated;
  **Presentation** = outcome-first ("המים חמים — הכול תקין") before numbers.
- Token + registry driven, so the same DNA scales to HVAC / Energy / Electrical /
  Water / Gas without redesign.

## The four test questions — answered
| Question | How the DNA answers it |
|---|---|
| **Recognizable as Zentro without the logo?** | Yes — the chassis silhouette + blue-only accent + mono numerics + centerline pipes are unique together. |
| **Feels like a modern engineering system?** | Yes — P&ID rigor (grid, orthogonal, ports) in a dark, premium, restrained shell. |
| **Clean enough for hours of work?** | Yes — low-glare dark, calm-at-rest, single accent, generous spacing, no constant motion. |
| **Still current in 5 years?** | Yes — flat, token-based, no trend gimmicks (no skeuomorphism, no neon, no heavy gradients); easy to re-theme via tokens. |

## What we deliberately are NOT
- Not a "small Revit/AutoCAD" — we borrowed principles (grid discipline, selection
  grips, panel structure), not their look.
- Not a gamer/RGB dashboard — glow and constant animation are banned in Build.
- Not light/enterprise-gray — Zentro is dark-premium and Hebrew-first.

## Component identity coverage (in the identity sheet)
Color DNA · Typography · Icon language · Equipment language (chassis) · Pipe language ·
Port language · Selection language · Alerts & status language · Motion language (live) ·
Empty / Loading / Error states · Presentation language.

## Decision requested to close Phase 0.6
1. Approve the **chassis + blue-accent + mono-numeric** signatures as the Zentro DNA.
2. Confirm **`#4f9cf9`** as the interaction accent (vs keeping orange).
3. On approval, I fold this DNA into the master spec (Part II, Section 13) as the
   locked identity — then Phase 1 implementation begins against it.
