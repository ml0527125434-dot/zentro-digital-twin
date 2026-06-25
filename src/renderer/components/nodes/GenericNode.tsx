import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';

export function GenericNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const temp         = viewModel.liveValues['temperature'] ?? viewModel.liveValues['temp'] ?? null;
  const alarmCount   = viewModel.activeAlarms.filter(a => a.state === 'active').length;

  return (
    <div
      style={{
        border:       `2px solid var(${healthPres.cssVar})`,
        borderRadius: 6,
        padding:      '6px 10px',
        background:   'var(--node-bg)',
        minWidth:     120,
        position:     'relative',
      }}
    >
      <Handle type="target" position={Position.Left}  />
      <Handle type="source" position={Position.Right} />

      {alarmCount > 0 && (
        <span style={{
          position:   'absolute', top: -6, right: -6,
          background: 'var(--status-critical)', color: '#fff',
          borderRadius: '50%', width: 16, height: 16,
          fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>
          {alarmCount}
        </span>
      )}

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--node-label)', marginBottom: 2 }}>
        {name}
      </div>
      {temp !== null && (
        <div style={{ fontSize: 13, color: `var(${statusPres.cssVar})` }}>
          {typeof temp === 'number' ? temp.toFixed(1) : String(temp)}{t('unit.temperature')}
        </div>
      )}
      <div style={{ fontSize: 9, color: `var(${healthPres.cssVar})`, marginTop: 2 }}>
        {healthPres.icon} {t(healthPres.label as TranslationKey)}
      </div>
    </div>
  );
}
