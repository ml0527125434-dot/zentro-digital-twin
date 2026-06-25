/**
 * EquipmentDrawer — slide-in panel showing full details for a selected component.
 *
 * RTL: slides from the left (insetInlineStart: 0).
 * LTR: slides from the right (insetInlineEnd: 0).
 * Dismisses on: close button, ESC key, backdrop click.
 * Presentation only — no writes, no commands.
 */

import React, { useEffect, useCallback } from 'react';
import type { ComponentViewModel } from '../../domain/types.js';
import { HealthState, ValueProvenance } from '../../domain/types.js';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import {
  healthPresentation,
  nodeStatusPresentation,
  sensorStatePresentation,
} from '../../renderer/theme.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

export interface EquipmentDrawerProps {
  componentId:  string | null;
  projectId:    string;
  stores:       EngineStores;
  registry:     ComponentRegistry;
  componentVMs: Record<string, ComponentViewModel>;
  alarmStore:   AlarmStore;
  onClose:      () => void;
}

// ---------------------------------------------------------------------------
// Small layout primitives
// ---------------------------------------------------------------------------

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
    }}>
      {label}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      gap:            8,
      padding:        '6px 16px',
      fontSize:       11,
      borderBottom:   '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
    }}>
      <span style={{ color: 'var(--text-sub)', flexShrink: 0 }}>{label}</span>
      <span style={{
        color:              'var(--text-base)',
        fontWeight:         600,
        fontVariantNumeric: 'tabular-nums',
        textAlign:          'end',
      }}>
        {children}
      </span>
    </div>
  );
}

function StatusBadge({ cssVar, label }: { cssVar: string; label: string }) {
  return (
    <span style={{
      display:    'inline-flex',
      alignItems: 'center',
      gap:        5,
      fontSize:   11,
      color:      `var(${cssVar})`,
    }}>
      <span style={{
        display:      'inline-block',
        width:        6,
        height:       6,
        borderRadius: '50%',
        background:   `var(${cssVar})`,
        flexShrink:   0,
      }} />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EquipmentDrawer({
  componentId,
  projectId,
  stores,
  registry,
  componentVMs,
  alarmStore,
  onClose,
}: EquipmentDrawerProps) {
  const { t, config } = useLocale();
  const isRtl = config.dir === 'rtl';

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!componentId) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [componentId, handleKeyDown]);

  const isOpen = componentId !== null;

  const allComponents = stores.graph.getComponents(projectId);
  const component  = componentId ? allComponents.find(c => c.id === componentId) : null;
  const vm         = componentId ? componentVMs[componentId] : null;
  const definition = component  ? registry.get(component.type) : null;

  const activeAlarms = componentId
    ? alarmStore.getAlarmsForComponent(componentId).filter(a => a.state === 'active')
    : [];

  const connections = componentId
    ? stores.graph.getConnections(projectId).filter(
        c => c.fromComponentId === componentId || c.toComponentId === componentId,
      )
    : [];

  const slideHide = isRtl ? 'translateX(-100%)' : 'translateX(100%)';

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="drawer-backdrop"
        onClick={onClose}
        style={{
          position:      'absolute',
          inset:         0,
          background:    'rgba(0,0,0,0.45)',
          opacity:       isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition:    'opacity 0.22s ease',
          zIndex:        40,
        }}
      />

      {/* Drawer panel */}
      <div
        data-testid="equipment-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('drawer.title')}
        style={{
          position:          'absolute',
          top:               0,
          bottom:            0,
          [isRtl ? 'insetInlineStart' : 'insetInlineEnd']: 0,
          width:             340,
          maxWidth:          '92%',
          background:        'var(--bg-mantle)',
          borderInlineStart: isRtl  ? '2px solid var(--border-bright)' : '1px solid var(--border)',
          borderInlineEnd:   !isRtl ? '2px solid var(--border-bright)' : '1px solid var(--border)',
          display:           'flex',
          flexDirection:     'column',
          zIndex:            50,
          transform:         isOpen ? 'translateX(0)' : slideHide,
          transition:        'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflowY:         'auto',
          boxShadow:         isRtl
            ? '6px 0 32px rgba(0,0,0,0.65)'
            : '-6px 0 32px rgba(0,0,0,0.65)',
        }}
      >
        {component && vm && (
          <>
            {/* ── Header ─────────────────────────────────────────────── */}
            <div style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'space-between',
              padding:         '11px 16px',
              borderBottom:    '1px solid var(--border)',
              background:      'var(--bg-crust)',
              flexShrink:      0,
              gap:             8,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{
                  fontWeight:    700,
                  fontSize:      13,
                  color:         'var(--text-base)',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                  whiteSpace:    'nowrap',
                }}>
                  {component.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-sub)' }}>
                  {definition?.label ?? component.type}
                </span>
              </div>
              <button
                data-testid="drawer-close-btn"
                onClick={onClose}
                aria-label={t('drawer.close')}
                style={{
                  background:   'var(--bg-mantle)',
                  border:       '1px solid var(--border)',
                  borderRadius: 4,
                  color:        'var(--text-sub)',
                  cursor:       'pointer',
                  fontSize:     16,
                  lineHeight:   1,
                  padding:      '3px 8px',
                  flexShrink:   0,
                }}
              >
                ×
              </button>
            </div>

            {/* ── Status ─────────────────────────────────────────────── */}
            <SectionHeader label={t('drawer.section_status')} />
            {(() => {
              const healthPres = healthPresentation(vm.health);
              const statusPres = nodeStatusPresentation(vm.operationalStatus);
              const sensorPres = sensorStatePresentation(vm.sensorState);

              const mode =
                vm.health === HealthState.Maintenance   ? t('drawer.mode_maintenance') :
                vm.health === HealthState.Commissioning ? t('drawer.mode_commissioning') :
                t('drawer.mode_normal');

              const provenanceLabel =
                vm.provenance === ValueProvenance.Measured ? t('drawer.provenance_measured') :
                vm.provenance === ValueProvenance.Inferred ? t('drawer.provenance_inferred') :
                t('drawer.provenance_unknown');

              return (
                <>
                  {/* Three orthogonal status axes as badge row */}
                  <div style={{
                    display:    'flex',
                    gap:        8,
                    flexWrap:   'wrap',
                    padding:    '10px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <StatusBadge cssVar={healthPres.cssVar} label={t(healthPres.label as TranslationKey)} />
                    <StatusBadge cssVar={statusPres.cssVar} label={t(statusPres.label as TranslationKey)} />
                    <StatusBadge cssVar={sensorPres.cssVar} label={t(sensorPres.label as TranslationKey)} />
                  </div>
                  <Row label={t('drawer.equipment_type')}>
                    <span style={{ color: 'var(--text-sub)' }}>{definition?.label ?? component.type}</span>
                  </Row>
                  <Row label={t('drawer.mode')}>{mode}</Row>
                  <Row label={t('drawer.demo_source')}>
                    <span style={{
                      display:      'inline-flex',
                      alignItems:   'center',
                      gap:          4,
                      fontSize:     10,
                      color:        'var(--accent)',
                      background:   'color-mix(in srgb, var(--accent) 10%, transparent)',
                      border:       '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                      borderRadius: 10,
                      padding:      '1px 7px',
                      fontWeight:   600,
                    }}>
                      ⚡ {provenanceLabel}
                    </span>
                  </Row>
                </>
              );
            })()}

            {/* ── Live Values ────────────────────────────────────────── */}
            <SectionHeader label={t('drawer.section_telemetry')} />
            {(() => {
              const entries = Object.entries(vm.liveValues).filter(([, v]) => v !== null);
              if (entries.length === 0) {
                return (
                  <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-dim)' }}>
                    {t('drawer.no_live_data')}
                  </div>
                );
              }
              return entries.map(([key, rawVal]) => {
                const slot  = definition?.sensorSlots.find(s => s.id === key);
                const label = slot?.label ?? key;
                const unit  = slot?.unit ?? '';
                const val =
                  typeof rawVal === 'boolean' ? (rawVal ? '✓' : '✗') :
                  typeof rawVal === 'number'  ? `${rawVal.toFixed(1)}${unit ? ' ' + unit : ''}` :
                  String(rawVal);
                return <Row key={key} label={label}>{val}</Row>;
              });
            })()}

            {/* ── Alarms ─────────────────────────────────────────────── */}
            <SectionHeader label={t('drawer.section_alarms')} />
            {activeAlarms.length === 0 ? (
              <div style={{
                padding:    '8px 16px',
                fontSize:   11,
                display:    'flex',
                alignItems: 'center',
                gap:        6,
                color:      'var(--status-healthy)',
              }}>
                <span style={{ fontSize: 10 }}>✓</span>
                {t('drawer.no_alarms')}
              </div>
            ) : (
              activeAlarms.map(alarm => {
                const rule = alarmStore.getAlarmRule(alarm.ruleId);
                const severityColor =
                  rule?.severity === 'critical' ? 'var(--status-critical)' :
                  rule?.severity === 'warning'  ? 'var(--status-warning)'  :
                  'var(--text-sub)';
                return (
                  <div key={alarm.id} style={{
                    padding:      '8px 16px',
                    fontSize:     11,
                    borderBottom: '1px solid var(--border)',
                    background:   `color-mix(in srgb, ${severityColor} 5%, transparent)`,
                    display:      'flex',
                    flexDirection: 'column',
                    gap:          4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize:     9,
                        fontWeight:   800,
                        color:        severityColor,
                        background:   `color-mix(in srgb, ${severityColor} 15%, transparent)`,
                        border:       `1px solid color-mix(in srgb, ${severityColor} 30%, transparent)`,
                        borderRadius: 4,
                        padding:      '1px 6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        flexShrink:   0,
                      }}>
                        {rule?.severity ?? 'alarm'}
                      </span>
                      <span style={{ color: 'var(--text-base)', fontWeight: 600 }}>
                        {rule?.message ?? alarm.id}
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', paddingInlineStart: 2 }}>
                      ID: {alarm.id}
                    </div>
                  </div>
                );
              })
            )}

            {/* ── Connections ────────────────────────────────────────── */}
            <SectionHeader label={t('drawer.section_connections')} />
            {connections.length === 0 ? (
              <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-dim)' }}>
                {t('drawer.no_connections')}
              </div>
            ) : (
              connections.map(conn => {
                const isOutgoing = conn.fromComponentId === componentId;
                const peerId = isOutgoing ? conn.toComponentId : conn.fromComponentId;
                const peer = allComponents.find(c => c.id === peerId);
                return (
                  <div key={conn.id} style={{
                    padding:      '6px 16px',
                    fontSize:     11,
                    display:      'flex',
                    gap:          6,
                    alignItems:   'center',
                    borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                    color:        'var(--text-sub)',
                  }}>
                    <span style={{ color: isOutgoing ? 'var(--pipe-warm)' : 'var(--pipe-cold)', flexShrink: 0, fontSize: 12 }}>
                      {isOutgoing ? '→' : '←'}
                    </span>
                    <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                      {isOutgoing ? t('drawer.conn_out') : t('drawer.conn_in')}
                    </span>
                    <span style={{ color: 'var(--text-base)', fontWeight: 600 }}>
                      {peer?.name ?? peerId}
                    </span>
                  </div>
                );
              })
            )}

            {/* ── System Information ─────────────────────────────────── */}
            <SectionHeader label={t('drawer.section_info')} />
            <div style={{
              padding:      '10px 16px',
              fontSize:     11,
              color:        'var(--text-dim)',
              fontStyle:    'italic',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
            }}>
              <span style={{ fontSize: 10, flexShrink: 0 }}>ℹ</span>
              {t('demo.not_available')}
            </div>

            {/* Bottom breathing room */}
            <div style={{ height: 20 }} />
          </>
        )}
      </div>
    </>
  );
}
