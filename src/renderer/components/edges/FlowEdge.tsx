/**
 * FlowEdge — engineering pipe (Stage 1A: orthogonal routing + static arrow).
 *
 * Master Spec (pid-spec §1):
 *  - §1.1 Orthogonal only — getSmoothStepPath with borderRadius = ELBOW_RADIUS.
 *  - §1.2 Elbows render as a single near-sharp 3px corner.
 *  - §1.7 A *static* arrowhead sits at the pipe midpoint (filled triangle, medium
 *         color), always visible at rest — the P&ID "not a toy" signal.
 *  - §1.8 Animation is Monitor-only / live-data-only. Build Mode pipes are static.
 *
 * Colors are design tokens only (var(--pipe-*) / var(--status-*)) — no hex here.
 */

import React, { useContext, useLayoutEffect, useRef, useState } from 'react';
import {
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ConnectionEdge } from '../../flow-transformers.js';
import { sensorStatePresentation, nodeStatusPresentation } from '../../theme.js';
import { FlowState } from '../../../domain/types.js';
import { BuildModeContext } from '../../build-mode-context.js';

/** Near-sharp 90° corner — technical, not bubbly (pid-spec §0 ELBOW_RADIUS). */
const ELBOW_RADIUS = 3;

/** Medium → design-token color (pid-spec §0; values live in styles.css). */
function mediumColorVar(medium?: string): string {
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

/** Pipe thickness stays as today in Stage 1A; the toned-down 4–6px set is Stage 1C. */
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
  const buildMode = useContext(BuildModeContext);

  // §1.1 — orthogonal route with near-sharp elbows (replaces the old bezier curve).
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: ELBOW_RADIUS,
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

  // §1.8 — live animation is Monitor-only. Build Mode forces a calm, static pipe.
  const live = !buildMode && (isFlowing || hasActiveAlarm);

  // Stroke color priority: alarm > status-tinted live flow > medium identity.
  let strokeColor: string;
  if (hasActiveAlarm) {
    strokeColor = 'var(--status-critical)';
  } else if (live && statusPres && value !== null) {
    strokeColor = `var(${statusPres.cssVar})`;
  } else {
    strokeColor = mediumColorVar(medium);
  }

  const strokeWidth = hasActiveAlarm ? 10 : mediumStrokeWidth(medium, live);

  // Dash animation class — static in Build Mode, live in Monitor.
  let animClass = 'zentro-edge-noflow';
  if (!buildMode) {
    if (hasActiveAlarm)                       animClass = 'zentro-edge-alarm';
    else if (flow === FlowState.Flowing)      animClass = 'zentro-edge-flowing';
    else if (flow === FlowState.Reverse)      animClass = 'zentro-edge-reverse';
  }

  // §1.7 — static midpoint arrowhead pointing source→target (topological forward).
  // Derived from the actual rendered path so it sits on the orthogonal midsegment.
  const pathRef = useRef<SVGPathElement | null>(null);
  const [arrow, setArrow] = useState<{ x: number; y: number; angle: number } | null>(null);

  useLayoutEffect(() => {
    const path = pathRef.current;
    // jsdom has no SVG geometry — guard so tests render without it.
    if (!path || typeof path.getTotalLength !== 'function') { setArrow(null); return; }
    let len = 0;
    try { len = path.getTotalLength(); } catch { setArrow(null); return; }
    if (!len || !Number.isFinite(len)) { setArrow(null); return; }
    try {
      const mid   = path.getPointAtLength(len / 2);
      const ahead = path.getPointAtLength(Math.min(len, len / 2 + 1));
      const angle = (Math.atan2(ahead.y - mid.y, ahead.x - mid.x) * 180) / Math.PI;
      setArrow({ x: mid.x, y: mid.y, angle });
    } catch {
      setArrow(null);
    }
  }, [edgePath]);

  // Static arrowhead scales gently with pipe width.
  const arrowSize = Math.max(5, strokeWidth * 0.9);

  // Temperature label only in Monitor when actually flowing with a value.
  const showLabel = live && isFlowing && value !== null && statusPres !== null;

  return (
    <>
      {/* Live glow layer — Monitor only */}
      {live && (
        <path
          d={edgePath}
          style={{
            stroke:        strokeColor,
            strokeWidth:   strokeWidth + 14,
            fill:          'none',
            opacity:       0.18,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main pipe body */}
      <path
        id={id}
        ref={pathRef}
        d={edgePath}
        className={`react-flow__edge-path ${animClass}`}
        style={{
          stroke:        strokeColor,
          strokeWidth,
          fill:          'none',
          strokeLinejoin: 'round',
        }}
      />

      {/* Static midpoint arrowhead — always visible (P&ID direction signal) */}
      {arrow && (
        <polygon
          points={`${arrowSize},0 ${-arrowSize * 0.85},${-arrowSize * 0.75} ${-arrowSize * 0.85},${arrowSize * 0.75}`}
          transform={`translate(${arrow.x},${arrow.y}) rotate(${arrow.angle})`}
          fill={strokeColor}
          pointerEvents="none"
          aria-hidden="true"
        />
      )}

      {/* Live moving markers — Monitor only, on top of the static arrow */}
      {live && isFlowing && (
        <g pointerEvents="none" aria-hidden="true">
          {[0, 0.5].map((offset, i) => (
            <polygon
              key={i}
              points="-6,0 5,-4 5,4"
              fill={strokeColor}
              opacity={0.9}
            >
              <animateMotion
                dur={flow === FlowState.Flowing ? '1.8s' : '2.6s'}
                repeatCount="indefinite"
                rotate="auto"
                begin={`${-offset * 1.8}s`}
                keyPoints={flow === FlowState.Reverse ? '1;0' : '0;1'}
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

      {/* Temperature label at midpoint — Monitor only */}
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              background:    `color-mix(in srgb, ${strokeColor} 20%, var(--bg-crust))`,
              border:        `1px solid ${strokeColor}`,
              borderRadius:  6,
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
