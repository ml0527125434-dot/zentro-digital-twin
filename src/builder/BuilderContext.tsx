/**
 * Zentro Digital Twin — Builder Context (Stage 5B)
 *
 * React integration layer for the Builder Core.
 * React holds BuilderState only (via useReducer, pure FSM transitions).
 * Graph mutations are exposed as explicit functions that delegate to builder-actions.
 * No TELEMETRY. No COMMAND. No persistence.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';

import type { Component, Connection } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';
import type { ComponentRegistry } from '../lib/component-registry.js';

import {
  createInitialBuilderState,
  startPlacing,
  cancelPlacing,
  startConnecting,
  cancelConnecting,
  selectComponent,
  selectConnection,
  clearSelection,
  type BuilderState,
  type BuilderMode,
} from './builder-state.js';

import {
  placeComponent      as corePlace,
  moveComponent       as coreMove,
  renameComponent     as coreRename,
  deleteComponent     as coreDelete,
  deleteComponentWithConnections as coreDeleteCascade,
  duplicateComponent  as coreDuplicate,
  connectPorts        as coreConnect,
  disconnectPorts     as coreDisconnect,
} from './builder-actions.js';

// ---------------------------------------------------------------------------
// FSM action types — handled by the pure reducer only
// ---------------------------------------------------------------------------

type FsmAction =
  | { type: 'START_PLACING';     typeId: string }
  | { type: 'CANCEL_PLACING' }
  | { type: 'START_CONNECTING';  componentId: string; portId: string }
  | { type: 'CANCEL_CONNECTING' }
  | { type: 'SELECT_COMPONENT';  componentId: string }
  | { type: 'SELECT_CONNECTION'; connectionId: string }
  | { type: 'CLEAR_SELECTION' };

function fsmReducer(state: BuilderState, action: FsmAction): BuilderState {
  switch (action.type) {
    case 'START_PLACING':     return startPlacing(state, action.typeId);
    case 'CANCEL_PLACING':    return cancelPlacing(state);
    case 'START_CONNECTING':  return startConnecting(state, action.componentId, action.portId);
    case 'CANCEL_CONNECTING': return cancelConnecting(state);
    case 'SELECT_COMPONENT':  return selectComponent(state, action.componentId);
    case 'SELECT_CONNECTION': return selectConnection(state, action.connectionId);
    case 'CLEAR_SELECTION':   return clearSelection(state);
  }
}

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export interface BuilderContextValue {
  // ── FSM state (read-only) ─────────────────────────────────────────────────
  state: BuilderState;

  // ── FSM transitions (pure, no Graph writes) ───────────────────────────────
  dispatchFsm: (action: FsmAction) => void;

  // ── Graph reads ───────────────────────────────────────────────────────────
  getComponents:  () => Component[];
  getConnections: () => Connection[];

  // ── Graph mutations (delegate to builder-actions → Graph Engine) ──────────
  placeComponent:     (typeId: string, name: string, position: { x: number; y: number }) => Component;
  moveComponent:      (componentId: string, position: { x: number; y: number }) => Component;
  renameComponent:    (componentId: string, name: string) => Component;
  deleteComponent:    (componentId: string) => void;
  deleteComponentCascade: (componentId: string) => void;
  duplicateComponent: (componentId: string) => Component;
  connectPorts:       (
    from:      { componentId: string; portId: string },
    to:        { componentId: string; portId: string },
    medium:    Connection['medium'],
    direction: Connection['topologicalDirection'],
  ) => Connection;
  disconnectPorts: (connectionId: string) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BuilderContext = createContext<BuilderContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface BuilderProviderProps {
  projectId:  string;
  stores:     EngineStores;
  registry:   ComponentRegistry;
  createdBy:  string;
  children:   ReactNode;
}

export function BuilderProvider({
  projectId,
  stores,
  registry,
  createdBy,
  children,
}: BuilderProviderProps) {
  const [state, dispatchFsm] = useReducer(
    fsmReducer,
    projectId,
    createInitialBuilderState,
  );

  // Graph reads — stable references; GraphStore is the source of truth
  const getComponents  = useCallback(() => stores.graph.getComponents(projectId),  [stores, projectId]);
  const getConnections = useCallback(() => stores.graph.getConnections(projectId), [stores, projectId]);

  // Graph mutations — each delegates to builder-actions, no direct GraphStore access
  const placeComponent = useCallback(
    (typeId: string, name: string, position: { x: number; y: number }) =>
      corePlace(projectId, typeId, name, position, stores, registry, createdBy).data,
    [projectId, stores, registry, createdBy],
  );

  const moveComponent = useCallback(
    (componentId: string, position: { x: number; y: number }) =>
      coreMove(projectId, componentId, position, stores, createdBy).data,
    [projectId, stores, createdBy],
  );

  const renameComponent = useCallback(
    (componentId: string, name: string) =>
      coreRename(projectId, componentId, name, stores, createdBy).data,
    [projectId, stores, createdBy],
  );

  const deleteComponent = useCallback(
    (componentId: string) => { coreDelete(projectId, componentId, stores, createdBy); },
    [projectId, stores, createdBy],
  );

  const deleteComponentCascade = useCallback(
    (componentId: string) => { coreDeleteCascade(projectId, componentId, stores, createdBy); },
    [projectId, stores, createdBy],
  );

  const duplicateComponent = useCallback(
    (componentId: string) =>
      coreDuplicate(projectId, componentId, stores, registry, createdBy).data,
    [projectId, stores, registry, createdBy],
  );

  const connectPorts = useCallback(
    (
      from:      { componentId: string; portId: string },
      to:        { componentId: string; portId: string },
      medium:    Connection['medium'],
      direction: Connection['topologicalDirection'],
    ) => coreConnect(projectId, from, to, medium, direction, stores, registry, createdBy).data,
    [projectId, stores, registry, createdBy],
  );

  const disconnectPorts = useCallback(
    (connectionId: string) => { coreDisconnect(projectId, connectionId, stores, createdBy); },
    [projectId, stores, createdBy],
  );

  const value: BuilderContextValue = {
    state,
    dispatchFsm,
    getComponents,
    getConnections,
    placeComponent,
    moveComponent,
    renameComponent,
    deleteComponent,
    deleteComponentCascade,
    duplicateComponent,
    connectPorts,
    disconnectPorts,
  };

  return (
    <BuilderContext.Provider value={value}>
      {children}
    </BuilderContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Internal accessor — used by useBuilder and derived hooks
// ---------------------------------------------------------------------------

export function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error(
      'useBuilder must be called inside a <BuilderProvider>.',
    );
  }
  return ctx;
}

// Re-export FSM action type for consumers
export type { FsmAction, BuilderMode };
