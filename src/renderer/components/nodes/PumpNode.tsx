import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation } from '../../theme.js';
import { useLocale } from '../../../i18n/index.js';

export function PumpNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);

  const runtime  = viewModel.liveValues['runtime'];
  const flowRate = viewModel.liveValues['flow'];

  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);
  const runColor   = hasRuntime
    ? isRunning ? 'var(--status-healthy)' : 'var(--text-sub)'
    : 'var(--text-sub)';
  const runLabel   = hasRuntime
    ? isRunning ? t('pump.running') : t('pump.standby')
    : t('pump.no_data');

  return (
    <div
      style={{
        border:         `2px solid var(${healthPres.cssVar})`,
        borderRadius:   '50%',
        padding:        '8px',
        width:          90,
        height:         90,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--node-bg)',
        textAlign:      'center',
      }}
    >
      <Handle type="target" position={Position.Left}  id="in"  />
      <Handle type="source" position={Position.Right} id="out" />

      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--node-label)', marginBottom: 2 }}>
        {name}
      </div>
      <div style={{ fontSize: 9, color: runColor }}>
        {runLabel}
      </div>
      {flowRate !== null && flowRate !== undefined && (
        <div style={{ fontSize: 9, color: 'var(--text-sub)', marginTop: 1 }}>
          {typeof flowRate === 'number' ? flowRate.toFixed(1) : String(flowRate)} {t('pump.flow_unit')}
        </div>
      )}
    </div>
  );
}
