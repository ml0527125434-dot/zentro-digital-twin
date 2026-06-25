/**
 * Zentro Digital Twin — Flow Transformers
 *
 * Converts pre-computed ViewModels into React Flow node/edge descriptors.
 * Pure mapping — no status derivation, no health computation, no color logic.
 * Callers must supply fully-resolved ComponentViewModel and ConnectionViewModel.
 */

import type { Node, Edge } from '@xyflow/react';
import type { Component, Connection } from '../domain/types.js';
import type { ComponentViewModel, ConnectionViewModel } from '../domain/types.js';
import { FlowState } from '../domain/types.js';

// ---------------------------------------------------------------------------
// Node data — passed into custom node renderers as-is
// ---------------------------------------------------------------------------

export interface ComponentNodeData extends Record<string, unknown> {
  componentId:  string;
  name:         string;
  typeId:       string;
  viewModel:    ComponentViewModel;
}

export type ComponentNode = Node<ComponentNodeData>;

// ---------------------------------------------------------------------------
// Edge data — passed into FlowEdge renderer as-is
// ---------------------------------------------------------------------------

export interface ConnectionEdgeData extends Record<string, unknown> {
  connectionId:  string;
  viewModel:     ConnectionViewModel;
  /** Animated when flow === Flowing */
  animated:      boolean;
  /** True when either endpoint component has at least one active alarm */
  hasActiveAlarm: boolean;
}

export type ConnectionEdge = Edge<ConnectionEdgeData>;

// ---------------------------------------------------------------------------
// Transforms
// ---------------------------------------------------------------------------

/**
 * Transforms one Component + its pre-computed ViewModel into a React Flow Node.
 * Position comes from Component.position; falls back to { x: 0, y: 0 }.
 */
export function componentToNode(
  component: Component,
  viewModel: ComponentViewModel,
): ComponentNode {
  return {
    id:       component.id,
    type:     component.type,
    position: component.position ?? { x: 0, y: 0 },
    data: {
      componentId: component.id,
      name:        component.name,
      typeId:      component.type,
      viewModel,
    },
  };
}

/**
 * Transforms one Connection + its pre-computed ViewModel into a React Flow Edge.
 * The edge is animated only when flow === FlowState.Flowing.
 */
export function connectionToEdge(
  connection:    Connection,
  viewModel:     ConnectionViewModel,
  hasActiveAlarm = false,
): ConnectionEdge {
  return {
    id:            connection.id,
    source:        connection.fromComponentId,
    sourceHandle:  connection.fromPortId,
    target:        connection.toComponentId,
    targetHandle:  connection.toPortId,
    type:          'flowEdge',
    animated:      viewModel.flow === FlowState.Flowing,
    data: {
      connectionId:  connection.id,
      viewModel,
      animated:      viewModel.flow === FlowState.Flowing,
      hasActiveAlarm,
    },
  };
}

/**
 * Batch-transforms all components and connections.
 * componentVMs and connectionVMs must be keyed by their respective IDs.
 */
export function buildFlowGraph(
  components:    Component[],
  connections:   Connection[],
  componentVMs:  Record<string, ComponentViewModel>,
  connectionVMs: Record<string, ConnectionViewModel>,
): { nodes: ComponentNode[]; edges: ConnectionEdge[] } {
  const nodes = components
    .filter(c => c.id in componentVMs)
    .map(c => componentToNode(c, componentVMs[c.id]!));

  const edges = connections
    .filter(cn => cn.id in connectionVMs)
    .map(cn => {
      const fromAlarms = componentVMs[cn.fromComponentId]?.activeAlarms ?? [];
      const toAlarms   = componentVMs[cn.toComponentId]?.activeAlarms   ?? [];
      const hasActiveAlarm = fromAlarms.length > 0 || toAlarms.length > 0;
      return connectionToEdge(cn, connectionVMs[cn.id]!, hasActiveAlarm);
    });

  return { nodes, edges };
}
