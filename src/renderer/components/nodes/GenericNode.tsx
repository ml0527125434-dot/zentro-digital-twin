import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode, ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

// ---------------------------------------------------------------------------
// Per-type port configurations (matches component definitions in src/lib)
// ---------------------------------------------------------------------------

interface PortSpec {
  id:       string;
  type:     'target' | 'source';
  position: Position;
  style?:   React.CSSProperties;
}

const TYPE_PORTS: Record<string, PortSpec[]> = {
  filter: [
    { id: 'in',  type: 'target', position: Position.Left  },
    { id: 'out', type: 'source', position: Position.Right },
  ],
  air_separator: [
    { id: 'in',   type: 'target', position: Position.Left  },
    { id: 'out',  type: 'source', position: Position.Right },
    { id: 'vent', type: 'source', position: Position.Top   },
  ],
  expansion_vessel: [
    { id: 'connect', type: 'target', position: Position.Bottom },
  ],
  distribution_manifold: [
    { id: 'supply_in',  type: 'target', position: Position.Left   },
    { id: 'return_in',  type: 'target', position: Position.Top    },
    { id: 'zone_1_out', type: 'source', position: Position.Right,  style: { top: '28%' } },
    { id: 'zone_2_out', type: 'source', position: Position.Right,  style: { top: '55%' } },
    { id: 'zone_3_out', type: 'source', position: Position.Right,  style: { top: '80%' } },
  ],
  // tap is routed to ShowerNode, but keep a fallback
  generic: [
    { id: 'in',  type: 'target', position: Position.Left  },
    { id: 'out', type: 'source', position: Position.Right },
  ],
};

// ---------------------------------------------------------------------------
// Per-type visual config
// ---------------------------------------------------------------------------

interface TypeVisual {
  icon:        string;
  color:       string;
  bodyLabel?:  (unit: string) => React.ReactNode;
}

function expansionVesselBody(): React.ReactNode {
  return (
    <svg width="32" height="36" viewBox="0 0 32 36" fill="none" aria-hidden="true">
      {/* Vessel body */}
      <ellipse cx="16" cy="20" rx="13" ry="14" stroke="var(--accent)" strokeWidth="1.5" fill="color-mix(in srgb, var(--accent) 8%, transparent)" />
      {/* Diaphragm */}
      <line x1="3" y1="20" x2="29" y2="20" stroke="var(--accent)" strokeWidth="1" opacity="0.6" strokeDasharray="3 2" />
      {/* Connect port stub */}
      <line x1="16" y1="34" x2="16" y2="38" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

function filterBody(): React.ReactNode {
  return (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none" aria-hidden="true">
      {/* Filter box */}
      <rect x="2" y="3" width="30" height="14" rx="2" stroke="var(--accent)" strokeWidth="1.5" fill="color-mix(in srgb, var(--accent) 8%, transparent)" />
      {/* Filter mesh lines */}
      {[7, 12, 17, 22, 27].map(x => (
        <line key={x} x1={x} y1="3" x2={x} y2="17" stroke="var(--accent)" strokeWidth="0.8" opacity="0.5" />
      ))}
    </svg>
  );
}

function airSeparatorBody(): React.ReactNode {
  return (
    <svg width="30" height="28" viewBox="0 0 30 28" fill="none" aria-hidden="true">
      {/* Cylinder */}
      <rect x="5" y="6" width="20" height="18" rx="3" stroke="var(--accent)" strokeWidth="1.5" fill="color-mix(in srgb, var(--accent) 8%, transparent)" />
      {/* Air bubbles rising */}
      <circle cx="12" cy="14" r="2" fill="var(--pipe-air)" opacity="0.7" />
      <circle cx="18" cy="11" r="1.5" fill="var(--pipe-air)" opacity="0.55" />
      <circle cx="15" cy="17" r="1" fill="var(--pipe-air)" opacity="0.45" />
      {/* Vent arrow top */}
      <path d="M15 6 L15 1 M12 3.5 L15 1 L18 3.5" stroke="var(--pipe-air)" strokeWidth="1" fill="none" />
    </svg>
  );
}

function manifoldBody(zoneCount = 3): React.ReactNode {
  const height = 16 + zoneCount * 18;
  return (
    <svg width="36" height={height} viewBox={`0 0 36 ${height}`} fill="none" aria-hidden="true">
      {/* Main header pipe */}
      <rect x="2" y="4" width="32" height="10" rx="2" stroke="var(--pipe-hot)" strokeWidth="1.5" fill="color-mix(in srgb, var(--pipe-hot) 10%, transparent)" />
      {/* Zone outlets */}
      {Array.from({ length: zoneCount }, (_, i) => (
        <g key={i}>
          <line x1="10 + i * 8" y1="14" x2={10 + i * 8} y2={14 + (i + 1) * 14} stroke="var(--pipe-hot)" strokeWidth="1.5" />
          <circle cx={10 + i * 8} cy={14 + (i + 1) * 14} r="2.5" fill="var(--pipe-hot)" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GenericNode({ data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const temp       = viewModel.liveValues['temperature'] ?? viewModel.liveValues['temp'] ?? null;
  const pressure   = viewModel.liveValues['pressure']    ?? null;
  const tempNum    = typeof temp     === 'number' ? temp     : null;
  const pressNum   = typeof pressure === 'number' ? pressure : null;
  const alarmCount = viewModel.activeAlarms.length;

  const healthClass =
    viewModel.health === HealthState.Critical      ? 'zentro-node--critical'     :
    viewModel.health === HealthState.Warning       ? 'zentro-node--warning'      :
    viewModel.health === HealthState.Healthy       ? 'zentro-node--healthy'      :
    viewModel.health === HealthState.Maintenance   ? 'zentro-node--maintenance'  :
    viewModel.health === HealthState.Commissioning ? 'zentro-node--commissioning':
    'zentro-node--offline';

  const ports = TYPE_PORTS[typeId] ?? TYPE_PORTS['generic']!;

  // Per-type SVG body illustration
  const typeBody: React.ReactNode = (() => {
    switch (typeId) {
      case 'expansion_vessel':      return expansionVesselBody();
      case 'filter':                return filterBody();
      case 'air_separator':         return airSeparatorBody();
      case 'distribution_manifold': return manifoldBody(3);
      default:                      return null;
    }
  })();

  // Primary metric display
  const primaryDisplay = (() => {
    if (pressNum !== null) return { value: pressNum.toFixed(2), unit: 'bar', color: `var(${statusPres.cssVar})` };
    if (tempNum  !== null) return { value: tempNum.toFixed(1),  unit: t('unit.temperature'), color: `var(${statusPres.cssVar})` };
    return null;
  })();

  const minWidth = typeId === 'distribution_manifold' ? 140 : 120;

  return (
    <div className={`zentro-node ${healthClass}`} style={{ minWidth, position: 'relative' }}>
      <AlarmBadge count={alarmCount} />

      {/* Port handles — port-aware per component definition */}
      {ports.map(p => (
        <Handle
          key={p.id}
          type={p.type}
          position={p.position}
          id={p.id}
          style={p.style}
        />
      ))}

      <div className="zentro-node__header">
        <span className="zentro-node__name" style={{ fontSize: 9, fontWeight: 700 }}>{name}</span>
      </div>

      <div className="zentro-node__body" style={{ alignItems: 'center', paddingBottom: 4 }}>
        {/* SVG illustration */}
        {typeBody && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '3px 0' }}>
            {typeBody}
          </div>
        )}

        {/* Primary metric */}
        {primaryDisplay && (
          <span className="zentro-node__value" style={{ color: primaryDisplay.color, fontSize: 13 }}>
            {primaryDisplay.value}
            <span className="zentro-node__unit">{primaryDisplay.unit}</span>
          </span>
        )}

        <div className="zentro-node__status-row">
          <span
            className={`zentro-node__dot${sensorPres.cssVar === '--sensor-live' ? ' zentro-node__dot--blink' : ''}`}
            style={{ background: `var(${sensorPres.cssVar})` }}
          />
          <span className="zentro-node__sub">
            {t(healthPres.label as TranslationKey)}
          </span>
        </div>
      </div>
    </div>
  );
}
