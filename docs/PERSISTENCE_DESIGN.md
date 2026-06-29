# Zentro Digital Twin — Persistence Design

> **Phase 3 deliverable — DESIGN ONLY.** Per the execution plan, **no persistence code is written
> until this design is approved** (a business decision). This document is the contract that
> `ZB-001…ZB-004` implement.
>
> **Status: ⛔ AWAITING APPROVAL.** See §13 (Approval gate) for exactly what is blocked.

- **Created:** 2026-06-29.
- **Backlog:** ZB-001 (this design), ZB-002 (Save/Load), ZB-003 (Autosave/Recovery), ZB-004 (Import/Export).
- **Guiding decision:** **reuse, don't reinvent.** The codebase already has a complete load path
  (`ZentroPayload` → `validatePayload` → `Ingestor` → stores → `bootstrapApp`). Persistence is a
  **versioned envelope around `ZentroPayload`**, plus its inverse (stores → payload) for saving.

---

## 1. Goals & non-goals

**Goals**
- A plant design survives reloads, crashes, and machine moves.
- One canonical serialized format, reused for local save, autosave, and JSON import/export.
- Forward-compatible: old documents open in new app versions via migrations.
- Zero new domain concepts — persist exactly the CONFIG plane that already exists.

**Non-goals (explicitly out of scope here)**
- Multi-user / cloud sync / real backend (the backend adapter will emit the same `ZentroPayload`).
- Persisting **TELEMETRY** (`LiveStore`) or live **Alarm instances** — these are runtime, never config.
- A history/versioning **UI** (deferred; the runtime `VersionStore`/`EventStore` are session-only).
- Undo/redo (separate substrate — see `ZB-005`, architecture §8–9).

---

## 2. What is persisted (the CONFIG snapshot)

Persistence captures the **CONFIG plane only** — identical in shape to the existing `ZentroPayload`:

| Persisted | Source store | Notes |
|-----------|--------------|-------|
| `project` (id, name, siteType) | `GraphStore.getProject` | one project per document (current model). |
| `components[]` | `GraphStore.getComponents` | includes `position`, `bindings`, `mode`, `operationalProfileId`. |
| `connections[]` | `GraphStore.getConnections` | includes `medium`, `topologicalDirection`, segment bindings. |
| `operationalProfiles[]` | `OperationalProfileStore` | type/instance/project profiles. |
| `alarmRules[]` | `AlarmStore` (rules, not instances) | alarm **definitions** only. |

**Never persisted:** live samples, derived view models, sensor/health/flow state, alarm **instances**,
command requests, the runtime `VersionStore`/`EventStore` contents.

---

## 3. Document schema (the envelope)

A saved document wraps a `ZentroPayload` with metadata. Versioned independently of the runtime
session version.

```jsonc
{
  "kind": "zentro.digital-twin.document",   // magic string — reject anything else on import
  "schemaVersion": 1,                         // integer; drives migrations (§5)
  "appVersion": "0.x.y",                      // informational; the app build that wrote it
  "savedAt": "2026-06-29T12:00:00.000Z",      // ISO8601
  "document": {
    "id": "doc_<8hex>",                       // stable document id
    "name": "מערכת מים חמים — בניין א",        // user-facing title (defaults to project name)
    "payload": {                              // EXACTLY the existing ZentroPayload shape
      "graph":      { "project": {…}, "components": [...], "connections": [...] },
      "profiles":   { "profiles": [...] },
      "alarmRules": { "rules": [...] }
    }
  }
}
```

**Rationale:** `document.payload` is byte-for-byte loadable by the existing `Ingestor` /
`bootstrapApp`. The envelope (`kind`, `schemaVersion`, `appVersion`, `savedAt`) carries everything
needed for validation, migration, and recovery without touching the payload contract.

### TypeScript contract (to add in implementation)
```ts
export interface ZentroDocument {
  kind: 'zentro.digital-twin.document';
  schemaVersion: number;
  appVersion: string;
  savedAt: string;
  document: { id: string; name: string; payload: ZentroPayload };
}
export const CURRENT_SCHEMA_VERSION = 1;
```

---

## 4. Serialization — the two directions

```
 SAVE   stores ──extractPayload()──▶ ZentroPayload ──wrap()──▶ ZentroDocument ──JSON.stringify──▶ string
 LOAD   string ──JSON.parse──▶ unknown ──validate+migrate──▶ ZentroDocument ──.document.payload──▶ bootstrapApp/Ingestor
```

- **`extractPayload(stores, profileStore, alarmStore): ZentroPayload`** — the **new** inverse of
  `Ingestor.ingest*`. Reads the four stores and assembles the payload. This is the only genuinely new
  serialization code; everything else reuses existing modules.
- **Load** reuses `validatePayload()` (extended to validate the envelope first) and the `Ingestor`'s
  authoritative-snapshot semantics: absent entities are deleted, present ones upserted, connections
  before components for referential integrity.

---

## 5. Versioning & migration strategy

- `schemaVersion` is a **monotonic integer**, starting at **1**. Bump it whenever the persisted shape
  changes incompatibly.
- **Forward-only migration registry**: an ordered map `{ [from]: (doc) => docAtNextVersion }`. On load,
  run migrations in sequence until `schemaVersion === CURRENT_SCHEMA_VERSION`.

```ts
const MIGRATIONS: Record<number, (d: any) => any> = {
  // 1: (d) => ({ ...d, schemaVersion: 2, /* transform */ }),
};
function migrate(doc: any): ZentroDocument {
  let d = doc;
  while (d.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[d.schemaVersion];
    if (!step) throw new PersistenceError('NO_MIGRATION_PATH', d.schemaVersion);
    d = step(d);
  }
  return d;
}
```

- **Document newer than the app** (`schemaVersion > CURRENT`): refuse to load with a clear message
  ("this file was saved by a newer version"); never silently drop fields.
- Migrations are **pure and tested**; each gets a golden before/after fixture.

---

## 6. Storage medium

- **Primary: `localStorage`.** Synchronous, simple, ample for typical plants (a 100-component design
  serializes to well under the ~5 MB per-origin budget).
- **Key scheme** (namespaced, one project today, multi-document ready):
  - `zentro:doc:<docId>` → the saved `ZentroDocument` JSON.
  - `zentro:doc:<docId>:autosave` → the latest autosave `ZentroDocument` JSON.
  - `zentro:index` → `{ lastOpenedDocId, docs: [{ id, name, savedAt }] }`.
- **Quota handling:** wrap writes in try/catch for `QuotaExceededError`; surface a non-blocking error
  and keep the in-memory state intact (never lose the live design because a write failed).
- **IndexedDB fallback (deferred trigger):** if a serialized document exceeds a threshold (e.g. > 2 MB)
  or quota errors recur, migrate the storage backend to IndexedDB behind the same `ProjectStore`
  interface. Designed-for, not built now.

---

## 7. Service surface (`ProjectStore`)

A single service hides the medium and the envelope from the UI:

```ts
interface ProjectStore {
  save(stores, profileStore, alarmStore, meta?): ZentroDocument;   // explicit save → :doc slot
  load(docId?): ZentroDocument | null;                              // read + validate + migrate
  autosave(stores, profileStore, alarmStore): void;                // debounced → :autosave slot
  hasRecovery(docId?): { autosavedAt: string; savedAt: string } | null;
  export(stores, profileStore, alarmStore): Blob;                  // JSON download
  import(file: File): Promise<ZentroDocument>;                     // validate + migrate, no write
  clearAutosave(docId?): void;
}
```

The UI calls only this interface; `extractPayload`, validation, migration, and storage live behind it.

---

## 8. Autosave lifecycle (ZB-003)

```
 mutation committed ──onMutation()──▶ debounce(~1000ms) ──▶ ProjectStore.autosave()
                                                  │
                                                  ▼
                              write zentro:doc:<id>:autosave  (+ savedAt timestamp)
```

- Hooks the **existing** `onMutation` signal (already fired by every Builder mutation).
- **Debounced** (~1 s) and **coalesced**: rapid edits produce one write.
- **Non-blocking**: serialization on the main thread is cheap at this scale; if profiling shows cost,
  move `JSON.stringify` to an idle callback. Never block input.
- Autosave writes to a **separate slot** from explicit Save, so an accidental autosave never clobbers
  a deliberate save the user may want to return to.

---

## 9. Recovery (ZB-003)

On application boot, before loading the demo fixture:

```
 boot
  ├─ read zentro:index → lastOpenedDocId
  ├─ load(:doc)  → savedAt_S
  ├─ peek(:autosave) → savedAt_A
  ├─ if :autosave exists AND savedAt_A > savedAt_S:
  │     show non-blocking banner "שחזור עבודה שלא נשמרה?" [שחזר] [התעלם]
  │        שחזר   → ingest :autosave, then clearAutosave
  │        התעלם  → keep :doc, clearAutosave
  └─ else load :doc (or demo fixture if none)
```

- Recovery is **opt-in** and reversible; we never auto-overwrite the explicit save without consent.
- If parsing/validation/migration of either slot fails, fall back to the other (or the demo) and
  report a non-blocking error — boot must always succeed.

---

## 10. JSON Import / Export (ZB-004)

- **Export:** `ProjectStore.export()` → `extractPayload` → wrap → `JSON.stringify` (pretty) → `Blob` →
  download as `<document-name>.zentro.json`.
- **Import:** read file → `JSON.parse` → **validate envelope** (`kind`, `schemaVersion`) → `migrate` →
  `validatePayload(document.payload)` → on success, ingest via the authoritative snapshot path
  (replace). On any failure, **reject with all error paths** (reuse `ValidationError[]`), change nothing.
- **Replace, not merge.** Consistent with the `Ingestor`'s snapshot semantics; merge is out of scope.
- Round-trip guarantee: `export` then `import` reproduces an equivalent `GraphStore` (tested).

---

## 11. Error handling & edge cases

| Case | Behaviour |
|------|-----------|
| Corrupt JSON in storage | Non-blocking error; fall back to other slot / demo; boot still succeeds. |
| `kind` missing/wrong on import | Reject: "not a Zentro document." |
| `schemaVersion` > current | Reject: "saved by a newer version." |
| `schemaVersion` < current | Migrate; if no path, reject with the version number. |
| `validatePayload` errors | Reject with all `ValidationError[]` paths; no mutation. |
| `QuotaExceededError` on save | Non-blocking error; in-memory state preserved; suggest export. |
| Empty project | Valid; saves/loads an empty graph. |

---

## 12. Test plan (gates ZB-002…004 "done")

1. **Round-trip equality:** build graph → `extractPayload` → wrap → unwrap → ingest → identical graph.
2. **Export → import** on a fresh session reproduces the design.
3. **Migration:** golden fixtures for each `schemaVersion` step; `migrate` reaches `CURRENT`.
4. **Recovery:** simulate autosave newer than save → recovery path restores it; "ignore" keeps save.
5. **Rejection:** corrupt JSON, wrong `kind`, future `schemaVersion`, invalid payload — all rejected
   without mutating live state.
6. **Quota:** mocked `QuotaExceededError` surfaces a non-blocking error and preserves state.
7. **No telemetry leakage:** assert serialized output contains no live samples / view-model fields.

---

## 13. Approval gate ⛔

**The following is blocked until the user approves this design:**
- ZB-002 (Save/Load), ZB-003 (Autosave/Recovery), ZB-004 (JSON Import/Export) — all implementation.
- The new `extractPayload`, `ProjectStore`, `ZentroDocument` types, and migration registry.

**Decisions requested in approval (or accept the recommended defaults below):**
1. **Storage medium** — recommended: `localStorage` now, IndexedDB behind the same interface later. ✅ default
2. **One document per project vs. multiple named documents** — recommended: build the key scheme for
   multiple, ship single-document UX first. ✅ default
3. **Autosave debounce interval** — recommended: 1000 ms. ✅ default
4. **Import semantics** — recommended: replace (snapshot), not merge. ✅ default

If the defaults are acceptable, approval can be a single "approved." Implementation then proceeds in
backlog order: ZB-001 (types/extract) → ZB-002 → ZB-004 → ZB-003.

---

## Appendix — reused vs. new code

| Reused (no change) | New (to build on approval) |
|--------------------|----------------------------|
| `ZentroPayload` shape | `ZentroDocument` envelope type |
| `validatePayload` / `assertValidPayload` | envelope validation + `migrate()` |
| `Ingestor` (authoritative snapshot) | `extractPayload()` (stores → payload, inverse of ingest) |
| `bootstrapApp` / `loadFixture` | `ProjectStore` service (save/load/autosave/import/export) |
| `onMutation` signal | autosave debounce + recovery banner |
