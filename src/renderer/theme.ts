/**
 * Zentro Digital Twin — Renderer Theme
 *
 * Pure presentation mapping: status enums → CSS variable names, icons, label keys.
 * NO hex values. NO colour derivation. Renderer reads CSS variables only.
 * All colours are resolved at paint time by the CSS layer.
 *
 * `label` is a TranslationKey — pass it to `t(pres.label)` for the display string.
 */

import { HealthState, NodeStatus, SensorState } from '../domain/types.js';
import type { TranslationKey } from '../i18n/types.js';

export interface StatusPresentation {
  /** CSS variable name — e.g. "--status-healthy". Caller wraps: `var(--status-healthy)` */
  cssVar: string;
  /** Unicode / icon identifier for the status */
  icon:   string;
  /** Translation key — pass to t(pres.label) to get the localised display string */
  label:  TranslationKey;
}

// ---------------------------------------------------------------------------
// HealthState → presentation
// ---------------------------------------------------------------------------

const HEALTH_MAP: Readonly<Record<HealthState, StatusPresentation>> = {
  [HealthState.Healthy]:       { cssVar: '--status-healthy',       icon: '✓',  label: 'health.healthy'       },
  [HealthState.Warning]:       { cssVar: '--status-warning',       icon: '⚠',  label: 'health.warning'       },
  [HealthState.Critical]:      { cssVar: '--status-critical',      icon: '✖',  label: 'health.critical'      },
  [HealthState.Offline]:       { cssVar: '--status-offline',       icon: '○',  label: 'health.offline'       },
  [HealthState.Maintenance]:   { cssVar: '--status-maintenance',   icon: '🔧', label: 'health.maintenance'   },
  [HealthState.Commissioning]: { cssVar: '--status-commissioning', icon: '⚙',  label: 'health.commissioning' },
};

// ---------------------------------------------------------------------------
// NodeStatus → presentation
// ---------------------------------------------------------------------------

const NODE_STATUS_MAP: Readonly<Record<NodeStatus, StatusPresentation>> = {
  [NodeStatus.Ok]:      { cssVar: '--node-ok',      icon: '●', label: 'status.ok'      },
  [NodeStatus.Cold]:    { cssVar: '--node-cold',     icon: '❄', label: 'status.cold'    },
  [NodeStatus.Warn]:    { cssVar: '--node-warn',     icon: '⚠', label: 'status.warn'    },
  [NodeStatus.Risk]:    { cssVar: '--node-risk',     icon: '⚠', label: 'status.risk'    },
  [NodeStatus.Scald]:   { cssVar: '--node-scald',    icon: '🔥', label: 'status.scald'  },
  [NodeStatus.Fault]:   { cssVar: '--node-fault',    icon: '✖', label: 'status.fault'   },
  [NodeStatus.Unknown]: { cssVar: '--node-unknown',  icon: '?', label: 'status.unknown' },
};

// ---------------------------------------------------------------------------
// SensorState → presentation
// ---------------------------------------------------------------------------

const SENSOR_STATE_MAP: Readonly<Record<SensorState, StatusPresentation>> = {
  [SensorState.Live]:    { cssVar: '--sensor-live',    icon: '●', label: 'sensor.live'    },
  [SensorState.Stale]:   { cssVar: '--sensor-stale',   icon: '◌', label: 'sensor.stale'   },
  [SensorState.Lost]:    { cssVar: '--sensor-lost',    icon: '✖', label: 'sensor.lost'    },
  [SensorState.Unknown]: { cssVar: '--sensor-unknown', icon: '?', label: 'sensor.unknown' },
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
