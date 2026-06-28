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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ComponentViewModel, ConnectionViewModel } from '../../domain/types.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { buildFlowGraph } from '../../renderer/flow-transformers.js';
import { useElkLayout } from '../../renderer/useElkLayout.js';
import { FlowMap } from '../../renderer/components/FlowMap.js';
import { useLocale } from '../../i18n/index.js';
import { SystemStatusBar } from './SystemStatusBar.js';
import { KpiBar } from './KpiBar.js';
import { AlarmBanner } from './AlarmBanner.js';
import { EquipmentGrid } from './EquipmentGrid.js';
import { EventTimeline } from './EventTimeline.js';
import { InspectorPanel } from '../workspace/InspectorPanel.js';
import { BuilderPalettePanel } from '../builder/BuilderPalettePanel.js';
import { BuilderPropertyPanel } from '../builder/BuilderPropertyPanel.js';
import { BuilderContextMenu } from '../builder/BuilderContextMenu.js';
import { useBuilder } from '../../builder/useBuilder.js';

export interface MissionControlViewProps {
  projectId:     string;
  stores:        EngineStores;
  registry:      ComponentRegistry;
  componentVMs:  Record<string, ComponentViewModel>;
  connectionVMs: Record<string, ConnectionViewModel>;
  alarmStore:    AlarmStore;
  nowMs:         number;
  buildMode?:          boolean;
  presentationMode?:   boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  onMutation?:         () => void;
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
  buildMode = false,
  presentationMode = false,
  onDrawerOpenChange,
  onMutation,
}: MissionControlViewProps) {
  const { t } = useLocale();
  const builder = useBuilder();

  // Monitor-mode selection (independent of BuilderContext FSM)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Builder multi-select tracking (from React Flow selection events)
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);

  // Connection validation toast
  const [connectError, setConnectError] = useState<string | null>(null);
  const connectErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ componentId: string; x: number; y: number } | null>(null);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  // Clear monitor selection when switching to build mode
  useEffect(() => {
    if (buildMode) setSelectedComponentId(null);
  }, [buildMode]);

  const handleSelectComponent = useCallback((id: string) => {
    if (buildMode) {
      builder.dispatchFsm({ type: 'SELECT_COMPONENT', componentId: id });
      setRightCollapsed(false);
    } else {
      setSelectedComponentId(id);
      setRightCollapsed(false);
    }
  }, [buildMode, builder]);

  const handleEdgeClick = useCallback((connectionId: string) => {
    if (buildMode) {
      builder.dispatchFsm({ type: 'SELECT_CONNECTION', connectionId });
      setRightCollapsed(false);
    }
  }, [buildMode, builder]);

  const handlePaneClick = useCallback(() => {
    if (!buildMode) return;
    if (builder.state.mode !== 'placing') return;
    const typeId = builder.state.pendingTypeId;
    if (!typeId) return;

    // Place at a staggered position; ELK will relayout automatically
    const existing = stores.graph.getComponents(projectId);
    const n = existing.length;
    const position = { x: 60 + (n % 4) * 160, y: 60 + Math.floor(n / 4) * 140 };

    // Auto-generate name: "Heat Pump 2" etc.
    const def = registry.get(typeId);
    const sameType = existing.filter(c => c.type === typeId).length;
    const name = `${def?.label ?? typeId} ${sameType + 1}`;

    try {
      builder.placeComponent(typeId, name, position);
      builder.dispatchFsm({ type: 'CANCEL_PLACING' });
      onMutation?.();
    } catch {
      // If placement fails, just cancel placing
      builder.dispatchFsm({ type: 'CANCEL_PLACING' });
    }
  }, [buildMode, builder, stores, registry, projectId, onMutation]);

  const handleCloseInspector = useCallback(() => {
    setSelectedComponentId(null);
  }, []);

  const handleSelectionChange = useCallback((ids: string[]) => {
    setMultiSelectedIds(ids);
  }, []);

  const handleNodeContextMenu = useCallback((componentId: string, x: number, y: number) => {
    if (!buildMode) return;
    builder.dispatchFsm({ type: 'SELECT_COMPONENT', componentId });
    setCtxMenu({ componentId, x, y });
  }, [buildMode, builder]);

  const handleCtxDuplicate = useCallback(() => {
    if (!ctxMenu) return;
    try {
      builder.duplicateComponent(ctxMenu.componentId);
      onMutation?.();
    } catch { /* ignore */ }
  }, [ctxMenu, builder, onMutation]);

  const handleCtxDelete = useCallback(() => {
    if (!ctxMenu) return;
    try {
      builder.deleteComponent(ctxMenu.componentId);
      builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
      onMutation?.();
    } catch { /* blocked — has connections */ }
  }, [ctxMenu, builder, onMutation]);

  const handleCtxRename = useCallback(() => {
    if (!ctxMenu) return;
    // Focus the rename input in BuilderPropertyPanel by dispatching a custom event
    document.dispatchEvent(new CustomEvent('zentro:builder:focusRename', { detail: ctxMenu.componentId }));
    setRightCollapsed(false);
  }, [ctxMenu]);

  // Drag-to-connect: fired by FlowMap when user drags handle-to-handle in build mode
  const handleConnect = useCallback((sourceId: string, sourceHandle: string, targetId: string, targetHandle: string) => {
    if (!buildMode) return;
    // Infer medium from source port definition
    const sourceComp = stores.graph.getComponents(projectId).find(c => c.id === sourceId);
    if (!sourceComp) return;
    const sourceDef  = registry.get(sourceComp.type);
    const sourcePort = sourceDef?.ports.find(p => p.id === sourceHandle);
    if (!sourcePort) return;
    try {
      builder.connectPorts(
        { componentId: sourceId, portId: sourceHandle },
        { componentId: targetId, portId: targetHandle },
        sourcePort.medium,
        'forward',
      );
      onMutation?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setConnectError(msg);
      if (connectErrorTimer.current) clearTimeout(connectErrorTimer.current);
      connectErrorTimer.current = setTimeout(() => setConnectError(null), 3500);
    }
  }, [buildMode, stores, registry, projectId, builder, onMutation]);

  // Edge deletion via Delete key on selected edge (from RF onEdgesDelete)
  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (!buildMode) return;
    try {
      builder.disconnectPorts(edgeId);
      builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
      onMutation?.();
    } catch { /* ignore */ }
  }, [buildMode, builder, onMutation]);

  // Cleanup connect error timer on unmount
  useEffect(() => () => { if (connectErrorTimer.current) clearTimeout(connectErrorTimer.current); }, []);

  // Signal to ZentroApp whether inspector has content (ESC-key priority)
  useEffect(() => {
    onDrawerOpenChange?.(selectedComponentId !== null);
  }, [selectedComponentId, onDrawerOpenChange]);

  // ESC clears selection (monitor mode)
  useEffect(() => {
    if (buildMode) return;
    if (!selectedComponentId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedComponentId(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedComponentId, buildMode]);

  // Build mode keyboard shortcuts: Delete → delete selected; Escape → cancel placing
  useEffect(() => {
    if (!buildMode) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Escape') {
        if (builder.state.mode === 'placing') {
          builder.dispatchFsm({ type: 'CANCEL_PLACING' });
        } else {
          builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (builder.state.mode === 'selected-component' && builder.state.selectedComponentId) {
          try {
            builder.deleteComponent(builder.state.selectedComponentId);
            builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
            onMutation?.();
          } catch { /* blocked — has connections */ }
        } else if (builder.state.mode === 'selected-connection' && builder.state.selectedConnectionId) {
          builder.disconnectPorts(builder.state.selectedConnectionId);
          builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
          onMutation?.();
        }
      }

      // Ctrl+D → duplicate selected component
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const targetIds = builder.state.mode === 'selected-component' && builder.state.selectedComponentId
          ? [builder.state.selectedComponentId]
          : multiSelectedIds;
        for (const id of targetIds) {
          try { builder.duplicateComponent(id); } catch { /* ignore */ }
        }
        if (targetIds.length > 0) onMutation?.();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [buildMode, builder, multiSelectedIds, onMutation]);

  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  const { nodes, edges } = buildFlowGraph(components, connections, componentVMs, connectionVMs);
  const { layoutNodes, isReady } = useElkLayout(nodes, edges);

  const isPlacingMode = buildMode && builder.state.mode === 'placing';

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

      {/* ── KPI Bar — monitor mode only, collapses in presentation mode ─────── */}
      {!buildMode && (
        <div style={{
          maxHeight:  presentationMode ? 0 : 68,
          overflow:   'hidden',
          flexShrink: 0,
          transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <KpiBar
            componentVMs={componentVMs}
            connectionVMs={connectionVMs}
            alarmStore={alarmStore}
            projectId={projectId}
            components={components}
          />
        </div>
      )}

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

          {buildMode ? (
            /* Build mode: palette fills the sidebar */
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <BuilderPalettePanel registry={registry} />
            </div>
          ) : (
            /* Monitor mode: alarm banner + equipment grid + timeline */
            <>
              <AlarmBanner alarmStore={alarmStore} components={components} />
              <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <EquipmentGrid
                  projectId={projectId}
                  stores={stores}
                  componentVMs={componentVMs}
                  alarmStore={alarmStore}
                  onSelectComponent={handleSelectComponent}
                />
              </div>
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
            </>
          )}
        </div>

        {/* ── CENTER CANVAS ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>

          {/* Expand left panel when collapsed */}
          {!presentationMode && leftCollapsed && (
            <button
              data-testid="sidebar-left-expand"
              onClick={() => setLeftCollapsed(false)}
              aria-label="Expand equipment panel"
              title="Expand sidebar"
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
              title="Expand inspector"
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

          {/* Empty canvas hint — shown in build mode when no components placed yet */}
          {buildMode && components.length === 0 && !isPlacingMode && (
            <div style={{
              position:      'absolute',
              inset:         0,
              zIndex:        5,
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              justifyContent:'center',
              gap:           12,
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 40, opacity: 0.25 }}>⬡</span>
              <span style={{ fontSize: 13, color: 'var(--text-sub)', fontWeight: 600 }}>
                {t('builder.canvas_empty_title')}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {t('builder.canvas_empty_body')}
              </span>
            </div>
          )}

          {/* Connection validation toast */}
          {connectError && (
            <div style={{
              position:     'absolute',
              bottom:       16,
              left:         '50%',
              transform:    'translateX(-50%)',
              zIndex:       30,
              background:   'color-mix(in srgb, var(--status-critical) 15%, var(--bg-crust))',
              border:       '1px solid var(--status-critical)',
              borderRadius: 6,
              padding:      '8px 16px',
              fontSize:     11,
              fontWeight:   600,
              color:        'var(--status-critical)',
              pointerEvents:'none',
              boxShadow:    'var(--glow-critical)',
              whiteSpace:   'nowrap',
              maxWidth:     400,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              ⚠ {connectError}
            </div>
          )}

          {/* FlowMap — fills the entire center column */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <FlowMap
              nodes={layoutNodes}
              edges={edges}
              onNodeClick={handleSelectComponent}
              onEdgeClick={buildMode ? handleEdgeClick : undefined}
              onPaneClick={isPlacingMode ? handlePaneClick : undefined}
              onSelectionChange={buildMode ? handleSelectionChange : undefined}
              onNodeContextMenu={buildMode ? handleNodeContextMenu : undefined}
              onConnect={buildMode ? handleConnect : undefined}
              onEdgeDelete={buildMode ? handleEdgeDelete : undefined}
              placingMode={isPlacingMode}
              builderMode={buildMode}
            />
          </div>

          {/* Context menu overlay */}
          {ctxMenu && (
            <BuilderContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              componentId={ctxMenu.componentId}
              onRename={handleCtxRename}
              onDuplicate={handleCtxDuplicate}
              onDelete={handleCtxDelete}
              onClose={closeCtxMenu}
            />
          )}

          {/* Placing hint banner — shows type name + instructions while in placing mode */}
          {isPlacingMode && builder.state.mode === 'placing' && (() => {
            const typeId = builder.state.pendingTypeId;
            const def    = typeId ? registry.get(typeId) : null;
            const label  = def?.label ?? typeId ?? '';
            return (
              <div style={{
                position:      'absolute',
                bottom:        16,
                left:          '50%',
                transform:     'translateX(-50%)',
                zIndex:        20,
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                background:    'var(--bg-crust)',
                border:        '1px solid var(--accent)',
                borderRadius:  8,
                padding:       '8px 18px',
                boxShadow:     '0 4px 20px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
                whiteSpace:    'nowrap',
              }}>
                <span style={{ fontSize: 14 }}>✛</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                  {label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                  — {t('builder.placing_hint').toLowerCase()}
                </span>
                <kbd style={{
                  fontSize:     10,
                  color:        'var(--text-dim)',
                  background:   'var(--bg-mantle)',
                  border:       '1px solid var(--border)',
                  borderRadius: 3,
                  padding:      '1px 5px',
                }}>
                  Esc
                </kbd>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t('builder.cancel').toLowerCase()}</span>
              </div>
            );
          })()}
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
              {buildMode
                ? (builder.state.mode === 'selected-component' && builder.state.selectedComponentId
                    ? (stores.graph.getComponents(projectId).find(c => c.id === (builder.state as { selectedComponentId: string }).selectedComponentId)?.name ?? t('builder.props_title'))
                    : t('builder.props_title'))
                : selectedComponentId
                  ? (stores.graph.getComponents(projectId).find(c => c.id === selectedComponentId)?.name ?? '')
                  : t('inspector.title')}
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

          {/* Inspector content: build mode panel OR monitor mode panel */}
          {buildMode ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <BuilderPropertyPanel
                projectId={projectId}
                stores={stores}
                registry={registry}
                onMutation={onMutation ?? (() => {})}
              />
            </div>
          ) : selectedComponentId ? (
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
