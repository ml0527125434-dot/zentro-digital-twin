/**
 * Zentro Digital Twin — Renderer Theme
 *
 * Pure presentation mapping: status enums → CSS variable names, icons, labels.
 * NO hex values. NO colour derivation. Renderer reads CSS variables only.
 * All colours are resolved at paint time by the CSS layer.
 */

import { HealthState, NodeStatus, SensorState } from '../domain/types.js';

export interface StatusPresentation {
  /** CSS variable name — e.g. "--status-healthy". Caller wraps: `var(--status-healthy)` */
  cssVar: string;
  /** Unicode / icon identifier for the status */
  icon:   string;
  /** Human-readable label */
  label:  string;
}

// ---------------------------------------------------------------------------
// HealthState → presentation
// ---------------------------------------------------------------------------

const HEALTH_MAP: Readonly<Record<HealthState, StatusPresentation>> = {
  [HealthState.Healthy]:       { cssVar: '--status-healthy',       icon: '✓',  label: 'Healthy'       },
  [HealthState.Warning]:       { cssVar: '--status-warning',       icon: '⚠',  label: 'Warning'       },
  [HealthState.Critical]:      { cssVar: '--status-critical',      icon: '✖',  label: 'Critical'      },
  [HealthState.Offline]:       { cssVar: '--status-offline',       icon: '○',  label: 'Offline'       },
  [HealthState.Maintenance]:   { cssVar: '--status-maintenance',   icon: '🔧', label: 'Maintenance'   },
  [HealthState.Commissioning]: { cssVar: '--status-commissioning', icon: '⚙',  label: 'Commissioning' },
};

// ---------------------------------------------------------------------------
// NodeStatus → presentation
// ---------------------------------------------------------------------------

const NODE_STATUS_MAP: Readonly<Record<NodeStatus, StatusPresentation>> = {
  [NodeStatus.Ok]:      { cssVar: '--node-ok',      icon: '●', label: 'OK'      },
  [NodeStatus.Cold]:    { cssVar: '--node-cold',    icon: '❄', label: 'Cold'    },
  [NodeStatus.Warn]:    { cssVar: '--node-warn',    icon: '⚠', label: 'Warn'    },
  [NodeStatus.Risk]:    { cssVar: '--node-risk',    icon: '⚠', label: 'Risk'    },
  [NodeStatus.Scald]:   { cssVar: '--node-scald',   icon: '🔥', label: 'Scald'  },
  [NodeStatus.Fault]:   { cssVar: '--node-fault',   icon: '✖', label: 'Fault'   },
  [NodeStatus.Unknown]: { cssVar: '--node-unknown', icon: '?', label: 'Unknown' },
};

// ---------------------------------------------------------------------------
// SensorState → presentation
// ---------------------------------------------------------------------------

const SENSOR_STATE_MAP: Readonly<Record<SensorState, StatusPresentation>> = {
  [SensorState.Live]:    { cssVar: '--sensor-live',    icon: '●', label: 'Live'    },
  [SensorState.Stale]:   { cssVar: '--sensor-stale',   icon: '◌', label: 'Stale'   },
  [SensorState.Lost]:    { cssVar: '--sensor-lost',    icon: '✖', label: 'Lost'    },
  [SensorState.Unknown]: { cssVar: '--sensor-unknown', icon: '?', label: 'Unknown' },
};

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function healthPresentation(health: HealthState): StatusPresentation {
  return HEALTH_MAP[health];
}

export function nodeStatusPresentation(status: NodeStatus): StatusPresentation {
  return NODE_STATUS_MAP[status];
}

export function sensorStatePresentation(state: SensorState): StatusPresentation {
  return SENSOR_STATE_MAP[state];
}
