import { describe, it, expect } from 'vitest';
import {
  projectCreatedEvent,
  componentAddedEvent,
  componentUpdatedEvent,
  componentRemovedEvent,
  connectionAddedEvent,
  connectionRemovedEvent,
  profileUpdatedEvent,
} from './events.js';
import type { Project, Component, Connection, OperationalProfile } from './types.js';
import { NodeStatus } from './types.js';

const project: Project = { id: 'proj_1', name: 'Hot Water Demo', siteType: 'hot_water' };

const component: Component = {
  id: 'cmp_tank', type: 'tank', name: 'Storage Tank', projectId: 'proj_1', bindings: [],
};

const connection: Connection = {
  id: 'cn_supply',
  projectId: 'proj_1',
  fromComponentId: 'cmp_tank', fromPortId: 'hot_out',
  toComponentId: 'cmp_tmv',   toPortId:   'hot_in',
  medium: 'hot_water',
  topologicalDirection: 'forward',
};

const profile: OperationalProfile = {
  id: 'op_tank_default', appliesToType: 'tank', scope: 'type_default',
  metrics: [{ metric: 'temperature', unit: '°C', bands: [{ status: NodeStatus.Ok, min: 55 }] }],
};

describe('Domain Event constructors', () => {
  it('projectCreatedEvent produces correct kind', () => {
    const e = projectCreatedEvent(project);
    expect(e.kind).toBe('project_created');
    expect(e.projectId).toBe('proj_1');
  });

  it('componentAddedEvent produces correct kind and projectId', () => {
    const e = componentAddedEvent('proj_1', component);
    expect(e.kind).toBe('component_added');
    expect(e.projectId).toBe('proj_1');
  });

  it('componentUpdatedEvent carries the patch in data', () => {
    const patch = { name: 'Renamed Tank' };
    const e = componentUpdatedEvent('proj_1', 'cmp_tank', patch);
    expect(e.kind).toBe('component_updated');
    expect((e.data as Record<string, unknown>)['componentId']).toBe('cmp_tank');
    expect(((e.data as Record<string, unknown>)['patch'] as Record<string, unknown>)['name']).toBe('Renamed Tank');
  });

  it('componentRemovedEvent carries the componentId in data', () => {
    const e = componentRemovedEvent('proj_1', 'cmp_tank');
    expect(e.kind).toBe('component_removed');
    expect((e.data as Record<string, unknown>)['componentId']).toBe('cmp_tank');
  });

  it('connectionAddedEvent produces correct kind', () => {
    const e = connectionAddedEvent('proj_1', connection);
    expect(e.kind).toBe('connection_added');
  });

  it('connectionRemovedEvent carries the connectionId in data', () => {
    const e = connectionRemovedEvent('proj_1', 'cn_supply');
    expect(e.kind).toBe('connection_removed');
    expect((e.data as Record<string, unknown>)['connectionId']).toBe('cn_supply');
  });

  it('profileUpdatedEvent produces correct kind', () => {
    const e = profileUpdatedEvent('proj_1', profile);
    expect(e.kind).toBe('profile_updated');
  });

  it('each event has a unique id', () => {
    const e1 = projectCreatedEvent(project);
    const e2 = projectCreatedEvent(project);
    expect(e1.id).not.toBe(e2.id);
  });

  it('ts is a valid ISO8601 string', () => {
    const e = projectCreatedEvent(project);
    expect(() => new Date(e.ts)).not.toThrow();
    expect(new Date(e.ts).toISOString()).toBe(e.ts);
  });

  it('event is frozen — id cannot be mutated after creation', () => {
    const e = projectCreatedEvent(project);
    expect(() => {
      (e as Record<string, unknown>)['id'] = 'tampered';
    }).toThrow();
  });

  it('event data is frozen — cannot be mutated after creation', () => {
    const e = componentAddedEvent('proj_1', component);
    expect(() => {
      (e.data as Record<string, unknown>)['injected'] = true;
    }).toThrow();
  });
});
