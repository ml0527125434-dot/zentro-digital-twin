/** @vitest-environment happy-dom */
/**
 * End-to-end integration: undo/redo through the composed app + keyboard.
 * Drives ZentroApp in Build mode, mutates the CONFIG graph through the engine
 * (as the Builder would), forces the render that records history, then exercises
 * the real Ctrl+Z / Ctrl+Y keyboard path and asserts the GraphStore state.
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

import {
  createInMemoryGraphStore, createProject, addComponent, type EngineStores,
} from '../../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../../domain/project-version.js';
import { createInMemoryEventStore } from '../../domain/event-store.js';
import { createInMemoryLiveStore } from '../../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../../alarm/alarm-store.js';
import { createComponentRegistry } from '../../lib/component-registry.js';
import { registerBaseLibrary } from '../../lib/component-library.js';
import { ZentroApp } from '../ZentroApp.js';

const PID = 'proj_undo';

function makeStores(): EngineStores {
  return {
    graph: createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events: createInMemoryEventStore(),
  };
}

function renderEmptyBuilder() {
  const stores = makeStores();
  createProject({ id: PID, name: 'QA', siteType: 'residential' }, 'test', stores);
  const registry = createComponentRegistry();
  registerBaseLibrary(registry);
  render(
    <ZentroApp
      projectId={PID}
      stores={stores}
      registry={registry}
      liveStore={createInMemoryLiveStore()}
      profileStore={createInMemoryOperationalProfileStore()}
      alarmStore={createInMemoryAlarmStore()}
    />,
  );
  // Enter build mode → attaches the build-mode keyboard handler + history baseline.
  act(() => { fireEvent.click(screen.getByTestId('mode-build-btn')); });
  return { stores, registry };
}

function forceRefresh() {
  // ZentroApp exposes a hidden refresh button that bumps its render clock,
  // which lets the version-tracking effect record a history entry.
  act(() => { fireEvent.click(screen.getByTestId('refresh-btn')); });
}

describe('Builder undo/redo — end to end', () => {
  it('Ctrl+Z removes the last placed component and Ctrl+Y restores it', () => {
    const { stores } = renderEmptyBuilder();
    forceRefresh(); // ensure baseline (empty) is recorded

    act(() => {
      addComponent(PID, { id: 'cmp_a', type: 'storage_tank', name: 'מיכל', position: { x: 80, y: 80 }, bindings: [] }, 'test', stores);
    });
    forceRefresh(); // records post-state S1
    expect(stores.graph.getComponents(PID)).toHaveLength(1);

    act(() => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }); });
    expect(stores.graph.getComponents(PID)).toHaveLength(0); // undone

    act(() => { fireEvent.keyDown(document, { key: 'y', ctrlKey: true }); });
    expect(stores.graph.getComponents(PID)).toHaveLength(1); // redone
    expect(stores.graph.getComponents(PID)[0]!.id).toBe('cmp_a');
  });

  it('undo walks back through multiple placements in order', () => {
    const { stores } = renderEmptyBuilder();
    forceRefresh();

    for (const id of ['c1', 'c2', 'c3']) {
      act(() => {
        addComponent(PID, { id, type: 'storage_tank', name: id, position: { x: 0, y: 0 }, bindings: [] }, 'test', stores);
      });
      forceRefresh();
    }
    expect(stores.graph.getComponents(PID)).toHaveLength(3);

    act(() => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }); });
    expect(stores.graph.getComponents(PID)).toHaveLength(2);
    act(() => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true }); });
    expect(stores.graph.getComponents(PID)).toHaveLength(1);
    // Ctrl+Shift+Z redoes
    act(() => { fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true }); });
    expect(stores.graph.getComponents(PID)).toHaveLength(2);
  });
});
