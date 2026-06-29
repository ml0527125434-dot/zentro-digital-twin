/**
 * WorkspaceStatusBar — bottom status / validation bar (Phase 2A, pid-spec §9.5).
 *
 * Full-width 28px bar at the foot of the workspace — the "design-level health"
 * surface from the product review: design readiness + validation count on the
 * leading edge, current selection in the middle, an equipment/pipe summary on
 * the trailing edge. Tokens only; Hebrew-first via i18n; numerics tabular.
 *
 * Stage 2A scope: design warnings (isolated equipment) · selection · summary.
 * Zoom %, live cursor coords and autosave state are a deliberate follow-up
 * sub-stage (they require React Flow viewport / persistence hooks).
 */

import React, { useMemo } from 'react';
import type { Component, Connection } from '../../domain/types.js';
import { useLocale } from '../../i18n/index.js';

export interface WorkspaceStatusBarProps {
  components:    Component[];
  connections:   Connection[];
  selectedCount: number;
}

const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
const CELL: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };

export function WorkspaceStatusBar({ components, connections, selectedCount }: WorkspaceStatusBarProps) {
  const { t } = useLocale();

  // Design validation v1: equipment with no pipe attached is a design warning.
  const isolatedCount = useMemo(() => {
    if (components.length === 0) return 0;
    const linked = new Set<string>();
    for (const cn of connections) { linked.add(cn.fromComponentId); linked.add(cn.toComponentId); }
    return components.reduce((n, c) => (linked.has(c.id) ? n : n + 1), 0);
  }, [components, connections]);

  const empty = components.length === 0;
  const ok    = !empty && isolatedCount === 0;

  const dotColor = empty ? 'var(--text-dim)'
    : ok            ? 'var(--status-healthy)'
    :                 'var(--status-warning)';

  const readiness = empty ? t('status.no_components')
    : ok            ? t('status.ready')
    :                 t('status.design_warnings', { count: isolatedCount });

  const Sep = () => <span aria-hidden="true" style={{ color: 'var(--border-bright)' }}>·</span>;

  return (
    <div
      data-testid="workspace-status-bar"
      style={{
        height:     28,
        flexShrink: 0,
        display:    'flex',
        alignItems: 'center',
        gap:        16,
        padding:    '0 14px',
        background: 'var(--bg-crust)',
        borderTop:  '1px solid var(--border)',
        fontSize:   11,
        color:      'var(--text-sub)',
        overflow:   'hidden',
      }}
    >
      {/* Leading — design readiness / validation */}
      <div style={CELL} data-testid="status-readiness">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={ok || empty ? undefined : { color: 'var(--status-warning)', fontWeight: 600 }}>
          {readiness}
        </span>
      </div>

      {/* Middle — current selection */}
      {selectedCount > 0 && (
        <div style={CELL} data-testid="status-selection">
          <Sep />
          <span style={NUM}>{t('status.selected', { count: selectedCount })}</span>
        </div>
      )}

      {/* Trailing — equipment / pipe summary */}
      <div style={{ ...CELL, marginInlineStart: 'auto', color: 'var(--text-dim)' }} data-testid="status-summary">
        <span style={NUM}>{t('status.components', { count: components.length })}</span>
        <Sep />
        <span style={NUM}>{t('status.connections', { count: connections.length })}</span>
      </div>
    </div>
  );
}
