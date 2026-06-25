/**
 * Zentro Digital Twin — Builder State (Stage 5A)
 *
 * Pure FSM for CONFIG-only builder interactions.
 * No TELEMETRY. No COMMAND. No side effects.
 * All functions return a new BuilderState — never mutate.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BuilderMode =
  | 'idle'
  | 'placing'            // a typeId has been picked from the palette; cursor carries it
  | 'connecting'         // source port selected; waiting for target port
  | 'selected-component'
  | 'selected-connection';

export interface PendingFromPort {
  componentId: string;
  portId:      string;
}

export interface BuilderState {
  readonly projectId:             string;
  readonly mode:                  BuilderMode;
  readonly pendingTypeId?:        string;          // set during 'placing'
  readonly pendingFromPort?:      PendingFromPort; // set during 'connecting'
  readonly selectedComponentId?:  string;
  readonly selectedConnectionId?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInitialBuilderState(projectId: string): BuilderState {
  return { projectId, mode: 'idle' };
}

// ---------------------------------------------------------------------------
// Pure transitions — each returns a new BuilderState
// ---------------------------------------------------------------------------

/** Pick a component type from the palette to place on the canvas. */
export function startPlacing(state: BuilderState, typeId: string): BuilderState {
  return {
    projectId:       state.projectId,
    mode:            'placing',
    pendingTypeId:   typeId,
  };
}

/** Abort a pending placement without placing anything. */
export function cancelPlacing(state: BuilderState): BuilderState {
  return { projectId: state.projectId, mode: 'idle' };
}

/** Begin drawing a connection from a source port. */
export function startConnecting(
  state:       BuilderState,
  componentId: string,
  portId:      string,
): BuilderState {
  return {
    projectId:        state.projectId,
    mode:             'connecting',
    pendingFromPort:  { componentId, portId },
  };
}

/** Abort a pending connection without creating it. */
export function cancelConnecting(state: BuilderState): BuilderState {
  return { projectId: state.projectId, mode: 'idle' };
}

/** Select a component (e.g. to show property panel). */
export function selectComponent(
  state:       BuilderState,
  componentId: string,
): BuilderState {
  return {
    projectId:            state.projectId,
    mode:                 'selected-component',
    selectedComponentId:  componentId,
  };
}

/** Select a connection (e.g. to show edge properties). */
export function selectConnection(
  state:        BuilderState,
  connectionId: string,
): BuilderState {
  return {
    projectId:             state.projectId,
    mode:                  'selected-connection',
    selectedConnectionId:  connectionId,
  };
}

/** Clear any selection and return to idle. */
export function clearSelection(state: BuilderState): BuilderState {
  return { projectId: state.projectId, mode: 'idle' };
}
