/**
 * InspectorPanel — inline right-panel detail view for a selected component.
 *
 * Same detail content as EquipmentDrawer but rendered inline (no overlay,
 * no backdrop, no slide animation). Intended for the persistent right column
 * of the three-column workspace layout introduced in Stage 29.
 *
 * Stage 29 — Workspace Redesign.
 */

import React from 'react';
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

export interface InspectorPanelProps {
  componentId:  string | null;
  projectId:    string;
  stores:       EngineStores;
  registry:     ComponentRegistry;
  componentVMs: Record<string, ComponentViewModel>;
  alarmStore:   AlarmStore;
  onClose:      () => void;
}

// ---------------------------------------------------------------------------
// Shared layout primitives (mirrored from EquipmentDrawer)
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
// InspectorPanel
// ---------------------------------------------------------------------------

export function InspectorPanel({
  componentId,
  projectId,
  stores,
  registry,
  componentVMs,
  alarmStore,
  onClose,
}: InspectorPanelProps) {
  const { t } = useLocale();

  if (!componentId) return null;

  const allComponents = stores.graph.getComponents(projectId);
  const component  = allComponents.find(c => c.id === componentId) ?? null;
  const vm         = componentVMs[componentId] ?? null;
  const definition = component ? registry.get(component.type) : null;

  if (!component || !vm) return null;

  const activeAlarms = alarmStore
    .getAlarmsForComponent(componentId)
    .filter(a => a.state === 'active');

  const connections = stores.graph
    .getConnections(projectId)
    .filter(c => c.fromComponentId === componentId || c.toComponentId === componentId);

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
    <div
      data-testid="inspector-panel"
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        overflowY:     'auto',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '11px 16px',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--bg-crust)',
        flexShrink:     0,
        gap:            8,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{
            fontWeight:   700,
            fontSize:     13,
            color:        'var(--text-base)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {component.name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-sub)' }}>
            {definition?.label ?? component.type}
          </span>
        </div>
        <button
          data-testid="inspector-close-btn"
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

      {/* ── Status ───────────────────────────────────────────────────── */}
      <SectionHeader label={t('drawer.section_status')} />
      <div style={{
        display:      'flex',
        gap:          8,
        flexWrap:     'wrap',
        padding:      '10px 16px',
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

      {/* ── Live Values ──────────────────────────────────────────────── */}
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

      {/* ── Alarms ───────────────────────────────────────────────────── */}
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
              padding:       '8px 16px',
              fontSize:      11,
              borderBottom:  '1px solid var(--border)',
              background:    `color-mix(in srgb, ${severityColor} 5%, transparent)`,
              display:       'flex',
              flexDirection: 'column',
              gap:           4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize:      9,
                  fontWeight:    800,
                  color:         severityColor,
                  background:    `color-mix(in srgb, ${severityColor} 15%, transparent)`,
                  border:        `1px solid color-mix(in srgb, ${severityColor} 30%, transparent)`,
                  borderRadius:  4,
                  padding:       '1px 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  flexShrink:    0,
                }}>
                  {rule?.severity === 'critical' ? t('alarm.severity_critical') :
                   rule?.severity === 'warning'  ? t('alarm.severity_warning')  :
                   rule?.severity === 'info'     ? t('alarm.severity_info')     :
                   t('alarm.severity_warning')}
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

      {/* ── Connections ──────────────────────────────────────────────── */}
      <SectionHeader label={t('drawer.section_connections')} />
      {connections.length === 0 ? (
        <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-dim)' }}>
          {t('drawer.no_connections')}
        </div>
      ) : (
        connections.map(conn => {
          const isOutgoing = conn.fromComponentId === componentId;
          const peerId     = isOutgoing ? conn.toComponentId   : conn.fromComponentId;
          const portId     = isOutgoing ? conn.fromPortId      : conn.toPortId;
          const peer       = allComponents.find(c => c.id === peerId);
          const portDef    = definition?.ports.find(p => p.id === portId);
          const mediumVar  =
            conn.medium === 'cold_water' ? '--pipe-cold'    :
            conn.medium === 'recirc'     ? '--pipe-recirc'  :
            conn.medium === 'gas'        ? '--pipe-gas'     :
            conn.medium === 'electric'   ? '--pipe-electric':
            conn.medium === 'air'        ? '--pipe-air'     :
            '--pipe-warm';
          return (
            <div key={conn.id} style={{
              padding:       '7px 16px',
              fontSize:      11,
              display:       'flex',
              gap:           8,
              alignItems:    'center',
              borderBottom:  '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
            }}>
              <span style={{
                color:      `var(${mediumVar})`,
                flexShrink: 0,
                fontSize:   13,
                fontWeight: 700,
              }}>
                {isOutgoing ? '→' : '←'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ color: 'var(--text-base)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {peer?.name ?? peerId}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>
                  {portDef?.label ?? portId} · {t(`medium.${conn.medium}` as `medium.${typeof conn.medium}`)}
                </span>
              </div>
            </div>
          );
        })
      )}

      {/* ── System Info ──────────────────────────────────────────────── */}
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

      <div style={{ height: 20, flexShrink: 0 }} />
    </div>
  );
}
