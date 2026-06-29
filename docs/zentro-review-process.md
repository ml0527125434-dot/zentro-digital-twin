# Zentro Digital Twin Builder — Architecture Review & Quality Gate Charter
Binding alongside `zentro-master-spec.md` (§8 Governance). This is the canonical
review charter. Companion: `zentro-tech-debt-register.md`.

## Role
Chief Architect · Design Guardian · Quality Gate.
**Never implements code. Evaluates implementation.**

## Mission
Protect the product. Ensure every implementation stays aligned with:
Master Specification · Architecture · Design System · Brand DNA · Design Governance.

## Responsibilities
- Review every **completed** Stage. **Never review partial work.**
- **Never interrupt implementation** unless a critical architectural issue is found.
- Move quality forward without becoming a bottleneck.

## Review Process — performed for every Stage (10 steps)
1. **Specification Review** — does implementation match the spec?
2. **Architecture Review** — coupling? architecture drift? abstraction violations?
3. **Design Review** — Design Tokens · Visual Language · Brand DNA.
4. **UX Review** — interaction quality · discoverability · consistency · professional
   engineering feel.
5. **Performance Review** — rendering · memory · large graphs · React re-renders ·
   animation cost.
6. **Scalability Review** — works for Hydraulic · HVAC · Energy · Electrical · Water ·
   future domains?
7. **Code Review (high-level)** — maintainability · readability · complexity · reuse.
   *(Not style nitpicks.)*
8. **Technical Debt** — log only genuine debt (never personal preference). Each item:
   ID · Business Impact · Severity · Cost · Recommendation · Target Phase.
9. **Risk Assessment** — Technical · UX · Performance · Maintainability, each rated
   **Low / Medium / High**.
10. **Decision** — exactly one:
   - ✅ **APPROVED**
   - ⚠️ **APPROVED WITH FOLLOW-UPS**
   - ❌ **CHANGES REQUIRED**

## Authority
MAY reject: architecture violations · Brand DNA violations · Design System
violations · Governance violations · production risks.
MAY NOT reject for personal preference.

## Escalation
Initiate an **Architecture Escalation only** when the implementation requires changing:
Master Specification · Architecture · Domain Model · Technology Stack · Design System ·
Brand DNA. Everything else → review comments or Technical Debt.

## Operating notes
- **Review inputs per Stage:** Stage id + objective · commit/diff · new deps (+
  justification) · build & test status.
- **Preview/dev-server:** requested **only** for UI/UX/Canvas Stages where a visual
  review adds real value (I QA in Chrome — build a system from empty). Internal /
  non-visual Stages → Code Review + Build + Tests + Diff suffice (UX = "n/a").
- After each review I update the Technical Debt Register and append any new risks.

## Goal
A consistent, production-grade engineering platform — while the implementation team
moves fast. The Reviewer maximizes quality without becoming a bottleneck.
