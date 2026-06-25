/**
 * Zentro Digital Twin — Ingestion Contract (Stage 9)
 *
 * Defines the boundary between the frontend runtime and any external data
 * source (backend API, BMS export, seed fixture, test harness).
 *
 * Rules:
 *  - GraphSnapshot is authoritative: ingestGraph() fully synchronises the
 *    store, including deletion of entities absent from the snapshot.
 *  - No EventStore or VersionStore writes — ingestion is not a Builder action.
 *  - No transport, scheduler, or backend logic lives here.
 *  - React never calls any function in this module.
 */

import type { Project, Component, Connection, OperationalProfile, AlarmRule, LiveSample } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';
import type { OperationalProfileStore } from '../projection/operational-profile-store.js';
import type { AlarmStore } from '../alarm/alarm-store.js';
import type { LiveStore } from '../telemetry/live-store.js';

// ---------------------------------------------------------------------------
// Snapshot types
// ---------------------------------------------------------------------------

/** Complete point-in-time replacement of a project's graph topology. */
export interface GraphSnapshot {
  project:     Project;
  components:  Component[];
  connections: Connection[];
}

export interface ProfileSnapshot {
  profiles: OperationalProfile[];
}

export interface AlarmRuleSnapshot {
  rules: AlarmRule[];
}

// ---------------------------------------------------------------------------
// Ingestor interface
// ---------------------------------------------------------------------------

export interface Ingestor {
  /**
   * Synchronises the graph store with the snapshot. Absent entities are
   * deleted. No EventStore or VersionStore writes are made.
   * Throws if any entity's projectId mismatches or a connection references
   * a component not present in the snapshot.
   */
  ingestGraph(snapshot: GraphSnapshot, stores: EngineStores): void;

  /** Upserts all profiles into the profile store. Additive — no deletions. */
  ingestProfiles(snapshot: ProfileSnapshot, store: OperationalProfileStore): void;

  /** Upserts all alarm rules into the alarm store. Additive — no deletions. */
  ingestAlarmRules(snapshot: AlarmRuleSnapshot, store: AlarmStore): void;

  /** Writes a single live sample into the live store. */
  ingestSample(sample: LiveSample, store: LiveStore): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createIngestor(): Ingestor {
  return { ingestGraph, ingestProfiles, ingestAlarmRules, ingestSample };
}

function ingestGraph(snapshot: GraphSnapshot, stores: EngineStores): void {
  const { project, components, connections } = snapshot;
  const { graph } = stores;
  const projectId = project.id;

  // --- Validate snapshot consistency ---
  for (const c of components) {
    if (c.projectId !== projectId) {
      throw new Error(
        `ingestGraph: component '${c.id}' has projectId '${c.projectId}', expected '${projectId}'.`,
      );
    }
  }

  const incomingComponentIds = new Set(components.map(c => c.id));

  for (const cn of connections) {
    if (cn.projectId !== projectId) {
      throw new Error(
        `ingestGraph: connection '${cn.id}' has projectId '${cn.projectId}', expected '${projectId}'.`,
      );
    }
    if (!incomingComponentIds.has(cn.fromComponentId)) {
      throw new Error(
        `ingestGraph: connection '${cn.id}' references unknown fromComponentId '${cn.fromComponentId}'.`,
      );
    }
    if (!incomingComponentIds.has(cn.toComponentId)) {
      throw new Error(
        `ingestGraph: connection '${cn.id}' references unknown toComponentId '${cn.toComponentId}'.`,
      );
    }
  }

  // --- Compute deletions ---
  const existingComponents  = graph.getComponents(projectId);
  const existingConnections = graph.getConnections(projectId);

  const incomingConnectionIds = new Set(connections.map(cn => cn.id));

  const connectionsToDelete = existingConnections.filter(cn => !incomingConnectionIds.has(cn.id));
  const componentsToDelete  = existingComponents.filter(c  => !incomingComponentIds.has(c.id));

  // Delete connections before components (referential integrity).
  for (const cn of connectionsToDelete) {
    graph.deleteConnection(projectId, cn.id);
  }
  for (const c of componentsToDelete) {
    graph.deleteComponent(projectId, c.id);
  }

  // --- Upsert ---
  graph.setProject(project);
  for (const c  of components)  { graph.setComponent(c); }
  for (const cn of connections) { graph.setConnection(cn); }
}

function ingestProfiles(snapshot: ProfileSnapshot, store: OperationalProfileStore): void {
  store.setMany(snapshot.profiles);
}

function ingestAlarmRules(snapshot: AlarmRuleSnapshot, store: AlarmStore): void {
  for (const rule of snapshot.rules) {
    store.setAlarmRule(rule);
  }
}

function ingestSample(sample: LiveSample, store: LiveStore): void {
  store.set(sample.bindingId, sample);
}
