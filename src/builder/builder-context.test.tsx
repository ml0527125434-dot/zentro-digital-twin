/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, renderHook, act } from '@testing-library/react';

import { BuilderProvider, type BuilderProviderProps } from './BuilderContext.js';
import {
  useBuilder,
  useBuilderMode,
  useSelectedComponent,
  useSelectedConnection,
} from './useBuilder.js';
import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const PID  = 'proj_builder';
const USER = 'test_user';

function makeStores(): EngineStores {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  return r;
}

interface TestHarnessOptions {
  stores?:    EngineStores;
  registry?:  ReturnType<typeof makeRegistry>;
}

function makeWrapper(opts: TestHarnessOptions = {}) {
  const stores   = opts.stores   ?? makeStores();
  const registry = opts.registry ?? makeRegistry();
  createProject({ id: PID, name: 'Builder Test', siteType: 'test' }, USER, stores);

  const props: BuilderProviderProps = { projectId: PID, stores, registry, createdBy: USER };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <BuilderProvider {...props}>{children}</BuilderProvider>;
  }

  return { Wrapper, stores, registry };
}

// ---------------------------------------------------------------------------
// Provider / useBuilder wiring
// ---------------------------------------------------------------------------

describe('BuilderProvider / useBuilder', () => {
  it('throws when useBuilder is called outside a provider', () => {
    expect(() => renderHook(() => useBuilder())).toThrow(/BuilderProvider/);
  });

  it('renders children without error', () => {
    const { Wrapper } = makeWrapper();
    const { container } = render(<Wrapper><div data-testid="child" /></Wrapper>);
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('initial state.mode is idle', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    expect(result.current.state.mode).toBe('idle');
  });

  it('state.projectId matches the prop', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    expect(result.current.state.projectId).toBe(PID);
  });
});

// ---------------------------------------------------------------------------
// FSM dispatch (pure — no Graph writes)
// ---------------------------------------------------------------------------

describe('FSM dispatch', () => {
  it('START_PLACING → mode placing', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    act(() => result.current.dispatchFsm({ type: 'START_PLACING', typeId: 'storage_tank' }));
    expect(result.current.state.mode).toBe('placing');
    expect(result.current.state.pendingTypeId).toBe('storage_tank');
  });

  it('CANCEL_PLACING → mode idle', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    act(() => result.current.dispatchFsm({ type: 'START_PLACING', typeId: 'heat_pump' }));
    act(() => result.current.dispatchFsm({ type: 'CANCEL_PLACING' }));
    expect(result.current.state.mode).toBe('idle');
  });

  it('START_CONNECTING → mode connecting with pendingFromPort', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    act(() => result.current.dispatchFsm({ type: 'START_CONNECTING', componentId: 'cmp_1', portId: 'hot_out' }));
    expect(result.current.state.mode).toBe('connecting');
    expect(result.current.state.pendingFromPort).toEqual({ componentId: 'cmp_1', portId: 'hot_out' });
  });

  it('SELECT_COMPONENT → selectedComponentId is set', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    act(() => result.current.dispatchFsm({ type: 'SELECT_COMPONENT', componentId: 'cmp_xyz' }));
    expect(result.current.state.selectedComponentId).toBe('cmp_xyz');
    expect(result.current.state.mode).toBe('selected-component');
  });

  it('SELECT_CONNECTION → selectedConnectionId is set', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    act(() => result.current.dispatchFsm({ type: 'SELECT_CONNECTION', connectionId: 'cn_abc' }));
    expect(result.current.state.selectedConnectionId).toBe('cn_abc');
    expect(result.current.state.mode).toBe('selected-connection');
  });

  it('CLEAR_SELECTION → mode idle, ids cleared', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    act(() => result.current.dispatchFsm({ type: 'SELECT_COMPONENT', componentId: 'cmp_1' }));
    act(() => result.current.dispatchFsm({ type: 'CLEAR_SELECTION' }));
    expect(result.current.state.mode).toBe('idle');
    expect(result.current.state.selectedComponentId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Graph mutation functions
// ---------------------------------------------------------------------------

describe('placeComponent', () => {
  it('places a component and it appears in getComponents()', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let comp: ReturnType<typeof result.current.placeComponent>;
    act(() => { comp = result.current.placeComponent('storage_tank', 'Tank A', { x: 100, y: 200 }); });
    const components = result.current.getComponents();
    expect(components.some(c => c.id === comp!.id)).toBe(true);
  });

  it('returned component has correct type and name', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let comp: ReturnType<typeof result.current.placeComponent>;
    act(() => { comp = result.current.placeComponent('heat_pump', 'HP-1', { x: 0, y: 0 }); });
    expect(comp!.type).toBe('heat_pump');
    expect(comp!.name).toBe('HP-1');
  });

  it('throws for an unregistered typeId', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    expect(() => result.current.placeComponent('unknown_type', 'X', { x: 0, y: 0 })).toThrow();
  });
});

describe('moveComponent + renameComponent', () => {
  it('moveComponent updates position', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let comp: ReturnType<typeof result.current.placeComponent>;
    act(() => { comp = result.current.placeComponent('storage_tank', 'Tank', { x: 0, y: 0 }); });
    act(() => { result.current.moveComponent(comp!.id, { x: 300, y: 400 }); });
    const stored = result.current.getComponents().find(c => c.id === comp!.id);
    expect(stored?.position).toEqual({ x: 300, y: 400 });
  });

  it('renameComponent updates name', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let comp: ReturnType<typeof result.current.placeComponent>;
    act(() => { comp = result.current.placeComponent('mixing_valve', 'Old', { x: 0, y: 0 }); });
    act(() => { result.current.renameComponent(comp!.id, 'New'); });
    const stored = result.current.getComponents().find(c => c.id === comp!.id);
    expect(stored?.name).toBe('New');
  });
});

describe('deleteComponent', () => {
  it('removes the component from getComponents()', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let comp: ReturnType<typeof result.current.placeComponent>;
    act(() => { comp = result.current.placeComponent('mixing_valve', 'TMV', { x: 0, y: 0 }); });
    act(() => { result.current.deleteComponent(comp!.id); });
    expect(result.current.getComponents().some(c => c.id === comp!.id)).toBe(false);
  });
});

describe('connectPorts + disconnectPorts', () => {
  it('creates a connection visible via getConnections()', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let tank: ReturnType<typeof result.current.placeComponent>;
    let valve: ReturnType<typeof result.current.placeComponent>;
    let cn: ReturnType<typeof result.current.connectPorts>;
    act(() => { tank  = result.current.placeComponent('storage_tank', 'T', { x: 0, y: 0 }); });
    act(() => { valve = result.current.placeComponent('mixing_valve', 'V', { x: 200, y: 0 }); });
    act(() => {
      cn = result.current.connectPorts(
        { componentId: tank!.id,  portId: 'hot_out' },
        { componentId: valve!.id, portId: 'hot_in' },
        'hot_water', 'forward',
      );
    });
    expect(result.current.getConnections().some(c => c.id === cn!.id)).toBe(true);
  });

  it('disconnectPorts removes the connection', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });
    let tank:  ReturnType<typeof result.current.placeComponent>;
    let valve: ReturnType<typeof result.current.placeComponent>;
    let cn:    ReturnType<typeof result.current.connectPorts>;
    act(() => { tank  = result.current.placeComponent('storage_tank', 'T', { x: 0, y: 0 }); });
    act(() => { valve = result.current.placeComponent('mixing_valve', 'V', { x: 200, y: 0 }); });
    act(() => {
      cn = result.current.connectPorts(
        { componentId: tank!.id,  portId: 'hot_out' },
        { componentId: valve!.id, portId: 'hot_in' },
        'hot_water', 'forward',
      );
    });
    act(() => { result.current.disconnectPorts(cn!.id); });
    expect(result.current.getConnections().some(c => c.id === cn!.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Derived hooks
// ---------------------------------------------------------------------------

describe('useBuilderMode', () => {
  it('returns current mode', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBuilderMode(), { wrapper: Wrapper });
    expect(result.current).toBe('idle');
  });
});

describe('useSelectedComponent', () => {
  it('returns undefined when no component is selected', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelectedComponent(), { wrapper: Wrapper });
    expect(result.current).toBeUndefined();
  });

  it('returns the component when one is selected', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({ builder: useBuilder(), selected: useSelectedComponent() }),
      { wrapper: Wrapper },
    );

    let comp: ReturnType<typeof result.current.builder.placeComponent>;
    act(() => { comp = result.current.builder.placeComponent('storage_tank', 'Tank', { x: 0, y: 0 }); });
    act(() => result.current.builder.dispatchFsm({ type: 'SELECT_COMPONENT', componentId: comp!.id }));

    expect(result.current.selected?.id).toBe(comp!.id);
  });
});

describe('useSelectedConnection', () => {
  it('returns undefined when no connection is selected', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelectedConnection(), { wrapper: Wrapper });
    expect(result.current).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Architecture invariant
// ---------------------------------------------------------------------------

describe('Architecture invariants', () => {
  it('mutation functions do not directly call stores.graph.setComponent — they go through builder-actions', () => {
    // This is verified structurally: BuilderContext.tsx only imports from builder-actions,
    // never calls stores.graph.setComponent / setConnection directly.
    // We verify the observable result: placeComponent produces an event (only engine writes events).
    const stores   = makeStores();
    const registry = makeRegistry();
    createProject({ id: PID, name: 'T', siteType: 'test' }, USER, stores);

    const props: BuilderProviderProps = { projectId: PID, stores, registry, createdBy: USER };
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <BuilderProvider {...props}>{children}</BuilderProvider>
    );

    const { result } = renderHook(() => useBuilder(), { wrapper: Wrapper });

    const eventsBefore = stores.events.query(PID).length;
    act(() => { result.current.placeComponent('storage_tank', 'Tank', { x: 0, y: 0 }); });
    const eventsAfter = stores.events.query(PID).length;

    // Engine writes a component_added event — direct setComponent would not
    expect(eventsAfter).toBeGreaterThan(eventsBefore);
    const latest = stores.events.query(PID).at(-1);
    expect(latest?.kind).toBe('component_added');
  });
});
