/**
 * Zentro Digital Twin — Project Snapshot (Stage 35, P0-1)
 *
 * Pure, dependency-light (domain types only) serialization of the CONFIG graph:
 * the building model the Builder owns — project + components + connections +
 * operational profiles.
 *
 * This module knows NOTHING about WHERE data is stored (localStorage / file /
 * backend). Storage adapters consume `ProjectSnapshot`; the Builder consumes the
 * `ProjectRepository` port. Neither knows about the other.
 *
 * Versioning: every snapshot carries a `schemaVersion`. `parseProjectSnapshot`
 * validates structure and runs forward migrations so older saved files keep
 * loading after the schema evolves.
 */

import type {
  Project,
  Component,
  Connection,
  OperationalProfile,
} from '../domain/types.js';

/** Bump when the snapshot shape changes; add a migration step in `migrate()`. */
export const CURRENT_SCHEMA_VERSION = 1;

export interface ProjectSnapshot {
  readonly schemaVersion: number;
  readonly savedAt: string; // ISO8601
  readonly project: Project;
  readonly operationalProfiles: OperationalProfile[];
  readonly components: Component[];
  readonly connections: Connection[];
}

/** Thrown when raw input cannot be parsed into a valid ProjectSnapshot. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

// ---------------------------------------------------------------------------
// Read/write seams — keep this module independent of engine/store internals.
// Adapters that bind these to EngineStores live in `store-binding.ts`.
// ---------------------------------------------------------------------------

export interface SnapshotSource {
  getProject(projectId: string): Project | undefined;
  getComponents(projectId: string): Component[];
  getConnections(projectId: string): Connection[];
  listProfiles(): OperationalProfile[];
}

export interface SnapshotSink {
  setProject(project: Project): void;
  setComponent(component: Component): void;
  setConnection(connection: Connection): void;
  setProfiles(profiles: OperationalProfile[]): void;
}

// ---------------------------------------------------------------------------
// Serialize — read current CONFIG graph into a plain, JSON-safe snapshot
// ---------------------------------------------------------------------------

export function serializeProjectSnapshot(
  source: SnapshotSource,
  projectId: string,
  now: () => string = () => new Date().toISOString(),
): ProjectSnapshot {
  const project = source.getProject(projectId);
  if (!project) {
    throw new SnapshotError(`Cannot serialize: project '${projectId}' not found.`);
  }
  // Deep-clone via structuredClone so the snapshot never aliases live store objects.
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: now(),
    project: clone(project),
    operationalProfiles: source.listProfiles().map(clone),
    components: source.getComponents(projectId).map(clone),
    connections: source.getConnections(projectId).map(clone),
  };
}

// ---------------------------------------------------------------------------
// Apply — write a snapshot's CONFIG graph into a (typically fresh) sink
// ---------------------------------------------------------------------------

export function applyProjectSnapshot(
  snapshot: ProjectSnapshot,
  sink: SnapshotSink,
): void {
  sink.setProject(clone(snapshot.project));
  sink.setProfiles(snapshot.operationalProfiles.map(clone));
  for (const component of snapshot.components) sink.setComponent(clone(component));
  for (const connection of snapshot.connections) sink.setConnection(clone(connection));
}

// ---------------------------------------------------------------------------
// JSON encode / decode (used by the file import/export feature and adapters)
// ---------------------------------------------------------------------------

export function snapshotToJson(snapshot: ProjectSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function snapshotFromJson(text: string): ProjectSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('Invalid JSON: the file is not valid JSON text.');
  }
  return parseProjectSnapshot(raw);
}

// ---------------------------------------------------------------------------
// Validate + migrate — the single gate any external snapshot must pass
// ---------------------------------------------------------------------------

export function parseProjectSnapshot(raw: unknown): ProjectSnapshot {
  if (!isRecord(raw)) {
    throw new SnapshotError('Snapshot must be a JSON object.');
  }

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isFinite(version)) {
    throw new SnapshotError('Snapshot is missing a numeric "schemaVersion".');
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SnapshotError(
      `Snapshot schemaVersion ${version} is newer than this app supports ` +
        `(${CURRENT_SCHEMA_VERSION}). Please update the application.`,
    );
  }

  const migrated = migrate(raw);
  return validateShape(migrated);
}

/**
 * Forward migrations. Each step upgrades a snapshot from version N to N+1.
 * Today there is only v1, so this is the identity. The structure is here so
 * the next schema change is a one-line addition, never a rewrite.
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let working = { ...raw };
  let version = working.schemaVersion as number;

  // Example of the pattern for future use:
  // if (version === 1) { working = upgradeV1toV2(working); version = 2; }

  // Always stamp the current version once migrations complete.
  working.schemaVersion = version < CURRENT_SCHEMA_VERSION ? CURRENT_SCHEMA_VERSION : version;
  return working;
}

function validateShape(raw: Record<string, unknown>): ProjectSnapshot {
  const project = raw.project;
  if (!isRecord(project) || typeof project.id !== 'string' || project.id.length === 0) {
    throw new SnapshotError('Snapshot "project" is missing or has no id.');
  }
  if (typeof project.name !== 'string') {
    throw new SnapshotError('Snapshot project.name must be a string.');
  }
  if (typeof project.siteType !== 'string') {
    throw new SnapshotError('Snapshot project.siteType must be a string.');
  }

  const components = raw.components;
  if (!Array.isArray(components)) {
    throw new SnapshotError('Snapshot "components" must be an array.');
  }
  const connections = raw.connections;
  if (!Array.isArray(connections)) {
    throw new SnapshotError('Snapshot "connections" must be an array.');
  }
  const operationalProfiles = raw.operationalProfiles ?? [];
  if (!Array.isArray(operationalProfiles)) {
    throw new SnapshotError('Snapshot "operationalProfiles" must be an array.');
  }

  for (const c of components) {
    if (!isRecord(c) || typeof c.id !== 'string' || typeof c.type !== 'string') {
      throw new SnapshotError('Each component needs a string id and type.');
    }
    if (c.projectId !== project.id) {
      throw new SnapshotError(
        `Component '${String(c.id)}' projectId does not match snapshot project '${project.id}'.`,
      );
    }
  }
  for (const c of connections) {
    if (
      !isRecord(c) ||
      typeof c.id !== 'string' ||
      typeof c.fromComponentId !== 'string' ||
      typeof c.toComponentId !== 'string'
    ) {
      throw new SnapshotError('Each connection needs id, fromComponentId and toComponentId.');
    }
    if (c.projectId !== project.id) {
      throw new SnapshotError(
        `Connection '${String(c.id)}' projectId does not match snapshot project '${project.id}'.`,
      );
    }
  }

  const savedAt = typeof raw.savedAt === 'string' ? raw.savedAt : new Date(0).toISOString();

  return {
    schemaVersion: raw.schemaVersion as number,
    savedAt,
    project: project as unknown as Project,
    operationalProfiles: operationalProfiles as OperationalProfile[],
    components: components as Component[],
    connections: connections as Connection[],
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clone<T>(value: T): T {
  // structuredClone is available in all target runtimes (browser + Node 17+ test env).
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}
