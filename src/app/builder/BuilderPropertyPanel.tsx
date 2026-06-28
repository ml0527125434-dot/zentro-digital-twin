/**
 * BuilderPropertyPanel — radically simplified.
 *
 * Operator UX: show only what matters now.
 * - Idle: nothing (blank slate)
 * - Component selected: large visual + name + one delete button
 * - "פרטים" expander reveals rename + connection form
 * - Connection selected: from/to info + delete
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Connection } from '../../domain/types.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { validateConnectionDraft } from '../../builder/port-validator.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';
import { ComponentIllustration } from './ComponentIllustration.js';

// Category accent colours (mirrors palette)
const TYPE_ACCENT: Record<string, string> = {
  storage_tank:'#60a5fa', buffer_tank:'#60a5fa', expansion_vessel:'#60a5fa',
  heat_pump:'#fb923c', gas_backup:'#fb923c', electric_heater:'#fb923c',
  solar_collector:'#fbbf24', plate_heat_exchanger:'#fb923c',
  recirc_pump:'#22d3ee', variable_speed_pump:'#22d3ee',
  mixing_valve:'#c084fc', control_valve:'#c084fc',
  isolation_valve:'#c084fc', safety_valve:'#c084fc',
  temperature_sensor:'#4ade80', pressure_sensor:'#818cf8',
  flow_sensor:'#22d3ee', energy_meter:'#facc15', water_meter:'#60a5fa',
  filter:'#94a3b8', air_separator:'#94a3b8',
  distribution_manifold:'#818cf8',
  point_of_use:'#2dd4bf', tap:'#2dd4bf',
};

const HE_NAME: Record<string, string> = {
  storage_tank:'מיכל אחסון', buffer_tank:'מיכל חיץ', expansion_vessel:'כלי התפשטות',
  heat_pump:'משאבת חום', gas_backup:'תנור גז', electric_heater:'מחמם חשמלי',
  solar_collector:'קולט שמש', plate_heat_exchanger:'מחליף חום',
  recirc_pump:'משאבת סירקולציה', variable_speed_pump:'משאבה מתכווננת',
  mixing_valve:'שסתום ערבוב', control_valve:'שסתום בקרה',
  isolation_valve:'שסתום ניתוק', safety_valve:'שסתום בטיחות',
  temperature_sensor:'חיישן טמפרטורה', pressure_sensor:'חיישן לחץ',
  flow_sensor:'חיישן זרימה', energy_meter:'מד אנרגיה', water_meter:'מד מים',
  filter:'מסנן', air_separator:'מפריד אוויר',
  distribution_manifold:'מניפולד הפצה', point_of_use:'מקלחת', tap:'ברז',
};

const MEDIUM_HE: Record<string, string> = {
  hot_water:'מים חמים', cold_water:'מים קרים', recirc:'סירקולציה',
  gas:'גז', electric:'חשמל', air:'אוויר', mixed:'מעורב',
};

export interface BuilderPropertyPanelProps {
  projectId:  string;
  stores:     EngineStores;
  registry:   ComponentRegistry;
  onMutation: () => void;
}

export function BuilderPropertyPanel({ projectId, stores, registry, onMutation }: BuilderPropertyPanelProps) {
  const { t } = useLocale();
  const { state, dispatchFsm, renameComponent, deleteComponent,
          duplicateComponent, connectPorts, disconnectPorts,
          getComponents, getConnections } = useBuilder();

  const [showDetails, setShowDetails] = useState(false);
  const [renameValue,  setRenameValue]  = useState('');
  const [renameError,  setRenameError]  = useState<string | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  // Connection form
  const [connFromId,   setConnFromId]   = useState('');
  const [connFromPort, setConnFromPort] = useState('');
  const [connToId,     setConnToId]     = useState('');
  const [connToPort,   setConnToPort]   = useState('');
  const [connErrors,   setConnErrors]   = useState<string[]>([]);

  const allComponents  = getComponents();
  const allConnections = getConnections();

  const selectedId   = state.selectedComponentId   ?? null;
  const selectedConn = state.selectedConnectionId ?? null;

  // Sync rename when selection changes
  useEffect(() => {
    if (selectedId) {
      const c = allComponents.find(c => c.id === selectedId);
      setRenameValue(c?.name ?? '');
      setRenameError(null);
      setDeleteError(null);
      setConnErrors([]);
      setConnFromId(selectedId);
      setConnFromPort('');
      setConnToId('');
      setConnToPort('');
      setShowDetails(false);
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

  function outletPorts(cId: string) {
    const c = allComponents.find(c => c.id === cId);
    return c ? registry.get(c.type)?.ports.filter(p => p.role !== 'inlet') ?? [] : [];
  }

  function inletPorts(cId: string, medium?: string) {
    const c = allComponents.find(c => c.id === cId);
    const ports = c ? registry.get(c.type)?.ports.filter(p => p.role !== 'outlet') ?? [] : [];
    return medium ? ports.filter(p => p.medium === medium) : ports;
  }

  function getMedium() {
    if (!connFromId || !connFromPort) return undefined;
    const c = allComponents.find(c => c.id === connFromId);
    return c ? registry.get(c.type)?.ports.find(p => p.id === connFromPort)?.medium : undefined;
  }

  const handleConnect = useCallback(() => {
    if (!connFromId || !connFromPort || !connToId || !connToPort) return;
    const fromComp = allComponents.find(c => c.id === connFromId);
    const fromDef  = fromComp ? registry.get(fromComp.type) : null;
    const fromPort = fromDef?.ports.find(p => p.id === connFromPort);
    if (!fromComp || !fromPort) return;

    const result = validateConnectionDraft({
      fromComponentId: connFromId, fromComponentType: fromComp.type,
      fromPortId: connFromPort,
      toComponentId: connToId, toComponentType: allComponents.find(c => c.id === connToId)?.type ?? '',
      toPortId: connToPort, medium: fromPort.medium,
    }, registry, allConnections);

    if (!result.valid) { setConnErrors(result.errors); return; }

    try {
      connectPorts(
        { componentId: connFromId, portId: connFromPort },
        { componentId: connToId,   portId: connToPort },
        fromPort.medium, 'forward',
      );
      onMutation();
      setConnErrors([]);
      setConnFromPort('');
      setConnToId('');
      setConnToPort('');
    } catch (e) {
      setConnErrors([e instanceof Error ? e.message : String(e)]);
    }
  }, [connFromId, connFromPort, connToId, connToPort, allComponents, allConnections, registry, connectPorts, onMutation]);

  const handleDeleteConn = useCallback(() => {
    if (!selectedConn) return;
    disconnectPorts(selectedConn);
    dispatchFsm({ type: 'CLEAR_SELECTION' });
    onMutation();
  }, [selectedConn, disconnectPorts, dispatchFsm, onMutation]);

  // ── Idle / placing — blank ────────────────────────────────────────────────
  if (state.mode === 'idle' || state.mode === 'placing' || state.mode === 'connecting') {
    return (
      <div
        data-testid="builder-property-panel"
        style={{
          height:         '100%',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            14,
          color:          'rgba(255,255,255,0.12)',
          direction:      'rtl',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.25 }}>✦</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center', maxWidth: 160 }}>
          בחר רכיב לעריכה
        </div>
      </div>
    );
  }

  // ── Connection selected ───────────────────────────────────────────────────
  if (state.mode === 'selected-connection' && selectedConn) {
    const conn     = allConnections.find(c => c.id === selectedConn);
    const fromComp = conn ? allComponents.find(c => c.id === conn.fromComponentId) : null;
    const toComp   = conn ? allComponents.find(c => c.id === conn.toComponentId)   : null;
    const medHe    = conn ? MEDIUM_HE[conn.medium] ?? conn.medium : '';
    const medColors: Record<string, string> = {
      hot_water:'#f97316', cold_water:'#38bdf8', recirc:'#2dd4bf',
      gas:'#fbbf24', electric:'#a78bfa', air:'#94a3b8',
    };
    const lineColor = conn ? medColors[conn.medium] ?? '#60a5fa' : '#60a5fa';

    return (
      <div
        data-testid="builder-property-panel"
        style={{ height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl', overflow: 'hidden' }}
      >
        {/* Visual connection diagram */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 16px',
        }}>
          <div style={{
            width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
            borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* From */}
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f4' }}>
              {fromComp?.name ?? conn?.fromComponentId}
            </div>
            <div style={{ fontSize: 10, color: '#4a6080', marginTop: 2 }}>
              {HE_NAME[fromComp?.type ?? ''] ?? fromComp?.type}
            </div>

            {/* Pipe line */}
            <div style={{
              margin: '12px auto', width: 3, height: 32,
              background: `linear-gradient(to bottom, ${lineColor}, ${lineColor}88)`,
              borderRadius: 2, position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                background: '#050810', border: `1.5px solid ${lineColor}`,
                borderRadius: 10, padding: '2px 8px',
                fontSize: 9, fontWeight: 800, color: lineColor, whiteSpace: 'nowrap',
              }}>{medHe}</div>
            </div>

            {/* To */}
            <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f4' }}>
              {toComp?.name ?? conn?.toComponentId}
            </div>
            <div style={{ fontSize: 10, color: '#4a6080', marginTop: 2 }}>
              {HE_NAME[toComp?.type ?? ''] ?? toComp?.type}
            </div>
          </div>

          <button
            data-testid="builder-delete-connection-btn"
            onClick={handleDeleteConn}
            style={{
              marginTop:    8,
              width:        '100%',
              padding:      '10px',
              background:   'rgba(239,68,68,0.08)',
              border:       '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              color:        '#ef4444',
              cursor:       'pointer',
              fontSize:     13,
              fontWeight:   800,
            }}
          >
            🗑 מחק צינור
          </button>
        </div>
      </div>
    );
  }

  // ── Component selected ────────────────────────────────────────────────────
  if (state.mode === 'selected-component' && selectedId) {
    const component = allComponents.find(c => c.id === selectedId);
    const def       = component ? registry.get(component.type) : null;
    const accent    = TYPE_ACCENT[component?.type ?? ''] ?? '#60a5fa';
    const heName    = HE_NAME[component?.type ?? ''] ?? component?.type ?? '';
    const medium    = getMedium();
    const toPortOpts= inletPorts(connToId, medium);

    return (
      <div
        data-testid="builder-property-panel"
        style={{ height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl', overflowY: 'auto' }}
      >
        {/* ── Component hero ─────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          padding:        '20px 16px 16px',
          borderBottom:   '1px solid rgba(255,255,255,0.05)',
          gap:            10,
          background:     `linear-gradient(180deg, rgba(${hexToRgb(accent)},0.07) 0%, transparent 100%)`,
          flexShrink:     0,
        }}>
          {/* Illustration */}
          <div style={{
            background:   `rgba(${hexToRgb(accent)},0.08)`,
            borderRadius: 14,
            padding:      8,
            border:       `1.5px solid ${accent}33`,
          }}>
            <ComponentIllustration typeId={component?.type ?? ''} accent={accent} />
          </div>

          {/* Name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#e2e8f4', lineHeight: 1.2 }}>
              {component?.name}
            </div>
            <div style={{ fontSize: 11, color: accent, marginTop: 3, fontWeight: 700 }}>
              {heName}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              data-testid="builder-duplicate-btn"
              onClick={handleDuplicate}
              style={{
                flex: 1, padding: '8px', borderRadius: 8,
                background: `rgba(${hexToRgb(accent)},0.08)`,
                border: `1px solid ${accent}33`,
                color: accent, cursor: 'pointer', fontSize: 12, fontWeight: 800,
              }}
            >⧉ שכפל</button>
            <button
              data-testid="builder-delete-btn"
              onClick={handleDelete}
              style={{
                flex: 1, padding: '8px', borderRadius: 8,
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 800,
              }}
            >🗑 מחק</button>
          </div>

          {deleteError && (
            <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', lineHeight: 1.4 }}>
              {deleteError}
            </div>
          )}
        </div>

        {/* ── Ports status ────────────────────────────────────────────── */}
        {def && def.ports.length > 0 && (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 10, color: '#4a6080', fontWeight: 800, marginBottom: 8, letterSpacing: '0.06em' }}>
              חיבורים
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {def.ports.map(port => {
                const medColors: Record<string, string> = {
                  hot_water:'#f97316', cold_water:'#38bdf8', recirc:'#2dd4bf',
                  gas:'#fbbf24', electric:'#a78bfa', air:'#94a3b8',
                };
                const mc = medColors[port.medium] ?? '#60a5fa';
                const connected = allConnections.some(cn =>
                  (cn.fromComponentId === selectedId && cn.fromPortId === port.id) ||
                  (cn.toComponentId   === selectedId && cn.toPortId   === port.id)
                );
                return (
                  <div key={port.id} style={{
                    display:     'flex', alignItems: 'center', gap: 8,
                    padding:     '5px 8px',
                    borderRadius: 6,
                    background:  connected ? `rgba(${hexToRgb(mc)},0.06)` : 'transparent',
                    border:      `1px solid ${connected ? mc + '33' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: connected ? mc : 'transparent',
                      border: `1.5px solid ${connected ? mc : '#2a3a4a'}`,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, fontSize: 11, color: connected ? '#c8d4e8' : '#4a6080', fontWeight: 600 }}>
                      {port.label}
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 800, color: mc,
                      background: `rgba(${hexToRgb(mc)},0.12)`,
                      borderRadius: 4, padding: '2px 6px',
                    }}>
                      {MEDIUM_HE[port.medium] ?? port.medium}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── פרטים נוספים expander ────────────────────────────────────── */}
        <button
          onClick={() => setShowDetails(v => !v)}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '10px 14px',
            background:     'transparent',
            border:         'none',
            borderBottom:   '1px solid rgba(255,255,255,0.05)',
            color:          '#4a6080',
            cursor:         'pointer',
            fontSize:       11,
            fontWeight:     700,
            width:          '100%',
            direction:      'rtl',
          }}
        >
          <span>פרטים נוספים</span>
          <span style={{ transition: 'transform 0.2s', transform: showDetails ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {showDetails && (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Rename */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                data-testid="builder-rename-input"
                value={renameValue}
                onChange={e => setRenameValue(e.currentTarget.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
                placeholder="שם הרכיב"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#e2e8f4',
                  fontSize: 12, padding: '7px 10px', outline: 'none', direction: 'rtl',
                }}
              />
              <button
                data-testid="builder-rename-btn"
                onClick={handleRename}
                style={{
                  padding: '7px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f4',
                  cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}
              >שנה</button>
            </div>
            {renameError && <div style={{ fontSize: 10, color: '#ef4444' }}>{renameError}</div>}

            {/* Add connection form */}
            <div style={{
              padding: '10px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              <div style={{ fontSize: 10, color: '#4a6080', fontWeight: 800 }}>חיבור חדש</div>

              <select
                data-testid="conn-from-select"
                value={connFromId}
                onChange={e => { setConnFromId(e.currentTarget.value); setConnFromPort(''); setConnToPort(''); }}
                style={selStyle}
              >
                <option value="">מרכיב…</option>
                {allComponents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {connFromId && (
                <select
                  data-testid="conn-from-port-select"
                  value={connFromPort}
                  onChange={e => { setConnFromPort(e.currentTarget.value); setConnToPort(''); }}
                  style={selStyle}
                >
                  <option value="">מיציאה…</option>
                  {outletPorts(connFromId).map(p => (
                    <option key={p.id} value={p.id}>{p.label} — {MEDIUM_HE[p.medium] ?? p.medium}</option>
                  ))}
                </select>
              )}

              {connFromPort && (
                <select
                  data-testid="conn-to-select"
                  value={connToId}
                  onChange={e => { setConnToId(e.currentTarget.value); setConnToPort(''); }}
                  style={selStyle}
                >
                  <option value="">לרכיב…</option>
                  {allComponents.filter(c => c.id !== connFromId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}

              {connToId && connFromPort && (
                <select
                  data-testid="conn-to-port-select"
                  value={connToPort}
                  onChange={e => setConnToPort(e.currentTarget.value)}
                  style={selStyle}
                >
                  <option value="">לכניסה…</option>
                  {toPortOpts.map(p => (
                    <option key={p.id} value={p.id}>{p.label} — {MEDIUM_HE[p.medium] ?? p.medium}</option>
                  ))}
                </select>
              )}

              {connErrors.length > 0 && (
                <div data-testid="conn-errors" style={{ fontSize: 10, color: '#ef4444', lineHeight: 1.5 }}>
                  {connErrors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}

              <button
                data-testid="conn-submit-btn"
                onClick={handleConnect}
                disabled={!connFromId || !connFromPort || !connToId || !connToPort}
                style={{
                  padding: '8px', borderRadius: 7,
                  background: (connFromId && connFromPort && connToId && connToPort)
                    ? `rgba(${hexToRgb(accent)},0.12)` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${(connFromId && connFromPort && connToId && connToPort)
                    ? accent + '44' : 'rgba(255,255,255,0.06)'}`,
                  color: (connFromId && connFromPort && connToId && connToPort) ? accent : '#2a3a4a',
                  cursor: (!connFromId || !connFromPort || !connToId || !connToPort) ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 800,
                }}
              >
                חבר
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />
      </div>
    );
  }

  return null;
}

// ── Shared select style ───────────────────────────────────────────────────────

const selStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
  color: '#c8d4e8', fontSize: 11, padding: '6px 8px', outline: 'none',
  direction: 'rtl', cursor: 'pointer',
};

// ── Hex → RGB helper (no hash) ────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
