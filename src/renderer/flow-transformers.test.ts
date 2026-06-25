import { describe, it, expect } from 'vitest';
import {
  componentToNode,
  connectionToEdge,
  buildFlowGraph,
} from './flow-transformers.js';
import type { Component, Connection } from '../domain/types.js';
import {
  HealthState, NodeStatus, SensorState,
  ValueProvenance, FlowState,
} from '../domain/types.js';
import type { ComponentViewModel, ConnectionViewModel } from '../domain/types.js';

function makeVM(overrides: Partial<ComponentViewModel> = {}): ComponentViewModel {
  return {
    componentId:       'cmp_1',
    health:            HealthState.Healthy,
    operationalStatus: NodeStatus.Ok,
    sensorState:       SensorState.Live,
    provenance:        ValueProvenance.Measured,
    liveValues:        {},
    activeCommands:    [],
    activeAlarms:      [],
    ...overrides,
  };
}

function makeConnectionVM(overrides: Partial<ConnectionViewModel> = {}): ConnectionViewModel {
  return {
    connectionId: 'cn_1',
    flow:         FlowState.Flowing,
    value:        null,
    status:       NodeStatus.Ok,
    sensorState:  SensorState.Live,
    provenance:   ValueProvenance.Measured,
    ...overrides,
  };
}

const COMPONENT: Component = {
  id:        'cmp_1',
  type:      'storage_tank',
  name:      'Main Tank',
  projectId: 'proj_1',
  position:  { x: 100, y: 200 },
  bindings:  [],
};

const CONNECTION: Connection = {
  id:                   'cn_1',
  projectId:            'proj_1',
  fromComponentId:      'cmp_1',
  fromPortId:           'hot_out',
  toComponentId:        'cmp_2',
  toPortId:             'hot_in',
  medium:               'hot_water',
  topologicalDirection: 'forward',
};

// ---------------------------------------------------------------------------
// componentToNode
// ---------------------------------------------------------------------------

describe('componentToNode', () => {
  it('maps component id to node id', () => {
    const n = componentToNode(COMPONENT, makeVM());
    expect(n.id).toBe('cmp_1');
  });

  it('uses component type as node type', () => {
    const n = componentToNode(COMPONENT, makeVM());
    expect(n.type).toBe('storage_tank');
  });

  it('preserves component position', () => {
    const n = componentToNode(COMPONENT, makeVM());
    expect(n.position).toEqual({ x: 100, y: 200 });
  });

  it('falls back to { x:0, y:0 } when no position', () => {
    const c: Component = { ...COMPONENT, position: undefined };
    const n = componentToNode(c, makeVM());
    expect(n.position).toEqual({ x: 0, y: 0 });
  });

  it('attaches viewModel to node data', () => {
    const vm = makeVM({ health: HealthState.Warning });
    const n = componentToNode(COMPONENT, vm);
    expect(n.data.viewModel.health).toBe(HealthState.Warning);
  });

  it('node data contains name and typeId', () => {
    const n = componentToNode(COMPONENT, makeVM());
    expect(n.data.name).toBe('Main Tank');
    expect(n.data.typeId).toBe('storage_tank');
  });
});

// ---------------------------------------------------------------------------
// connectionToEdge
// ---------------------------------------------------------------------------

describe('connectionToEdge', () => {
  it('maps connection id to edge id', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM());
    expect(e.id).toBe('cn_1');
  });

  it('uses fromComponentId as source', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM());
    expect(e.source).toBe('cmp_1');
  });

  it('uses toComponentId as target', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM());
    expect(e.target).toBe('cmp_2');
  });

  it('sets edge type to flowEdge', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM());
    expect(e.type).toBe('flowEdge');
  });

  it('animated === true when flow === Flowing', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM({ flow: FlowState.Flowing }));
    expect(e.animated).toBe(true);
    expect(e.data?.animated).toBe(true);
  });

  it('animated === false when flow === NoFlow', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM({ flow: FlowState.NoFlow }));
    expect(e.animated).toBe(false);
    expect(e.data?.animated).toBe(false);
  });

  it('animated === false when flow === Unknown', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM({ flow: FlowState.Unknown }));
    expect(e.animated).toBe(false);
  });

  it('attaches viewModel to edge data', () => {
    const vm = makeConnectionVM({ flow: FlowState.Reverse });
    const e = connectionToEdge(CONNECTION, vm);
    expect(e.data?.viewModel.flow).toBe(FlowState.Reverse);
  });

  it('sourceHandle / targetHandle match port ids', () => {
    const e = connectionToEdge(CONNECTION, makeConnectionVM());
    expect(e.sourceHandle).toBe('hot_out');
    expect(e.targetHandle).toBe('hot_in');
  });
});

// ---------------------------------------------------------------------------
// buildFlowGraph
// ---------------------------------------------------------------------------

describe('buildFlowGraph', () => {
  const c2: Component = { ...COMPONENT, id: 'cmp_2', type: 'mixing_valve', name: 'TMV' };
  const components = [COMPONENT, c2];
  const connections = [CONNECTION];
  const vm1 = makeVM({ componentId: 'cmp_1' });
  const vm2 = makeVM({ componentId: 'cmp_2' });
  const cVMs = { cmp_1: vm1, cmp_2: vm2 };
  const cnVMs = { cn_1: makeConnectionVM() };

  it('produces one node per component that has a VM', () => {
    const { nodes } = buildFlowGraph(components, connections, cVMs, cnVMs);
    expect(nodes).toHaveLength(2);
  });

  it('produces one edge per connection that has a VM', () => {
    const { edges } = buildFlowGraph(components, connections, cVMs, cnVMs);
    expect(edges).toHaveLength(1);
  });

  it('excludes components with no ViewModel', () => {
    const { nodes } = buildFlowGraph(components, connections, { cmp_1: vm1 }, cnVMs);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.id).toBe('cmp_1');
  });

  it('excludes connections with no ViewModel', () => {
    const { edges } = buildFlowGraph(components, connections, cVMs, {});
    expect(edges).toHaveLength(0);
  });

  it('hasActiveAlarm is false when both endpoints have no alarms', () => {
    const { edges } = buildFlowGraph(components, connections, cVMs, cnVMs);
    expect(edges[0]!.data?.hasActiveAlarm).toBe(false);
  });

  it('hasActiveAlarm is true when source component has active alarms', () => {
    const vmWithAlarm = makeVM({ componentId: 'cmp_1', activeAlarms: [{ id: 'a1', ruleId: 'r1', componentId: 'cmp_1', state: 'active' as any, raisedAt: '2024-01-01T00:00:00Z' }] });
    const { edges } = buildFlowGraph(components, connections, { cmp_1: vmWithAlarm, cmp_2: vm2 }, cnVMs);
    expect(edges[0]!.data?.hasActiveAlarm).toBe(true);
  });

  it('hasActiveAlarm is true when target component has active alarms', () => {
    const vmWithAlarm = makeVM({ componentId: 'cmp_2', activeAlarms: [{ id: 'a2', ruleId: 'r1', componentId: 'cmp_2', state: 'active' as any, raisedAt: '2024-01-01T00:00:00Z' }] });
    const { edges } = buildFlowGraph(components, connections, { cmp_1: vm1, cmp_2: vmWithAlarm }, cnVMs);
    expect(edges[0]!.data?.hasActiveAlarm).toBe(true);
  });

  it('hasActiveAlarm is false when endpoint components are missing from componentVMs', () => {
    const { edges } = buildFlowGraph([], connections, {}, cnVMs);
    expect(edges[0]!.data?.hasActiveAlarm).toBe(false);
  });
});
