/**
 * Zentro Digital Twin — Flow Edge (Stage 20)
 *
 * Reads ONLY: connViewModel.flow, connViewModel.sensorState,
 *             connViewModel.value, connViewModel.status,
 *             connectionEdgeData.hasActiveAlarm.
 * Does NOT derive flow from medium, telemetry, bindings, or any other source.
 *
 * Visual priority:
 *   1. Alarm (critical red pulse) — overrides everything
 *   2. Temperature-based NodeStatus color — when value is available
 *   3. FlowState color — green (Flowing), orange (Reverse), dim (Unknown/NoFlow)
 */

import React from 'react';
import {
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ConnectionEdgeData } from '../../flow-transformers.js';
import { sensorStatePresentation, nodeStatusPresentation } from '../../theme.js';
import { FlowState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';

export function FlowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<ConnectionEdgeData>) {
  const { t } = useLocale();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const flow           = data?.viewModel.flow        ?? FlowState.Unknown;
  const sensorState    = data?.viewModel.sensorState;
  const value          = data?.viewModel.value       ?? null;
  const status         = data?.viewModel.status;
  const hasActiveAlarm = data?.hasActiveAlarm        ?? false;

  const sensorPres = sensorState ? sensorStatePresentation(sensorState) : null;
  const statusPres = status      ? nodeStatusPresentation(status)        : null;

  // --- stroke color (priority: alarm > temperature NodeStatus > FlowState) ---
  let strokeColor: string;
  if (hasActiveAlarm) {
    strokeColor = 'var(--edge-alarm)';
  } else if (flow === FlowState.Flowing && value !== null && statusPres) {
    strokeColor = `var(${statusPres.cssVar})`;
  } else if (flow === FlowState.Flowing) {
    strokeColor = 'var(--edge-flowing)';
  } else if (flow === FlowState.Reverse) {
    strokeColor = 'var(--edge-reverse)';
  } else {
    strokeColor = 'var(--edge-default)';
  }

  // --- animation class ---
  let animClass: string;
  if (hasActiveAlarm) {
    animClass = 'zentro-edge-alarm';
  } else if (flow === FlowState.Flowing) {
    animClass = 'zentro-edge-flowing';
  } else if (flow === FlowState.Reverse) {
    animClass = 'zentro-edge-reverse';
  } else {
    animClass = 'zentro-edge-noflow';
  }

  const hasLabel = value !== null || sensorPres !== null;

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`react-flow__edge-path ${animClass}`}
        style={{ stroke: strokeColor, strokeWidth: 2, fill: 'none' }}
        markerEnd={markerEnd}
      />
      {hasLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              background:    'var(--bg-crust)',
              border:        '1px solid var(--border)',
              borderRadius:  4,
              padding:       '1px 4px',
              fontSize:      9,
              display:       'flex',
              gap:           3,
              alignItems:    'center',
            }}
            className="nodrag nopan"
          >
            {value !== null && statusPres && (
              <span style={{ color: `var(${statusPres.cssVar})` }}>
                {typeof value === 'number' ? value.toFixed(1) : String(value)}{t('unit.temperature')}
              </span>
            )}
            {sensorPres && (
              <span style={{ color: `var(${sensorPres.cssVar})` }}>
                {sensorPres.icon}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
