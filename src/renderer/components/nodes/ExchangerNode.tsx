import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { nodeStatusPresentation } from '../../theme.js';

const EXCHANGER_ICONS: Record<string, string> = {
  plate_heat_exchanger: '⇄',
  solar_collector:      '☀',
};

export function ExchangerNode({ data }: NodeProps<ComponentNodeData>) {
  const { name, typeId, viewModel } = data;
  const { health, operationalStatus, liveValues } = viewModel;

  const icon    = EXCHANGER_ICONS[typeId] ?? '⇄';
  const isSolar = typeId === 'solar_collector';

  // Primary value: outlet temp for PHE, collector temp for solar
  const tempSlot  = isSolar ? 'temp' : 'temp_primary_out';
  const rawValue  = liveValues?.[tempSlot] ?? liveValues?.['temp'] ?? null;
  const value     = typeof rawValue === 'number' ? rawValue : null;

  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const valueColor = statusPres ? `var(${statusPres.cssVar})` : 'var(--text-base)';

  const healthBorder =
    health === 'critical'     ? 'var(--status-critical)'   :
    health === 'warning'      ? 'var(--status-warning)'    :
    health === 'offline'      ? 'var(--status-offline)'    :
    health === 'maintenance'  ? 'var(--status-maintenance)':
    health === 'commissioning'? 'var(--status-commissioning)': 'var(--border-bright)';

  const isActive = typeof liveValues?.['runtime'] === 'boolean'
    ? liveValues.runtime
    : value !== null && value > 30;

  return (
    <div
      className="zentro-node"
      style={{
        background:   'var(--bg-mantle)',
        border:       `1px solid ${healthBorder}`,
        borderRadius: 'var(--card-radius)',
        padding:      '8px 12px',
        minWidth:     120,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          4,
        boxShadow:    'var(--shadow-card)',
        position:     'relative',
      }}
    >
      {/* Ports */}
      <Handle type="target" position={Position.Left}   id={isSolar ? 'cold_in'  : 'primary_in'}    style={{ background: 'var(--pipe-cold)', width: 7, height: 7 }} />
      <Handle type="source" position={Position.Right}  id={isSolar ? 'hot_out'  : 'primary_out'}   style={{ background: 'var(--pipe-hot)', width: 7, height: 7 }} />
      {!isSolar && <>
        <Handle type="target" position={Position.Bottom} id="secondary_in"  style={{ background: 'var(--pipe-cold)', width: 7, height: 7 }} />
        <Handle type="source" position={Position.Top}    id="secondary_out" style={{ background: 'var(--pipe-hot)', width: 7, height: 7 }} />
      </>}
      {isSolar && <>
        <Handle type="target" position={Position.Bottom} id="cold_in" style={{ background: 'var(--pipe-cold)', width: 7, height: 7, display: 'none' }} />
        <Handle type="source" position={Position.Top}    id="hot_out" style={{ background: 'var(--pipe-hot)', width: 7, height: 7, display: 'none' }} />
      </>}

      {/* Icon with active glow */}
      <span style={{
        fontSize:   22,
        lineHeight: 1,
        filter:     isActive && isSolar ? 'drop-shadow(0 0 4px rgba(251,191,36,0.7))' : 'none',
        transition: 'filter 0.4s',
      }}>
        {icon}
      </span>

      <span style={{
        fontSize:     10,
        fontWeight:   700,
        color:        'var(--text-base)',
        textAlign:    'center',
        maxWidth:     110,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {name}
      </span>

      {value !== null ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: valueColor }}>
          {value.toFixed(1)}°C
        </span>
      ) : (
        <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>
          {isActive ? 'פועל' : 'המתנה'}
        </span>
      )}
    </div>
  );
}
