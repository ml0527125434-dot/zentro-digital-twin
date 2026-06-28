/**
 * FlowEdge — premium pipe visualization.
 * Stage 33: dramatic visual transformation — thick colored pipes,
 * 3 animated direction arrows, strong glow, 3D pipe highlight.
 */

import React from 'react';
import {
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ConnectionEdge } from '../../flow-transformers.js';
import { sensorStatePresentation, nodeStatusPresentation } from '../../theme.js';
import { FlowState } from '../../../domain/types.js';

function mediumColor(medium?: string): string {
  switch (medium) {
    case 'cold_water': return '#38bdf8';
    case 'recirc':     return '#2dd4bf';
    case 'gas':        return '#fbbf24';
    case 'electric':   return '#a78bfa';
    case 'air':        return '#94a3b8';
    case 'hot_water':  return '#f97316';
    default:           return '#1e3a5f';
  }
}

function mediumStrokeWidth(medium?: string, isFlowing?: boolean): number {
  const base = medium === 'hot_water' ? 10
    : medium === 'cold_water' || medium === 'recirc' ? 9
    : medium === 'gas' ? 8
    : 7;
  return isFlowing ? base : base - 2;
}

export function FlowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<ConnectionEdge>) {
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

  const isFlowing = flow === FlowState.Flowing || flow === FlowState.Reverse;

  // Stroke color priority: alarm > status-tinted flow > medium identity
  let strokeColor: string;
  if (hasActiveAlarm) {
    strokeColor = '#ef4444';
  } else if (isFlowing && statusPres && value !== null) {
    strokeColor = `var(${statusPres.cssVar})`;
  } else {
    strokeColor = mediumColor(medium);
  }

  const strokeWidth = hasActiveAlarm
    ? 10
    : mediumStrokeWidth(medium, isFlowing);

  // Animation class for dash pattern
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

  const showArrow  = isFlowing || hasActiveAlarm;
  const arrowReverse = flow === FlowState.Reverse;
  const arrowDur   = flow === FlowState.Flowing ? '1.6s' : '2.4s';

  // Temperature label (only when flowing with a value)
  const showLabel = isFlowing && value !== null && statusPres !== null;

  return (
    <>
      {/* Strong glow layer */}
      {(isFlowing || hasActiveAlarm) && (
        <path
          d={edgePath}
          style={{
            stroke:        strokeColor,
            strokeWidth:   strokeWidth + 14,
            fill:          'none',
            opacity:       0.22,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main pipe body */}
      <path
        id={id}
        d={edgePath}
        className={`react-flow__edge-path ${animClass}`}
        style={{
          stroke:      strokeColor,
          strokeWidth,
          fill:        'none',
          strokeLinecap: 'round',
        }}
      />

      {/* Inner highlight stripe — 3D pipe depth effect */}
      {isFlowing && (
        <path
          d={edgePath}
          style={{
            stroke:        'rgba(255,255,255,0.18)',
            strokeWidth:   strokeWidth * 0.35,
            fill:          'none',
            pointerEvents: 'none',
            strokeLinecap: 'round',
          }}
        />
      )}

      {/* Animated flow arrows — 3 evenly spaced */}
      {showArrow && (
        <g pointerEvents="none" aria-hidden="true">
          {[0, 0.33, 0.66].map((offset, i) => (
            <polygon
              key={i}
              points="-7,0 6,-4.5 6,4.5"
              fill={strokeColor}
              opacity={0.95}
              style={{ filter: `drop-shadow(0 0 5px ${strokeColor})` }}
            >
              <animateMotion
                dur={arrowDur}
                repeatCount="indefinite"
                rotate="auto"
                begin={`${-offset * parseFloat(arrowDur)}s`}
                keyPoints={arrowReverse ? '1;0' : '0;1'}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#${id}`} />
              </animateMotion>
            </polygon>
          ))}
        </g>
      )}

      {/* Wide invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="react-flow__edge-interaction"
      />

      {/* Temperature label at midpoint */}
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              background:    `color-mix(in srgb, ${strokeColor} 20%, #0a0e17)`,
              border:        `1px solid ${strokeColor}`,
              borderRadius:  12,
              padding:       '2px 8px',
              fontSize:       10,
              fontWeight:     700,
              color:          strokeColor,
              backdropFilter: 'blur(4px)',
              lineHeight:     1.4,
              whiteSpace:     'nowrap',
            }}
            className="nodrag nopan"
          >
            {typeof value === 'number' ? value.toFixed(1) : String(value)}°C
            {sensorPres && (
              <span style={{ marginInlineStart: 4, fontSize: 8, opacity: 0.8 }}>
                {sensorPres.icon}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
