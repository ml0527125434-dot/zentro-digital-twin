/**
 * MissionControlView — Three-Column Engineering Workspace (Stage 29 redesign)
 *
 * Layout:
 *   Full-width SystemStatusBar strip (collapses in presentation mode)
 *   ┌──────────────────┬─────────────────────────┬──────────────────┐
 *   │  Left Sidebar    │  Center Canvas           │  Right Inspector │
 *   │  280 px          │  flex: 1                 │  360 px          │
 *   │  collapsible     │                          │  collapsible     │
 *   │  AlarmBanner     │  FlowMap (full area)      │  InspectorPanel  │
 *   │  EquipmentGrid   │                          │  or placeholder  │
 *   │  EventTimeline   │                          │                  │
 *   └──────────────────┴─────────────────────────┴──────────────────┘
 *
 * Presentation mode collapses both sidebars + the status bar, leaving only
 * the FlowMap — identical to Stage 26 keyboard shortcuts.
 *
 * Builder mode (Stage 30+) drops into this same layout: the center canvas
 * switches to an editable FlowMap; the right inspector becomes a property
 * editor. No layout restructuring needed.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { ComponentViewModel, ConnectionViewModel } from '../../domain/types.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { buildFlowGraph } from '../../renderer/flow-transformers.js';
import { useElkLayout } from '../../renderer/useElkLayout.js';
import { FlowMap } from '../../renderer/components/FlowMap.js';
import { useLocale } from '../../i18n/index.js';
import { SystemStatusBar } from './SystemStatusBar.js';
import { AlarmBanner } from './AlarmBanner.js';
import { EquipmentGrid } from './EquipmentGrid.js';
import { EventTimeline } from './EventTimeline.js';
import { InspectorPanel } from '../workspace/InspectorPanel.js';

export interface MissionControlViewProps {
  projectId:     string;
  stores:        EngineStores;
  registry:      ComponentRegistry;
  componentVMs:  Record<string, ComponentViewModel>;
  connectionVMs: Record<string, ConnectionViewModel>;
  alarmStore:    AlarmStore;
  nowMs:         number;
  presentationMode?:   boolean;
  onDrawerOpenChange?: (open: boolean) => void;
}

// Small shared button style for panel-toggle controls
const TOGGLE_BTN: React.CSSProperties = {
  background:   'var(--bg-mantle)',
  border:       '1px solid var(--border)',
  borderRadius: 3,
  color:        'var(--text-sub)',
  cursor:       'pointer',
  fontSize:     11,
  fontWeight:   700,
  lineHeight:   1.2,
  padding:      '2px 6px',
  flexShrink:   0,
};

export function MissionControlView({
  projectId,
  stores,
  registry,
  componentVMs,
  connectionVMs,
  alarmStore,
  nowMs,
  presentationMode = false,
  onDrawerOpenChange,
}: MissionControlViewProps) {
  const { t } = useLocale();

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const handleSelectComponent = useCallback((id: string) => {
    setSelectedComponentId(id);
    setRightCollapsed(false); // auto-expand inspector on selection
  }, []);

  const handleCloseInspector = useCallback(() => {
    setSelectedComponentId(null);
  }, []);

  // Signal to ZentroApp whether inspector has content (ESC-key priority)
  useEffect(() => {
    onDrawerOpenChange?.(selectedComponentId !== null);
  }, [selectedComponentId, onDrawerOpenChange]);

  // ESC clears the inspector selection
  useEffect(() => {
    if (!selectedComponentId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedComponentId(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedComponentId]);

  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  const { nodes, edges } = buildFlowGraph(components, connections, componentVMs, connectionVMs);
  const { layoutNodes, isReady } = useElkLayout(nodes, edges);

  // Presentation mode collapses both sidebars; manual toggles respected otherwise
  const showLeft  = !presentationMode && !leftCollapsed;
  const showRight = !presentationMode && !rightCollapsed;

  return (
    <div
      data-testid="mission-control"
      style={{
        display:       'flex',
        flexDirection: 'column',
        flex:          1,
        minHeight:     0,
        overflow:      'hidden',
      }}
    >
      {/* ── System Status Strip — full width, collapses in presentation mode ── */}
      <div style={{
        maxHeight:  presentationMode ? 0 : 40,
        overflow:   'hidden',
        flexShrink: 0,
        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <SystemStatusBar componentVMs={componentVMs} nowMs={nowMs} />
      </div>

      {/* ── Three-column workspace ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div
          data-testid="workspace-left"
          style={{
            width:           showLeft ? 280 : 0,
            flexShrink:      0,
            overflow:        'hidden',
            transition:      'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            display:         'flex',
            flexDirection:   'column',
            background:      'var(--bg-crust)',
            borderInlineEnd: '1px solid var(--border)',
            minHeight:       0,
          }}
        >
          {/* Sidebar header: section label + collapse button */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 8px 0 12px',
            borderBottom:   '1px solid var(--border)',
            flexShrink:     0,
            minHeight:      30,
            gap:            6,
          }}>
            <span style={{
              fontSize:      9,
              fontWeight:    800,
              color:         'var(--text-sub)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              whiteSpace:    'nowrap',
            }}>
              {t('equip.title')}
            </span>
            <button
              data-testid="sidebar-left-toggle"
              onClick={() => setLeftCollapsed(true)}
              aria-label="Collapse equipment panel"
              style={TOGGLE_BTN}
            >
              ‹
            </button>
          </div>

          {/* Alarm banner */}
          <AlarmBanner alarmStore={alarmStore} components={components} />

          {/* Equipment list — fills most of the sidebar */}
          <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <EquipmentGrid
              projectId={projectId}
              stores={stores}
              componentVMs={componentVMs}
              alarmStore={alarmStore}
              onSelectComponent={handleSelectComponent}
            />
          </div>

          {/* Event timeline — bottom slice */}
          <div style={{
            flex:          '0 0 auto',
            maxHeight:     '38%',
            borderTop:     '1px solid var(--border)',
            display:       'flex',
            flexDirection: 'column',
            overflow:      'hidden',
          }}>
            <EventTimeline
              alarmStore={alarmStore}
              components={components}
              nowMs={nowMs}
            />
          </div>
        </div>

        {/* ── CENTER CANVAS ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>

          {/* Expand left panel when collapsed */}
          {!presentationMode && leftCollapsed && (
            <button
              data-testid="sidebar-left-expand"
              onClick={() => setLeftCollapsed(false)}
              aria-label="Expand equipment panel"
              style={{
                ...TOGGLE_BTN,
                position: 'absolute',
                top:      8,
                left:     8,
                zIndex:   15,
              }}
            >
              ›
            </button>
          )}

          {/* Expand right inspector when collapsed */}
          {!presentationMode && rightCollapsed && (
            <button
              data-testid="inspector-right-expand"
              onClick={() => setRightCollapsed(false)}
              aria-label="Expand inspector panel"
              style={{
                ...TOGGLE_BTN,
                position: 'absolute',
                top:      8,
                right:    8,
                zIndex:   15,
              }}
            >
              ‹
            </button>
          )}

          {/* ELK loading indicator */}
          {!isReady && (
            <div style={{
              position:       'absolute',
              insetInlineEnd: 10,
              top:            10,
              zIndex:         10,
              fontSize:       10,
              color:          'var(--text-sub)',
              background:     'var(--bg-crust)',
              border:         '1px solid var(--border)',
              borderRadius:   4,
              padding:        '2px 7px',
              pointerEvents:  'none',
            }}>
              {t('flowmap.loading')}
            </div>
          )}

          {/* FlowMap — fills the entire center column */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <FlowMap
              nodes={layoutNodes}
              edges={edges}
              onNodeClick={handleSelectComponent}
            />
          </div>
        </div>

        {/* ── RIGHT INSPECTOR ───────────────────────────────────────────────── */}
        <div
          data-testid="workspace-right"
          style={{
            width:             showRight ? 360 : 0,
            flexShrink:        0,
            overflow:          'hidden',
            transition:        'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            display:           'flex',
            flexDirection:     'column',
            background:        'var(--bg-crust)',
            borderInlineStart: '1px solid var(--border)',
            minHeight:         0,
          }}
        >
          {/* Inspector header: title or empty label + collapse button */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 8px 0 14px',
            borderBottom:   '1px solid var(--border)',
            flexShrink:     0,
            minHeight:      30,
            gap:            6,
          }}>
            <span style={{
              fontSize:      9,
              fontWeight:    800,
              color:         'var(--text-sub)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              whiteSpace:    'nowrap',
              overflow:      'hidden',
              textOverflow:  'ellipsis',
            }}>
              {selectedComponentId
                ? (stores.graph.getComponents(projectId).find(c => c.id === selectedComponentId)?.name ?? '')
                : 'Inspector'}
            </span>
            <button
              data-testid="inspector-right-toggle"
              onClick={() => setRightCollapsed(true)}
              aria-label="Collapse inspector panel"
              style={TOGGLE_BTN}
            >
              ›
            </button>
          </div>

          {/* Inspector content: detail panel or placeholder */}
          {selectedComponentId ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <InspectorPanel
                componentId={selectedComponentId}
                projectId={projectId}
                stores={stores}
                registry={registry}
                componentVMs={componentVMs}
                alarmStore={alarmStore}
                onClose={handleCloseInspector}
              />
            </div>
          ) : (
            <div
              data-testid="inspector-placeholder"
              style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        '24px 20px',
                gap:            14,
                color:          'var(--text-dim)',
                textAlign:      'center',
              }}
            >
              <span style={{ fontSize: 32, opacity: 0.18, lineHeight: 1 }}>⬡</span>
              <span style={{
                fontSize:   11,
                lineHeight: 1.7,
                maxWidth:   200,
              }}>
                {t('inspector.empty')}
              </span>
            </div>
          )}
        </div>

      </div>{/* end three-column workspace */}
    </div>
  );
}
