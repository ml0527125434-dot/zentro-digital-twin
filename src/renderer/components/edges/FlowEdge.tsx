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
import { sensorStatePresentation } from '../../theme.js';
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

  const sensorPresentation = sensorState
    ? sensorStatePresentation(sensorState)
    : null;

  const strokeVar = flow === FlowState.Flowing
    ? 'var(--edge-flowing)'
    : flow === FlowState.Reverse
      ? 'var(--edge-reverse)'
      : 'var(--edge-default)';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: strokeVar }}
      />
      {sensorPresentation && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:  'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              color: `var(${sensorPresentation.cssVar})`,
              fontSize: 10,
            }}
            className="nodrag nopan"
          >
            {sensorPresentation.icon}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
