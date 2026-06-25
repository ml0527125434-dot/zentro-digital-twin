import { describe, it, expect } from 'vitest';
import {
  createInitialBuilderState,
  startPlacing, cancelPlacing,
  startConnecting, cancelConnecting,
  selectComponent, selectConnection,
  clearSelection,
} from './builder-state.js';

const PID = 'proj_1';

describe('createInitialBuilderState', () => {
  it('starts in idle mode', () => {
    expect(createInitialBuilderState(PID).mode).toBe('idle');
  });

  it('captures the projectId', () => {
    expect(createInitialBuilderState(PID).projectId).toBe(PID);
  });

  it('has no pending or selected ids', () => {
    const s = createInitialBuilderState(PID);
    expect(s.pendingTypeId).toBeUndefined();
    expect(s.pendingFromPort).toBeUndefined();
    expect(s.selectedComponentId).toBeUndefined();
    expect(s.selectedConnectionId).toBeUndefined();
  });
});

describe('startPlacing / cancelPlacing', () => {
  it('startPlacing → mode placing with typeId', () => {
    const s = startPlacing(createInitialBuilderState(PID), 'storage_tank');
    expect(s.mode).toBe('placing');
    expect(s.pendingTypeId).toBe('storage_tank');
  });

  it('cancelPlacing → idle, clears typeId', () => {
    const placing = startPlacing(createInitialBuilderState(PID), 'heat_pump');
    const s = cancelPlacing(placing);
    expect(s.mode).toBe('idle');
    expect(s.pendingTypeId).toBeUndefined();
  });

  it('does not mutate input state', () => {
    const original = createInitialBuilderState(PID);
    startPlacing(original, 'mixing_valve');
    expect(original.mode).toBe('idle');
  });
});

describe('startConnecting / cancelConnecting', () => {
  it('startConnecting → mode connecting with pendingFromPort', () => {
    const s = startConnecting(createInitialBuilderState(PID), 'cmp_1', 'hot_out');
    expect(s.mode).toBe('connecting');
    expect(s.pendingFromPort).toEqual({ componentId: 'cmp_1', portId: 'hot_out' });
  });

  it('cancelConnecting → idle, clears pendingFromPort', () => {
    const connecting = startConnecting(createInitialBuilderState(PID), 'cmp_1', 'hot_out');
    const s = cancelConnecting(connecting);
    expect(s.mode).toBe('idle');
    expect(s.pendingFromPort).toBeUndefined();
  });
});

describe('selectComponent / selectConnection / clearSelection', () => {
  it('selectComponent → selected-component mode', () => {
    const s = selectComponent(createInitialBuilderState(PID), 'cmp_tank');
    expect(s.mode).toBe('selected-component');
    expect(s.selectedComponentId).toBe('cmp_tank');
  });

  it('selectConnection → selected-connection mode', () => {
    const s = selectConnection(createInitialBuilderState(PID), 'cn_supply');
    expect(s.mode).toBe('selected-connection');
    expect(s.selectedConnectionId).toBe('cn_supply');
  });

  it('clearSelection from selected-component → idle', () => {
    const selected = selectComponent(createInitialBuilderState(PID), 'cmp_tank');
    const s = clearSelection(selected);
    expect(s.mode).toBe('idle');
    expect(s.selectedComponentId).toBeUndefined();
  });

  it('selectComponent clears previous connection selection', () => {
    const s = selectComponent(
      selectConnection(createInitialBuilderState(PID), 'cn_supply'),
      'cmp_tank',
    );
    expect(s.selectedConnectionId).toBeUndefined();
    expect(s.selectedComponentId).toBe('cmp_tank');
  });

  it('projectId is preserved across all transitions', () => {
    let s = createInitialBuilderState('proj_xyz');
    s = startPlacing(s, 'heat_pump');
    s = cancelPlacing(s);
    s = startConnecting(s, 'c1', 'p1');
    s = cancelConnecting(s);
    s = selectComponent(s, 'c1');
    s = clearSelection(s);
    expect(s.projectId).toBe('proj_xyz');
  });
});
