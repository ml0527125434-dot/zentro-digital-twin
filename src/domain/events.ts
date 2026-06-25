/**
 * Zentro Digital Twin — Domain Events
 *
 * Typed constructors for every CONFIG mutation event (Constitution Art. 13).
 * These are the ONLY way to create a DomainEvent. No raw object construction.
 *
 * Pattern:
 *   Graph operation → Domain Event constructor → EventStore.append(event)
 *
 * The EventStore stores and retrieves; it contains no business logic.
 * Event constructors contain no business logic; they only shape the record.
 */

import type { Component, Connection, OperationalProfile, Project } from './types.js';

export type DomainEventKind =
  | 'project_created'
  | 'component_added'
  | 'component_updated'
  | 'component_removed'
  | 'connection_added'
  | 'connection_updated'
  | 'connection_removed'
  | 'profile_updated';

export interface DomainEvent {
  readonly id:        string;
  readonly projectId: string;
  readonly ts:        string;           // ISO8601
  readonly kind:      DomainEventKind;
  readonly data:      Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Typed constructors — the only way to produce a DomainEvent
// ---------------------------------------------------------------------------

export function projectCreatedEvent(project: Project): DomainEvent {
  return makeEvent(project.id, 'project_created', { project });
}

export function componentAddedEvent(
  projectId: string,
  component: Component,
): DomainEvent {
  return makeEvent(projectId, 'component_added', { component });
}

export function componentUpdatedEvent(
  projectId:   string,
  componentId: string,
  patch:       Readonly<Partial<Component>>,
): DomainEvent {
  return makeEvent(projectId, 'component_updated', { componentId, patch });
}

export function componentRemovedEvent(
  projectId:   string,
  componentId: string,
): DomainEvent {
  return makeEvent(projectId, 'component_removed', { componentId });
}

export function connectionAddedEvent(
  projectId:  string,
  connection: Connection,
): DomainEvent {
  return makeEvent(projectId, 'connection_added', { connection });
}

export function connectionUpdatedEvent(
  projectId:    string,
  connectionId: string,
  patch:        Readonly<Partial<Connection>>,
): DomainEvent {
  return makeEvent(projectId, 'connection_updated', { connectionId, patch });
}

export function connectionRemovedEvent(
  projectId:    string,
  connectionId: string,
): DomainEvent {
  return makeEvent(projectId, 'connection_removed', { connectionId });
}

export function profileUpdatedEvent(
  projectId: string,
  profile:   OperationalProfile,
): DomainEvent {
  return makeEvent(projectId, 'profile_updated', { profile });
}

// ---------------------------------------------------------------------------
// Internal factory — not exported
// ---------------------------------------------------------------------------

function makeEvent(
  projectId: string,
  kind:      DomainEventKind,
  data:      Record<string, unknown>,
): DomainEvent {
  return Object.freeze({
    id:        crypto.randomUUID(),
    projectId,
    ts:        new Date().toISOString(),
    kind,
    data:      Object.freeze({ ...data }),
  });
}
