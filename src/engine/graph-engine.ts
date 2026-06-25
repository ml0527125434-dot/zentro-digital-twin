/**
 * Zentro Digital Twin — Graph Engine (Stage 1B)
 *
 * All CONFIG mutations. Every mutation:
 *   1. Validates inputs (existence, uniqueness, port/medium compatibility).
 *   2. Persists to GraphStore.
 *   3. Increments the VersionStore (M10).
 *   4. Creates a DomainEvent via typed constructors and appends to EventStore (Art. 13).
 *   5. Returns { data, version, event } — never data alone.
 *
 * No business logic lives in GraphStore or EventStore.
 * No rendering, no live data, no commands.
 */

import type { Project, Component, Connection } from '../domain/types.js';
import type { VersionStore, ProjectVersion } from '../domain/project-version.js';
import type { EventStore } from '../domain/event-store.js';
import type { DomainEvent } from '../domain/events.js';
import {
  projectCreatedEvent,
  componentAddedEvent,
  componentUpdatedEvent,
  componentRemovedEvent,
  connectionAddedEvent,
  connectionUpdatedEvent,
  connectionRemovedEvent,
} from '../domain/events.js';
import type { ComponentRegistry } from '../lib/component-registry.js';

// ---------------------------------------------------------------------------
// GraphStore — engine-internal state (exported for graph-queries and tests)
// ---------------------------------------------------------------------------

export interface GraphStore {
  getProject(projectId: string): Project | undefined;
  setProject(project: Project): void;

  getComponents(projectId: string): Component[];
  getComponent(projectId: string, componentId: string): Component | undefined;
  setComponent(component: Component): void;
  deleteComponent(projectId: string, componentId: string): void;

  getConnections(projectId: string): Connection[];
  getConnection(projectId: string, connectionId: string): Connection | undefined;
  setConnection(connection: Connection): void;
  deleteConnection(projectId: string, connectionId: string): void;
}

export function createInMemoryGraphStore(): GraphStore {
  const projects    = new Map<string, Project>();
  const components  = new Map<string, Component>();
  const connections = new Map<string, Connection>();

  const ck = (projectId: string, id: string) => `${projectId}:${id}`;

  return {
    getProject:    (pid)      => projects.get(pid),
    setProject:    (p)        => projects.set(p.id, p),

    getComponents: (pid)      => [...components.values()].filter(c => c.projectId === pid),
    getComponent:  (pid, cid) => components.get(ck(pid, cid)),
    setComponent:  (c)        => components.set(ck(c.projectId, c.id), c),
    deleteComponent:(pid, cid)=> components.delete(ck(pid, cid)),

    getConnections:(pid)      => [...connections.values()].filter(c => c.projectId === pid),
    getConnection: (pid, cid) => connections.get(ck(pid, cid)),
    setConnection: (c)        => connections.set(ck(c.projectId, c.id), c),
    deleteConnection:(pid,cid)=> connections.delete(ck(pid, cid)),
  };
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface EngineStores {
  graph:    GraphStore;
  versions: VersionStore;
  events:   EventStore;
}

export interface MutationResult<T> {
  data:    T;
  version: ProjectVersion;
  event:   DomainEvent;
}

// Patch is limited to mutable fields only. id, type, projectId, bindings are immutable
// via this API (bindings are a Stage 4 concern — sensor assignment).
export type ComponentPatch = Partial<Pick<Component,
  | 'name'
  | 'position'
  | 'layoutHint'
  | 'mode'
  | 'bindings'
  | 'operationalProfileId'
  | 'allowedActions'
>>;

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

export function createProject(
  input:     { id: string; name: string; siteType: string },
  createdBy: string,
  stores:    EngineStores,
): MutationResult<Project> {
  const { graph, versions, events } = stores;

  if (graph.getProject(input.id)) {
    throw new Error(`Project '${input.id}' already exists.`);
  }

  const project: Project = { id: input.id, name: input.name, siteType: input.siteType };

  graph.setProject(project);
  const version = versions.increment(input.id, 'project_created', createdBy);
  const event   = projectCreatedEvent(project);
  events.append(event);

  return { data: project, version, event };
}

// ---------------------------------------------------------------------------
// addComponent
// ---------------------------------------------------------------------------

export function addComponent(
  projectId:  string,
  component:  Omit<Component, 'projectId'>,
  createdBy:  string,
  stores:     EngineStores,
): MutationResult<Component> {
  const { graph, versions, events } = stores;

  requireProject(graph, projectId);

  if (graph.getComponent(projectId, component.id)) {
    throw new Error(
      `Component '${component.id}' already exists in project '${projectId}'.`,
    );
  }

  const record: Component = { ...component, projectId };

  graph.setComponent(record);
  const version = versions.increment(projectId, 'component_add', createdBy);
  const event   = componentAddedEvent(projectId, record);
  events.append(event);

  return { data: record, version, event };
}

// ---------------------------------------------------------------------------
// updateComponent
// ---------------------------------------------------------------------------

export function updateComponent(
  projectId:   string,
  componentId: string,
  patch:       Readonly<ComponentPatch>,
  createdBy:   string,
  stores:      EngineStores,
): MutationResult<Component> {
  const { graph, versions, events } = stores;

  const existing = requireComponent(graph, projectId, componentId);
  const updated: Component = { ...existing, ...patch };

  graph.setComponent(updated);
  const version = versions.increment(projectId, 'component_update', createdBy);
  const event   = componentUpdatedEvent(projectId, componentId, patch);
  events.append(event);

  return { data: updated, version, event };
}

// ---------------------------------------------------------------------------
// removeComponent
// ---------------------------------------------------------------------------

export function removeComponent(
  projectId:   string,
  componentId: string,
  createdBy:   string,
  stores:      EngineStores,
): MutationResult<{ componentId: string }> {
  const { graph, versions, events } = stores;

  requireComponent(graph, projectId, componentId);

  // Referential integrity: reject if any connection still references this component
  const blocking = graph.getConnections(projectId).find(
    cn => cn.fromComponentId === componentId || cn.toComponentId === componentId,
  );
  if (blocking) {
    throw new Error(
      `Cannot remove component '${componentId}': referenced by connection '${blocking.id}'.`,
    );
  }

  graph.deleteComponent(projectId, componentId);
  const version = versions.increment(projectId, 'component_remove', createdBy);
  const event   = componentRemovedEvent(projectId, componentId);
  events.append(event);

  return { data: { componentId }, version, event };
}

// ---------------------------------------------------------------------------
// addConnection
// ---------------------------------------------------------------------------

export function addConnection(
  projectId:  string,
  connection: Omit<Connection, 'projectId'>,
  registry:   ComponentRegistry,
  createdBy:  string,
  stores:     EngineStores,
): MutationResult<Connection> {
  const { graph, versions, events } = stores;

  requireProject(graph, projectId);

  if (graph.getConnection(projectId, connection.id)) {
    throw new Error(
      `Connection '${connection.id}' already exists in project '${projectId}'.`,
    );
  }

  const fromComponent = requireComponent(graph, projectId, connection.fromComponentId);
  const toComponent   = requireComponent(graph, projectId, connection.toComponentId);

  // Port and medium validation
  const fromDef  = registry.getOrThrow(fromComponent.type);
  const toDef    = registry.getOrThrow(toComponent.type);
  const fromPort = fromDef.ports.find(p => p.id === connection.fromPortId);
  const toPort   = toDef.ports.find(p => p.id === connection.toPortId);

  if (!fromPort) {
    throw new Error(
      `Port '${connection.fromPortId}' does not exist on type '${fromComponent.type}'.`,
    );
  }
  if (!toPort) {
    throw new Error(
      `Port '${connection.toPortId}' does not exist on type '${toComponent.type}'.`,
    );
  }
  if (fromPort.role === 'inlet') {
    throw new Error(
      `Port '${connection.fromPortId}' is an inlet — cannot be a connection source.`,
    );
  }
  if (toPort.role === 'outlet') {
    throw new Error(
      `Port '${connection.toPortId}' is an outlet — cannot be a connection target.`,
    );
  }
  if (fromPort.medium !== connection.medium) {
    throw new Error(
      `Connection medium '${connection.medium}' does not match source port medium '${fromPort.medium}'.`,
    );
  }
  if (toPort.medium !== connection.medium) {
    throw new Error(
      `Connection medium '${connection.medium}' does not match target port medium '${toPort.medium}'.`,
    );
  }

  const record: Connection = { ...connection, projectId };

  graph.setConnection(record);
  const version = versions.increment(projectId, 'connection_add', createdBy);
  const event   = connectionAddedEvent(projectId, record);
  events.append(event);

  return { data: record, version, event };
}

// ---------------------------------------------------------------------------
// updateConnection
// ---------------------------------------------------------------------------

/** Fields that can be patched on an existing connection (no structural re-routing). */
export type ConnectionPatch = Partial<Pick<Connection,
  | 'topologicalDirection'
  | 'bindings'
  | 'valueBindingId'
  | 'inferFromComponentId'
  | 'operationalProfileId'
>>;

export function updateConnection(
  projectId:    string,
  connectionId: string,
  patch:        Readonly<ConnectionPatch>,
  createdBy:    string,
  stores:       EngineStores,
): MutationResult<Connection> {
  const { graph, versions, events } = stores;

  const existing = graph.getConnection(projectId, connectionId);
  if (!existing) {
    throw new Error(`Connection '${connectionId}' not found in project '${projectId}'.`);
  }

  const updated: Connection = { ...existing, ...patch };

  graph.setConnection(updated);
  const version = versions.increment(projectId, 'connection_update', createdBy);
  const event   = connectionUpdatedEvent(projectId, connectionId, patch);
  events.append(event);

  return { data: updated, version, event };
}

// ---------------------------------------------------------------------------
// removeConnection
// ---------------------------------------------------------------------------

export function removeConnection(
  projectId:    string,
  connectionId: string,
  createdBy:    string,
  stores:       EngineStores,
): MutationResult<{ connectionId: string }> {
  const { graph, versions, events } = stores;

  if (!graph.getConnection(projectId, connectionId)) {
    throw new Error(
      `Connection '${connectionId}' not found in project '${projectId}'.`,
    );
  }

  graph.deleteConnection(projectId, connectionId);
  const version = versions.increment(projectId, 'connection_remove', createdBy);
  const event   = connectionRemovedEvent(projectId, connectionId);
  events.append(event);

  return { data: { connectionId }, version, event };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireProject(graph: GraphStore, projectId: string): Project {
  const project = graph.getProject(projectId);
  if (!project) throw new Error(`Project '${projectId}' not found.`);
  return project;
}

function requireComponent(
  graph:       GraphStore,
  projectId:   string,
  componentId: string,
): Component {
  const component = graph.getComponent(projectId, componentId);
  if (!component) {
    throw new Error(`Component '${componentId}' not found in project '${projectId}'.`);
  }
  return component;
}
