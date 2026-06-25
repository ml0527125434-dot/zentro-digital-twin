/**
 * Zentro Digital Twin — Event Store
 *
 * Append-only storage for DomainEvents (Constitution Art. 13).
 * Storage only — no business logic, no validation, no mutation.
 *
 * The EventStore trusts that the caller (Graph Engine, future services) has
 * already produced a valid DomainEvent via the typed constructors in events.ts.
 */

import type { DomainEvent, DomainEventKind } from './events.js';

export interface EventStore {
  /** Append a domain event. The event is immutable after this call. */
  append(event: DomainEvent): void;

  /** All events for a project, in insertion order. Optionally filtered by ISO8601 `since`. */
  query(projectId: string, since?: string): readonly DomainEvent[];

  /** All events of a specific kind for a project, in insertion order. */
  queryByKind(projectId: string, kind: DomainEventKind): readonly DomainEvent[];
}

export function createInMemoryEventStore(): EventStore {
  // keyed by projectId; each list is append-only
  const store = new Map<string, DomainEvent[]>();

  function getList(projectId: string): DomainEvent[] {
    let list = store.get(projectId);
    if (!list) {
      list = [];
      store.set(projectId, list);
    }
    return list;
  }

  return {
    append(event) {
      getList(event.projectId).push(event);
    },

    query(projectId, since) {
      const list = getList(projectId);
      if (since === undefined) return [...list];
      const cutoff = new Date(since).getTime();
      return list.filter(e => new Date(e.ts).getTime() >= cutoff);
    },

    queryByKind(projectId, kind) {
      return getList(projectId).filter(e => e.kind === kind);
    },
  };
}
