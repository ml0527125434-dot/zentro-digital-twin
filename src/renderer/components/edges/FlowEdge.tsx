/**
 * Zentro Digital Twin — Flow Edge
 *
 * Reads ONLY: connViewModel.flow and connViewModel.sensorState.
 * Does NOT derive flow from medium, telemetry, bindings, or any other source.
 */

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ConnectionEdgeData } from '../../flow-transformers.js';
import { sensorStatePresentation, nodeStatusPresentation } from '../../theme.js';
import { FlowState } from '../../../domain/types.js';

export function FlowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<ConnectionEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const flow        = data?.viewModel.flow        ?? FlowState.Unknown;
  const sensorState = data?.viewModel.sensorState;
  const value       = data?.viewModel.value       ?? null;
  const status      = data?.viewModel.status;

  const sensorPres = sensorState ? sensorStatePresentation(sensorState) : null;
  const statusPres = status      ? nodeStatusPresentation(status)        : null;

  const strokeVar = flow === FlowState.Flowing
    ? 'var(--edge-flowing)'
    : flow === FlowState.Reverse
      ? 'var(--edge-reverse)'
      : 'var(--edge-default)';

  const hasLabel = value !== null || sensorPres !== null;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: strokeVar, strokeWidth: 2 }}
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
                {typeof value === 'number' ? value.toFixed(1) : String(value)}°C
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
