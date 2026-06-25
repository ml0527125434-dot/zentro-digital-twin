import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryEventStore, type EventStore } from './event-store.js';
import { projectCreatedEvent, componentAddedEvent, componentRemovedEvent } from './events.js';
import type { Project, Component } from './types.js';

const PROJECT_A = 'proj_a';
const PROJECT_B = 'proj_b';

const project: Project = { id: PROJECT_A, name: 'Test Project', siteType: 'hot_water' };

const component: Component = {
  id: 'cmp_1', type: 'tank', name: 'Tank 1', projectId: PROJECT_A, bindings: [],
};

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = createInMemoryEventStore();
  });

  it('append then query returns the event', () => {
    const event = projectCreatedEvent(project);
    store.append(event);
    const results = store.query(PROJECT_A);
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(event);
  });

  it('query returns events in insertion order', () => {
    const e1 = projectCreatedEvent(project);
    const e2 = componentAddedEvent(PROJECT_A, component);
    store.append(e1);
    store.append(e2);
    const results = store.query(PROJECT_A);
    expect(results[0]?.id).toBe(e1.id);
    expect(results[1]?.id).toBe(e2.id);
  });

  it('query for unknown project returns empty array', () => {
    expect(store.query('nonexistent')).toHaveLength(0);
  });

  it('query does not return events from a different project', () => {
    const projectB: Project = { id: PROJECT_B, name: 'B', siteType: 'pool' };
    store.append(projectCreatedEvent(project));
    store.append(projectCreatedEvent(projectB));
    expect(store.query(PROJECT_A)).toHaveLength(1);
    expect(store.query(PROJECT_B)).toHaveLength(1);
  });

  it('query with since filters events before the cutoff', async () => {
    const e1 = projectCreatedEvent(project);
    store.append(e1);

    // wait 2ms so e2.ts is strictly after e1.ts
    await new Promise(r => setTimeout(r, 2));
    const cutoff = new Date().toISOString();
    await new Promise(r => setTimeout(r, 2));

    const e2 = componentAddedEvent(PROJECT_A, component);
    store.append(e2);

    const results = store.query(PROJECT_A, cutoff);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(e2.id);
  });

  it('returned list is a copy — mutating it does not affect the store', () => {
    store.append(projectCreatedEvent(project));
    const results = store.query(PROJECT_A) as DomainEvent[];
    results.splice(0, 1);
    expect(store.query(PROJECT_A)).toHaveLength(1);
  });

  it('event data is frozen — cannot be mutated after append', () => {
    const event = projectCreatedEvent(project);
    store.append(event);
    expect(() => {
      (event as Record<string, unknown>)['id'] = 'tampered';
    }).toThrow();
  });

  it('queryByKind returns only events of the requested kind', () => {
    store.append(projectCreatedEvent(project));
    store.append(componentAddedEvent(PROJECT_A, component));
    store.append(componentRemovedEvent(PROJECT_A, component.id));

    const added = store.queryByKind(PROJECT_A, 'component_added');
    expect(added).toHaveLength(1);
    expect(added[0]?.kind).toBe('component_added');
  });

  it('queryByKind for kind with no events returns empty array', () => {
    store.append(projectCreatedEvent(project));
    expect(store.queryByKind(PROJECT_A, 'connection_added')).toHaveLength(0);
  });
});

// TypeScript import to satisfy the reference in the mutation test
import type { DomainEvent } from './events.js';
