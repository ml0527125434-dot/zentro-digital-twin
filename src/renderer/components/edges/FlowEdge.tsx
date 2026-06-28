/**
 * Zentro Digital Twin — Flow Edge
 *
 * Visual priority:
 *   1. Alarm (critical red pulse) — overrides everything
 *   2. Temperature-based NodeStatus color — when value is available
 *   3. FlowState color — green (Flowing), orange (Reverse), dim (Unknown/NoFlow)
 *
 * Stage 32A additions:
 *   - Animated flow-direction arrow dot travelling along the pipe
 *   - Pipe thickness scales with flow magnitude when available
 *   - Temperature gradient: single color tinted to status when value present
 */

import React, { useId } from 'react';
import {
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ConnectionEdge, ConnectionEdgeData } from '../../flow-transformers.js';
import { sensorStatePresentation, nodeStatusPresentation } from '../../theme.js';
import { FlowState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';

// Medium → static pipe color for inactive/unknown flow state
function mediumColor(medium?: string): string {
  switch (medium) {
    case 'cold_water': return 'var(--pipe-cold)';
    case 'recirc':     return 'var(--pipe-recirc)';
    case 'gas':        return 'var(--pipe-gas)';
    case 'electric':   return 'var(--pipe-electric)';
    case 'air':        return 'var(--pipe-air)';
    case 'hot_water':  return 'var(--pipe-hot)';
    default:           return 'var(--edge-default)';
  }
}

export function FlowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<ConnectionEdge>) {
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
  const medium         = data?.medium;

  const sensorPres = sensorState ? sensorStatePresentation(sensorState) : null;
  const statusPres = status      ? nodeStatusPresentation(status)        : null;

  // Stroke color: alarm > temperature status > flow state > medium identity
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
    strokeColor = mediumColor(medium);
  }

  // Animation class
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

  // Show label only when we have a temperature value
  const showLabel = value !== null && statusPres !== null;

  // Pipe stroke width — scale slightly with flow magnitude when available
  const flowMagnitude = typeof (data?.viewModel.value) === 'number' ? data!.viewModel.value : null;
  const baseWidth = hasActiveAlarm ? 4 : flow === FlowState.Flowing ? 3.5 : 2.5;
  // For flowing pipes with a flow rate sensor, scale up to 5px at high flow
  const strokeWidth = (flow === FlowState.Flowing && flowMagnitude !== null && flowMagnitude > 0)
    ? Math.min(5, baseWidth + flowMagnitude * 0.15)
    : baseWidth;

  // Direction arrow travel duration: faster when actively flowing
  const arrowDuration = flow === FlowState.Flowing ? '1.8s' : '2.8s';
  const showArrow = flow === FlowState.Flowing || flow === FlowState.Reverse;
  // Reverse flow: arrow travels target→source (keyTimes reversed)
  const arrowReverse = flow === FlowState.Reverse;

  return (
    <>
      {/* Glow layer — rendered behind main pipe */}
      {(flow === FlowState.Flowing || hasActiveAlarm) && (
        <path
          d={edgePath}
          style={{
            stroke:        strokeColor,
            strokeWidth:   strokeWidth + 6,
            fill:          'none',
            opacity:       0.12,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main pipe */}
      <path
        id={id}
        d={edgePath}
        className={`react-flow__edge-path ${animClass}`}
        style={{ stroke: strokeColor, strokeWidth, fill: 'none' }}
        markerEnd={markerEnd}
      />

      {/* Animated flow-direction arrow dot */}
      {showArrow && (
        <g pointerEvents="none" aria-hidden="true">
          {/* Arrow triangle pointing in flow direction */}
          <polygon
            points="-5,0 4,-3.5 4,3.5"
            fill={strokeColor}
            opacity={0.85}
            style={{ filter: `drop-shadow(0 0 3px ${strokeColor})` }}
          >
            <animateMotion
              dur={arrowDuration}
              repeatCount="indefinite"
              rotate="auto"
              keyTimes={arrowReverse ? '0;1' : '0;1'}
              keyPoints={arrowReverse ? '1;0' : '0;1'}
              calcMode="linear"
            >
              <mpath href={`#${id}`} />
            </animateMotion>
          </polygon>
        </g>
      )}

      {/* Wide invisible hit area — matches React Flow BaseEdge pattern for reliable clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="nodrag nopan zentro-edge-label"
          >
            <span style={{ color: `var(${statusPres!.cssVar})` }}>
              {typeof value === 'number' ? value.toFixed(1) : String(value)}{t('unit.temperature')}
            </span>
            {sensorPres && (
              <span style={{ color: `var(${sensorPres.cssVar})`, fontSize: 8 }}>
                {sensorPres.icon}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
