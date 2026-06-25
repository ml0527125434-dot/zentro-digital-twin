import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';

export function HeatPumpNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);

  const runtime = viewModel.liveValues['runtime'];
  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);

  const healthClass =
    viewModel.health === HealthState.Critical ? 'zentro-node--critical' :
    viewModel.health === HealthState.Warning   ? 'zentro-node--warning'  :
    viewModel.health === HealthState.Healthy   ? 'zentro-node--healthy'  :
    'zentro-node--offline';

  const runColor = isRunning ? 'var(--status-healthy)' : 'var(--text-sub)';
  const runLabel = !hasRuntime ? t('pump.no_data') : isRunning ? t('kpi.running') : t('kpi.standby');

  return (
    <div className={`zentro-node ${healthClass}`} style={{ width: 130 }}>
      <Handle type="source" position={Position.Right} id="heat_out_1" />
      <Handle type="source" position={Position.Right} id="heat_out_2" style={{ top: '70%' }} />

      <div className="zentro-node__header">
        <span className="zentro-node__icon">♨</span>
        <span className="zentro-node__name">{name}</span>
      </div>

      <div className="zentro-node__body">
        {/* Exchange arrows symbol */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       22,
          color:          isRunning ? 'var(--pipe-hot)' : 'var(--text-dim)',
          margin:         '4px 0',
          lineHeight:     1,
          transition:     'color 0.4s',
        }}>
          {isRunning ? '⇅' : '⇵'}
        </div>

        <span className="zentro-node__value" style={{ color: runColor, fontSize: 14 }}>
          {runLabel}
        </span>

        <div className="zentro-node__status-row">
          <span
            className="zentro-node__dot"
            style={{ background: `var(${healthPres.cssVar})` }}
          />
          <span className="zentro-node__sub">
            {t(healthPres.label as TranslationKey)}
          </span>
        </div>
      </div>
    </div>
  );
}
