# Zentro — Technical Debt Register
Living log of accepted compromises. Reviewed at the start of every Phase.
Columns (per Charter): ID · Description · Business Impact · Severity · Cost · Recommendation · Target Phase · Status. (Reason kept inline in Description.)

Severity: Blocker (never accepted — must fix) · Major · Minor.
Status: OPEN · IN PROGRESS · DONE · WONTFIX.

## Open items (seeded from Stage-35 + QA findings, so nothing is lost)

| ID | Description | Business Impact | Sev | Cost | Recommendation | Phase | Status |
|----|-------------|-----------------|-----|------|----------------|-------|--------|
| TD-001 | Inspector shows only the last-clicked node on multi-select (no group panel "N נבחרו" + group actions) | Time-boxed; functional multi-delete works via RF | Major | Multi-select editing feels half-wired | Add group inspector state (count + duplicate/delete all) driven by unified `selectedIds` | Phase 3 (Stage D area) | OPEN |
| TD-002 | Inspector port labels were English (`Recirc In/Out`); now role-Hebrew, but generic `GenericNode` fallback still renders English `typeId.toUpperCase()` on canvas | Bespoke node art covers main types; fallback rare | Major | Hebrew-first break for uncommon types | Hebrew label for GenericNode via shared name registry | Phase 1 (Stage C) | OPEN |
| TD-003 | `HE_NAME` map duplicated (shared `component-he-names.ts` + local copies in palette & property panel) | Incremental fixes | Minor | Drift risk | Consolidate all consumers to the shared module | Phase 2 | OPEN |
| TD-004 | Monitor mode (ELK) can overlap disconnected components | ELK layout artifact; Build mode unaffected | Minor | Cosmetic in Monitor | Tune ELK / component spacing on layout | Phase 3 (Stage F) | OPEN |
| TD-005 | Doc/impl audit (`stage35-doc-impl-audit.md`) predates new shortcuts (Ctrl+A etc.) | Reality moved faster than the audit | Minor | Doc drift | Reconcile keyboard reference with implemented set | Phase 2 | OPEN |
| TD-006 | `tsc --noEmit` reports errors in `@xyflow/react` types under strict tsconfig; not in CI (build=oxc, tests=vitest) | Upstream lib types vs `exactOptionalPropertyTypes` | Minor | No runtime effect; tsc unusable as a gate | Pin/patch types or relax one tsconfig flag for app code | Phase 4 | OPEN |
| TD-007 | Pending uncommitted QA work in working tree (Ctrl+A + shortcuts hint) not yet committed; Stage-35 commits not yet pushed | Session interruptions; user pushes on Windows | Minor | Risk of losing local work | Commit the pending change; user pushes all Stage-35 commits | Phase 1 (immediate) | OPEN |
| TD-008 | Mount writes from host tools truncate on the Linux/build view; git needs a lock-clear workaround | Sandbox/mount environment quirk | Major (process) | Slows the implementer; risk of committing truncated files | Implementer should write via bash and verify line counts before commit | ongoing | OPEN |

## Notes
- No Blocker-severity debt is ever "accepted" — Blockers are CHANGES REQUIRED.
- New debt is appended with the next free TD-id during each Stage review.
