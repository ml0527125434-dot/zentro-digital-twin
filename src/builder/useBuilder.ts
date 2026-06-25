/**
 * Zentro Digital Twin — useBuilder hook (Stage 5B)
 *
 * Primary consumer hook for BuilderContext.
 * Derived convenience hooks read from context without adding new state.
 */

import { useBuilderContext, type BuilderContextValue } from './BuilderContext.js';
import type { Component, Connection } from '../domain/types.js';
import type { BuilderMode } from './builder-state.js';

/** Full context — use when you need both state and mutation functions. */
export function useBuilder(): BuilderContextValue {
  return useBuilderContext();
}

/** Current FSM mode only. */
export function useBuilderMode(): BuilderMode {
  return useBuilderContext().state.mode;
}

/**
 * The selected component object, or undefined.
 * Reads from GraphStore on each render — always reflects latest graph state.
 */
export function useSelectedComponent(): Component | undefined {
  const { state, getComponents } = useBuilderContext();
  if (!state.selectedComponentId) return undefined;
  return getComponents().find(c => c.id === state.selectedComponentId);
}

/**
 * The selected connection object, or undefined.
 * Reads from GraphStore on each render — always reflects latest graph state.
 */
export function useSelectedConnection(): Connection | undefined {
  const { state, getConnections } = useBuilderContext();
  if (!state.selectedConnectionId) return undefined;
  return getConnections().find(c => c.id === state.selectedConnectionId);
}
