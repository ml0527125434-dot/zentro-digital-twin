/**
 * BuilderPropertyPanel — right inspector in Build Mode.
 *
 * Switches between four views based on BuilderContext FSM state:
 *   idle            → hint text
 *   placing         → "pick from palette" hint
 *   selected-component → rename/delete + connection form
 *   selected-connection → connection info + delete button
 *
 * All mutations go through BuilderContext (→ builder-actions → Graph Engine).
 * Stage 30.
 */

import React, { useState, useCallback } from 'react';
import type { Connection } from '../../domain/types.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { validateConnectionDraft } from '../../builder/port-validator.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

export interface BuilderPropertyPanelProps {
  projectId:  string;
  stores:     EngineStores;
  registry:   ComponentRegistry;
  onMutation: () => void;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize:      9,
      fontWeight:    800,
      color:         'var(--text-sub)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding:       '10px 16px 5px',
      borderBottom:  '1px solid var(--border)',
      marginTop:     4,
      flexShrink:    0,
    }}>
      {label}
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width:        '100%',
  background:   'var(--bg-base)',
  border:       '1px solid var(--border)',
  borderRadius: 4,
  color:        'var(--text-base)',
  fontSize:     11,
  padding:      '5px 8px',
  outline:      'none',
  boxSizing:    'border-box',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
};

// ── Main component ────────────────────────────────────────────────────────────

export function BuilderPropertyPanel({
  projectId,
  stores,
  registry,
  onMutation,
}: BuilderPropertyPanelProps) {
  const { t } = useLocale();
  const {
    state,
    dispatchFsm,
    renameComponent,
    deleteComponent,
    duplicateComponent,
    connectPorts,
    disconnectPorts,
    getComponents,
    getConnections,
  } = useBuilder();

  // ── Rename state ─────────────────────────────────────────────────────────
  const [renameValue,  setRenameValue]  = useState('');
  const [renameError,  setRenameError]  = useState<string | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  // ── Connection form state ─────────────────────────────────────────────────
  const [connFromId,   setConnFromId]   = useState('');
  const [connFromPort, setConnFromPort] = useState('');
  const [connToId,     setConnToId]     = useState('');
  const [connToPort,   setConnToPort]   = useState('');
  const [connErrors,   setConnErrors]   = useState<string[]>([]);

  const allComponents  = getComponents();
  const allConnections = getConnections();

  // ── Sync rename input when selection changes ──────────────────────────────
  const selectedId = state.selectedComponentId ?? null;
  const selectedConn = state.selectedConnectionId ?? null;

  React.useEffect(() => {
    if (selectedId) {
      const c = allComponents.find(c => c.id === selectedId);
      setRenameValue(c?.name ?? '');
      setRenameError(null);
      setDeleteError(null);
      setConnErrors([]);
      // Auto-populate the "from" side of the connection form with the selected component
      setConnFromId(selectedId);
      setConnFromPort('');
      setConnToId('');
      setConnToPort('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleRename = useCallback(() => {
    if (!selectedId) return;
    try {
      renameComponent(selectedId, renameValue);
      onMutation();
      setRenameError(null);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : String(e));
    }
  }, [selectedId, renameValue, renameComponent, onMutation]);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    try {
      deleteComponent(selectedId);
      dispatchFsm({ type: 'CLEAR_SELECTION' });
      onMutation();
      setDeleteError(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t('builder.delete_blocked'));
    }
  }, [selectedId, deleteComponent, dispatchFsm, onMutation, t]);

  const handleDuplicate = useCallback(() => {
    if (!selectedId) return;
    try {
      const copy = duplicateComponent(selectedId);
      dispatchFsm({ type: 'SELECT_COMPONENT', componentId: copy.id });
      onMutation();
    } catch { /* ignore */ }
  }, [selectedId, duplicateComponent, dispatchFsm, onMutation]);

  const handleConnect = useCallback(() => {
    if (!connFromId || !connFromPort || !connToId || !connToPort) return;

    const fromComp = allComponents.find(c => c.id === connFromId);
    const toComp   = allComponents.find(c => c.id === connToId);
    if (!fromComp || !toComp) return;

    const fromDef = registry.get(fromComp.type);
    const fromPort = fromDef?.ports.find(p => p.id === connFromPort);
    if (!fromPort) return;

    const medium    = fromPort.medium;
    const direction: Connection['topologicalDirection'] = 'forward';

    const result = validateConnectionDraft(
      {
        fromComponentId:   connFromId,
        fromComponentType: fromComp.type,
        fromPortId:        connFromPort,
        toComponentId:     connToId,
        toComponentType:   toComp.type,
        toPortId:          connToPort,
        medium,
      },
      registry,
      allConnections,
    );

    if (!result.valid) {
      setConnErrors(result.errors);
      return;
    }

    try {
      connectPorts(
        { componentId: connFromId, portId: connFromPort },
        { componentId: connToId,   portId: connToPort },
        medium,
        direction,
      );
      onMutation();
      setConnErrors([]);
      setConnFromId('');
      setConnFromPort('');
      setConnToId('');
      setConnToPort('');
    } catch (e) {
      setConnErrors([e instanceof Error ? e.message : String(e)]);
    }
  }, [
    connFromId, connFromPort, connToId, connToPort,
    allComponents, allConnections, registry, connectPorts, onMutation,
  ]);

  const handleDeleteConnection = useCallback(() => {
    if (!selectedConn) return;
    disconnectPorts(selectedConn);
    dispatchFsm({ type: 'CLEAR_SELECTION' });
    onMutation();
  }, [selectedConn, disconnectPorts, dispatchFsm, onMutation]);

  // ── Port helpers ──────────────────────────────────────────────────────────
  function outletPorts(componentId: string) {
    const comp = allComponents.find(c => c.id === componentId);
    if (!comp) return [];
    return registry.get(comp.type)?.ports.filter(p => p.role !== 'inlet') ?? [];
  }

  function inletPorts(componentId: string, medium?: string) {
    const comp = allComponents.find(c => c.id === componentId);
    if (!comp) return [];
    const ports = registry.get(comp.type)?.ports.filter(p => p.role !== 'outlet') ?? [];
    return medium ? ports.filter(p => p.medium === medium) : ports;
  }

  function selectedMedium(): string | undefined {
    if (!connFromId || !connFromPort) return undefined;
    const comp = allComponents.find(c => c.id === connFromId);
    if (!comp) return undefined;
    return registry.get(comp.type)?.ports.find(p => p.id === connFromPort)?.medium;
  }

  // ── Render modes ──────────────────────────────────────────────────────────

  // idle / placing → hint
  if (state.mode === 'idle' || state.mode === 'placing' || state.mode === 'connecting') {
    return (
      <div
        data-testid="builder-property-panel"
        style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '24px 20px',
          gap:            10,
          color:          'var(--text-dim)',
          textAlign:      'center',
        }}
      >
        <span style={{ fontSize: 28, opacity: 0.18, lineHeight: 1 }}>✦</span>
        <span style={{ fontSize: 11, lineHeight: 1.7, maxWidth: 200 }}>
          {t('builder.idle_hint')}
        </span>
      </div>
    );
  }

  // selected-connection → info + delete
  if (state.mode === 'selected-connection' && selectedConn) {
    const conn = allConnections.find(c => c.id === selectedConn);
    const fromComp = conn ? allComponents.find(c => c.id === conn.fromComponentId) : null;
    const toComp   = conn ? allComponents.find(c => c.id === conn.toComponentId)   : null;

    return (
      <div
        data-testid="builder-property-panel"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}
      >
        <SectionHeader label={t('builder.conn_title')} />

        {conn && (
          <>
            <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-sub)' }}>
              <div>{fromComp?.name ?? conn.fromComponentId} <span style={{ color: 'var(--text-dim)' }}>({conn.fromPortId})</span></div>
              <div style={{ padding: '2px 0', color: 'var(--text-dim)', fontSize: 10 }}>↓</div>
              <div>{toComp?.name ?? conn.toComponentId} <span style={{ color: 'var(--text-dim)' }}>({conn.toPortId})</span></div>
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-dim)' }}>
                {t('builder.conn_medium')}: {t(`medium.${conn.medium}` as `medium.${typeof conn.medium}`)}
              </div>
            </div>
            <div style={{ padding: '8px 16px' }}>
              <button
                data-testid="builder-delete-connection-btn"
                onClick={handleDeleteConnection}
                style={{
                  width:        '100%',
                  padding:      '6px 10px',
                  background:   'color-mix(in srgb, var(--status-critical) 10%, var(--bg-mantle))',
                  border:       '1px solid color-mix(in srgb, var(--status-critical) 35%, var(--border))',
                  borderRadius: 4,
                  color:        'var(--status-critical)',
                  cursor:       'pointer',
                  fontSize:     11,
                  fontWeight:   700,
                }}
              >
                {t('builder.conn_delete')}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // selected-component → rename/delete + connection form
  if (state.mode === 'selected-component' && selectedId) {
    const component = allComponents.find(c => c.id === selectedId);
    const def       = component ? registry.get(component.type) : null;
    const medium    = selectedMedium();
    const toPortOptions = inletPorts(connToId, medium);

    return (
      <div
        data-testid="builder-property-panel"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}
      >
        {/* ── Component info ─────────────────────────────────────────── */}
        <div style={{
          padding:     '10px 16px 8px',
          borderBottom:'1px solid var(--border)',
          flexShrink:  0,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-base)' }}>
            {component?.name ?? selectedId}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 2 }}>
            {def?.label ?? component?.type}
          </div>
        </div>

        {/* ── Rename ─────────────────────────────────────────────────── */}
        <SectionHeader label={t('builder.props_title')} />
        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 10, color: 'var(--text-sub)', display: 'block' }}>
            {t('builder.name_label')}
          </label>
          <input
            data-testid="builder-rename-input"
            value={renameValue}
            onChange={e => setRenameValue(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
            style={INPUT_STYLE}
          />
          {renameError && (
            <span style={{ fontSize: 10, color: 'var(--status-critical)' }}>{renameError}</span>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              data-testid="builder-rename-btn"
              onClick={handleRename}
              style={{
                flex:         1,
                padding:      '5px 8px',
                background:   'var(--bg-mantle)',
                border:       '1px solid var(--border)',
                borderRadius: 4,
                color:        'var(--text-base)',
                cursor:       'pointer',
                fontSize:     11,
                fontWeight:   600,
              }}
            >
              {t('builder.rename_btn')}
            </button>
            <button
              data-testid="builder-duplicate-btn"
              onClick={handleDuplicate}
              title="Ctrl+D"
              style={{
                flex:         1,
                padding:      '5px 8px',
                background:   'color-mix(in srgb, var(--accent) 8%, var(--bg-mantle))',
                border:       '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
                borderRadius: 4,
                color:        'var(--accent)',
                cursor:       'pointer',
                fontSize:     11,
                fontWeight:   600,
              }}
            >
              {t('builder.duplicate')}
            </button>
            <button
              data-testid="builder-delete-btn"
              onClick={handleDelete}
              style={{
                flex:         1,
                padding:      '5px 8px',
                background:   'color-mix(in srgb, var(--status-critical) 8%, var(--bg-mantle))',
                border:       '1px solid color-mix(in srgb, var(--status-critical) 30%, var(--border))',
                borderRadius: 4,
                color:        'var(--status-critical)',
                cursor:       'pointer',
                fontSize:     11,
                fontWeight:   700,
              }}
            >
              {t('builder.delete_btn')}
            </button>
          </div>
          {deleteError && (
            <span
              data-testid="builder-delete-error"
              style={{ fontSize: 10, color: 'var(--status-critical)', lineHeight: 1.5 }}
            >
              {deleteError}
            </span>
          )}
          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
            {t('builder.deselect_tip')}
          </div>
        </div>

        {/* ── Port definitions ───────────────────────────────────────── */}
        {def && def.ports.length > 0 && (
          <>
            <SectionHeader label={t('builder.ports_section')} />
            <div style={{ padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {def.ports.map(port => {
                const mediumVar =
                  port.medium === 'cold_water' ? '--pipe-cold'    :
                  port.medium === 'recirc'     ? '--pipe-recirc'  :
                  port.medium === 'gas'        ? '--pipe-gas'     :
                  port.medium === 'electric'   ? '--pipe-electric':
                  port.medium === 'air'        ? '--pipe-air'     :
                  '--pipe-warm';
                const roleIcon = port.role === 'outlet' ? '→' : port.role === 'inlet' ? '←' : '↔';

                // Check if this port already has a connection
                const isConnected = allConnections.some(cn =>
                  (cn.fromComponentId === selectedId && cn.fromPortId === port.id) ||
                  (cn.toComponentId   === selectedId && cn.toPortId   === port.id)
                );

                return (
                  <div key={port.id} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          7,
                    fontSize:     10,
                    padding:      '4px 0',
                    borderBottom: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
                  }}>
                    {/* Connected indicator */}
                    <span title={isConnected ? 'Connected' : 'Not connected'} style={{
                      fontSize:   9,
                      color:      isConnected ? 'var(--status-healthy)' : 'var(--text-dim)',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}>
                      {isConnected ? '●' : '○'}
                    </span>
                    <span style={{ color: `var(${mediumVar})`, fontWeight: 700, flexShrink: 0, fontSize: 11 }}>
                      {roleIcon}
                    </span>
                    <span style={{ color: 'var(--text-base)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {port.label}
                    </span>
                    <span style={{
                      fontSize:     8,
                      fontWeight:   700,
                      color:        `var(${mediumVar})`,
                      background:   `color-mix(in srgb, var(${mediumVar}) 12%, transparent)`,
                      border:       `1px solid color-mix(in srgb, var(${mediumVar}) 25%, transparent)`,
                      borderRadius: 3,
                      padding:      '1px 5px',
                      textTransform:'uppercase',
                      letterSpacing:'0.06em',
                      flexShrink:   0,
                    }}>
                      {t(`medium.${port.medium}` as `medium.${typeof port.medium}`)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Add Connection form ─────────────────────────────────────── */}
        <SectionHeader label={t('builder.conn_title')} />
        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>

          {/* From component */}
          <label style={{ fontSize: 10, color: 'var(--text-sub)' }}>{t('builder.conn_from')}</label>
          <select
            data-testid="conn-from-select"
            value={connFromId}
            onChange={e => { setConnFromId(e.currentTarget.value); setConnFromPort(''); setConnToPort(''); setConnErrors([]); }}
            style={SELECT_STYLE}
          >
            <option value="">—</option>
            {allComponents.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* From port */}
          {connFromId && (
            <>
              <label style={{ fontSize: 10, color: 'var(--text-sub)' }}>{t('builder.conn_from_port')}</label>
              <select
                data-testid="conn-from-port-select"
                value={connFromPort}
                onChange={e => { setConnFromPort(e.currentTarget.value); setConnToPort(''); setConnErrors([]); }}
                style={SELECT_STYLE}
              >
                <option value="">—</option>
                {outletPorts(connFromId).map(p => (
                  <option key={p.id} value={p.id}>{p.label} ({p.medium})</option>
                ))}
              </select>
            </>
          )}

          {/* To component */}
          {connFromPort && (
            <>
              <label style={{ fontSize: 10, color: 'var(--text-sub)' }}>{t('builder.conn_to')}</label>
              <select
                data-testid="conn-to-select"
                value={connToId}
                onChange={e => { setConnToId(e.currentTarget.value); setConnToPort(''); setConnErrors([]); }}
                style={SELECT_STYLE}
              >
                <option value="">—</option>
                {allComponents.filter(c => c.id !== connFromId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </>
          )}

          {/* To port */}
          {connToId && connFromPort && (
            <>
              <label style={{ fontSize: 10, color: 'var(--text-sub)' }}>{t('builder.conn_to_port')}</label>
              <select
                data-testid="conn-to-port-select"
                value={connToPort}
                onChange={e => { setConnToPort(e.currentTarget.value); setConnErrors([]); }}
                style={SELECT_STYLE}
              >
                <option value="">—</option>
                {toPortOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.label} ({p.medium})</option>
                ))}
              </select>
            </>
          )}

          {/* Medium preview */}
          {medium && connFromPort && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {t('builder.conn_medium')}: <strong style={{ color: 'var(--text-sub)' }}>{t(`medium.${medium}` as TranslationKey)}</strong>
            </div>
          )}

          {/* Validation errors */}
          {connErrors.length > 0 && (
            <div
              data-testid="conn-errors"
              style={{
                background:   'color-mix(in srgb, var(--status-critical) 8%, var(--bg-crust))',
                border:       '1px solid color-mix(in srgb, var(--status-critical) 25%, var(--border))',
                borderRadius: 4,
                padding:      '6px 10px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--status-critical)', marginBottom: 4 }}>
                {t('builder.conn_errors')}
              </div>
              {connErrors.map((err, i) => (
                <div key={i} style={{ fontSize: 10, color: 'var(--status-critical)', lineHeight: 1.5 }}>• {err}</div>
              ))}
            </div>
          )}

          {/* Connect button */}
          <button
            data-testid="conn-submit-btn"
            onClick={handleConnect}
            disabled={!connFromId || !connFromPort || !connToId || !connToPort}
            style={{
              padding:      '6px 10px',
              background:   'color-mix(in srgb, var(--accent) 12%, var(--bg-mantle))',
              border:       '1px solid color-mix(in srgb, var(--accent) 40%, var(--border))',
              borderRadius: 4,
              color:        'var(--accent)',
              cursor:       (!connFromId || !connFromPort || !connToId || !connToPort) ? 'not-allowed' : 'pointer',
              fontSize:     11,
              fontWeight:   700,
              opacity:      (!connFromId || !connFromPort || !connToId || !connToPort) ? 0.5 : 1,
            }}
          >
            {t('builder.conn_submit')}
          </button>
        </div>

        <div style={{ height: 16, flexShrink: 0 }} />
      </div>
    );
  }

  return null;
}
