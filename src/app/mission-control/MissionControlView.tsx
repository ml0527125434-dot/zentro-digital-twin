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

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { WorkspaceStatusBar } from './WorkspaceStatusBar.js';
import { AlarmBanner } from './AlarmBanner.js';
import { EquipmentGrid } from './EquipmentGrid.js';
import { EventTimeline } from './EventTimeline.js';
import { InspectorPanel } from '../workspace/InspectorPanel.js';
import { BuilderPalettePanel } from '../builder/BuilderPalettePanel.js';
import { BuilderPropertyPanel } from '../builder/BuilderPropertyPanel.js';
import { BuilderContextMenu } from '../builder/BuilderContextMenu.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { createGraphHistory, captureGraph, restoreGraph } from '../../builder/graph-history.js';
import { copySelection, planPaste, type ClipboardData } from '../../builder/clipboard.js';
import { validateConnectionDraft } from '../../builder/port-validator.js';
import { heComponentName } from '../../lib/component-he-names.js';
import { BuilderToolbar } from '../builder/BuilderToolbar.js';
import { PersistenceToolbar } from '../builder/PersistenceToolbar.js';
import type { ProjectRepository } from '../../persistence/project-repository.js';
import type { ProjectSnapshot } from '../../persistence/project-snapshot.js';

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
  onSetBuildMode?:     (build: boolean) => void;
  repo?:               ProjectRepository;
  captureProject?:     () => ProjectSnapshot;
  onEnterPresentation?: () => void;
  onToggleLocale?:     () => void;
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
  onSetBuildMode,
  repo,
  captureProject,
  onEnterPresentation,
  onToggleLocale,
}: MissionControlViewProps) {
  const { t } = useLocale();
  const builder = useBuilder();

  // Monitor-mode selection (independent of BuilderContext FSM)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [gridVisible,    setGridVisible]    = useState(true);
  const viewportRef = useRef<{ fitView: () => void } | null>(null);
  const [narrow, setNarrow] = useState(false);

  // Builder multi-select tracking (from React Flow selection events)
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(true);

  // Undo/redo history for the CONFIG graph (build mode)
  const historyRef = useRef(createGraphHistory(50));
  const lastVersionRef = useRef<number>(-1);
  const [toast, setToast] = useState<{ text: string; hint: boolean } | null>(null);
  const undoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Copy/paste clipboard (build mode)
  const clipboardRef = useRef<ClipboardData | null>(null);
  const pasteCountRef = useRef(0);

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

  const handlePaneClick = useCallback((pos?: { x: number; y: number }) => {
    if (!buildMode) return;
    if (builder.state.mode !== 'placing') return;
    const typeId = builder.state.pendingTypeId;
    if (!typeId) return;

    // Place at a staggered position; ELK will relayout automatically
    const existing = stores.graph.getComponents(projectId);
    const n = existing.length;
    // Place where the user clicked; fall back to a staggered slot.
    const position = pos ?? { x: 60 + (n % 4) * 160, y: 60 + Math.floor(n / 4) * 140 };

    // Auto-generate name: "Heat Pump 2" etc.
    const def = registry.get(typeId);
    const sameType = existing.filter(c => c.type === typeId).length;
    const name = `${heComponentName(typeId, def?.label ?? typeId)} ${sameType + 1}`;

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
      builder.deleteComponentCascade(ctxMenu.componentId);
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

  // Live connection validity — drives React Flow's valid/invalid target highlight
  const isValidConnection = useCallback(
    (c: { source: string | null; sourceHandle: string | null; target: string | null; targetHandle: string | null }) => {
      if (!c.source || !c.target) return false;
      const comps = stores.graph.getComponents(projectId);
      const from = comps.find(x => x.id === c.source);
      const to   = comps.find(x => x.id === c.target);
      if (!from || !to) return false;
      const fromDef  = registry.get(from.type);
      const fromPort = fromDef?.ports.find(pt => pt.id === (c.sourceHandle ?? ''));
      if (!fromPort) return false;
      return validateConnectionDraft(
        {
          fromComponentId: from.id, fromComponentType: from.type, fromPortId: c.sourceHandle ?? '',
          toComponentId: to.id, toComponentType: to.type, toPortId: c.targetHandle ?? '',
          medium: fromPort.medium,
        },
        registry,
        stores.graph.getConnections(projectId),
      ).valid;
    },
    [stores, registry, projectId],
  );

  // Drag-from-palette drop: place a new component at the drop position
  const handleDropComponent = useCallback((typeId: string, x: number, y: number) => {
    if (!buildMode) return;
    const def = registry.get(typeId);
    const existing = stores.graph.getComponents(projectId);
    const sameType = existing.filter(c => c.type === typeId).length;
    const name = `${heComponentName(typeId, def?.label ?? typeId)} ${sameType + 1}`;
    try {
      builder.placeComponent(typeId, name, { x, y });
      builder.dispatchFsm({ type: 'CANCEL_PLACING' });
      onMutation?.();
    } catch { /* ignore */ }
  }, [buildMode, registry, stores, projectId, builder, onMutation]);

  // Node drag-stop: persist new position to graph
  const handleNodeMoved = useCallback((nodeId: string, x: number, y: number) => {
    if (!buildMode) return;
    try {
      builder.moveComponent(nodeId, { x, y });
    } catch { /* ignore */ }
  }, [buildMode, builder]);

  // Edge deletion via Delete key on selected edge (from RF onEdgesDelete)
  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (!buildMode) return;
    try {
      builder.disconnectPorts(edgeId);
      builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
      onMutation?.();
    } catch { /* ignore */ }
  }, [buildMode, builder, onMutation]);

  // Node deletion via React Flow (Delete/Backspace on single or multi selection).
  // Cascade-removes each component with its pipes; the single authority for delete.
  const handleNodesDelete = useCallback((ids: string[]) => {
    if (!buildMode) return;
    for (const id of ids) {
      try { builder.deleteComponentCascade(id); } catch { /* skip */ }
    }
    builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
    setMultiSelectedIds([]);
    onMutation?.();
  }, [buildMode, builder, onMutation]);

  // Cleanup connect error timer on unmount
  useEffect(() => () => {
    if (connectErrorTimer.current) clearTimeout(connectErrorTimer.current);
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
  }, []);

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

  // Record undo history whenever a CONFIG mutation bumps the project version.
  // Undo/redo restore the GraphStore directly (no version bump), so they never
  // re-trigger this recorder.
  useEffect(() => {
    const v = stores.versions.current(projectId);
    if (lastVersionRef.current === -1) {
      historyRef.current.reset(captureGraph(stores, projectId));
      lastVersionRef.current = v;
      return;
    }
    if (v !== lastVersionRef.current) {
      lastVersionRef.current = v;
      historyRef.current.record(captureGraph(stores, projectId));
    }
  });

  const showToast = useCallback((text: string, hint: boolean) => {
    setToast({ text, hint });
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
    undoToastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  const showUndoToast = useCallback((msg: string) => showToast(msg, true), [showToast]);

  const doUndo = useCallback(() => {
    const snap = historyRef.current.undo();
    if (!snap) return;
    restoreGraph(stores, projectId, snap);
    builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
    onMutation?.();
    showUndoToast(t('builder.history_undone'));
  }, [stores, projectId, builder, onMutation, showUndoToast, t]);

  const doRedo = useCallback(() => {
    const snap = historyRef.current.redo();
    if (!snap) return;
    restoreGraph(stores, projectId, snap);
    builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
    onMutation?.();
    showUndoToast(t('builder.history_redone'));
  }, [stores, projectId, builder, onMutation, showUndoToast, t]);

  const doCopy = useCallback(() => {
    const ids = multiSelectedIds.length > 0
      ? multiSelectedIds
      : (builder.state.mode === 'selected-component' && builder.state.selectedComponentId
          ? [builder.state.selectedComponentId] : []);
    const cb = copySelection(
      stores.graph.getComponents(projectId),
      stores.graph.getConnections(projectId),
      ids,
    );
    if (!cb) return;
    clipboardRef.current = cb;
    pasteCountRef.current = 0;
    showToast(t('builder.copied'), false);
  }, [multiSelectedIds, builder, stores, projectId, showToast, t]);

  const doPaste = useCallback(() => {
    const cb = clipboardRef.current;
    if (!cb) return;
    const offset = 40 * (pasteCountRef.current + 1);
    pasteCountRef.current += 1;
    const plan = planPaste(cb, offset);
    const idMap = new Map<string, string>();
    for (const pc of plan.components) {
      try {
        const created = builder.placeComponent(pc.type, pc.name, pc.position);
        idMap.set(pc.sourceId, created.id);
      } catch { /* skip on failure */ }
    }
    for (const pn of plan.connections) {
      const from = idMap.get(pn.fromSourceId);
      const to = idMap.get(pn.toSourceId);
      if (!from || !to) continue;
      try {
        builder.connectPorts(
          { componentId: from, portId: pn.fromPortId },
          { componentId: to, portId: pn.toPortId },
          pn.medium, pn.direction,
        );
      } catch { /* skip invalid */ }
    }
    onMutation?.();
  }, [builder, onMutation]);

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

      // Ctrl+A → select all components
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setMultiSelectedIds(stores.graph.getComponents(projectId).map(c => c.id));
        builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
        return;
      }

      // Ctrl+C → copy selection ; Ctrl+V → paste
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault(); doCopy(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault(); doPaste(); return;
      }

      // Ctrl+Z → undo ; Ctrl+Shift+Z or Ctrl+Y → redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) doRedo(); else doUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        doRedo();
        return;
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
  }, [buildMode, builder, multiSelectedIds, onMutation, doUndo, doRedo, doCopy, doPaste, stores, projectId]);

  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  const { nodes, edges } = buildFlowGraph(components, connections, componentVMs, connectionVMs);
  const { layoutNodes, isReady } = useElkLayout(nodes, edges);

  // ── Stage F (§9 Stage F / pid-spec §6) — on-demand ELK auto-arrange ──────────
  // Build mode shows raw graph positions, so persisting the ELK result makes it
  // stick. ELK is dynamically imported (kept in its own lazy chunk, as elsewhere).
  const handleAutoArrange = useCallback(async () => {
    if (components.length === 0) return;
    const { computeElkLayout } = await import('../../renderer/elk-layout.js');
    const positions = await computeElkLayout(nodes, edges.map(e => ({ source: e.source, target: e.target })));
    let moved = false;
    for (const [id, pos] of positions) {
      try { builder.moveComponent(id, pos); moved = true; } catch { /* skip */ }
    }
    if (moved) onMutation?.();
  }, [components.length, nodes, edges, builder, onMutation]);

  const isPlacingMode = buildMode && builder.state.mode === 'placing';

  // Unified selection set: RF multi-selection + the FSM single selection.
  const selectedIds = useMemo(() => {
    const ids = new Set(multiSelectedIds);
    if (builder.state.mode === 'selected-component' && builder.state.selectedComponentId) {
      ids.add(builder.state.selectedComponentId);
    }
    return [...ids];
  }, [multiSelectedIds, builder.state.mode, builder.state.selectedComponentId]);

  // ── Toolbar (Phase 2B) action handlers — reuse existing builder operations ──
  const doDuplicateSel = useCallback(() => {
    for (const id of selectedIds) { try { builder.duplicateComponent(id); } catch { /* skip */ } }
    if (selectedIds.length) onMutation?.();
  }, [selectedIds, builder, onMutation]);

  const doDeleteSel = useCallback(() => {
    for (const id of selectedIds) { try { builder.deleteComponentCascade(id); } catch { /* skip */ } }
    builder.dispatchFsm({ type: 'CLEAR_SELECTION' });
    if (selectedIds.length) onMutation?.();
  }, [selectedIds, builder, onMutation]);

  const handleFit    = useCallback(() => { viewportRef.current?.fitView(); }, []);
  const handleSearch = useCallback(() => { document.dispatchEvent(new CustomEvent('zentro:builder:focusSearch')); }, []);

  // §9.6 — track a "narrow viewport" flag and let it *derive* panel visibility
  // (see showLeft/showRight). Below the threshold both side panels hide; above it
  // they reopen unless the user collapsed them manually — so widening always
  // restores them and we never overwrite the user's manual collapse state. The
  // centre canvas itself never collapses — its column keeps a hard minimum width.
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Presentation mode collapses both sidebars; manual toggles respected otherwise
  const showLeft  = !presentationMode && !leftCollapsed  && !narrow;
  const showRight = !presentationMode && !rightCollapsed && !narrow;

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
      {/* ── Top engineering toolbar (Phase 2B, §9.1) — build mode ── */}
      {buildMode && (
        <div style={{
          maxHeight:  presentationMode ? 0 : 44,
          overflow:   'hidden',
          flexShrink: 0,
          transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <BuilderToolbar
            mode="build"
            onSetMode={(m) => onSetBuildMode?.(m === 'build')}
            onUndo={doUndo}  canUndo={historyRef.current.canUndo()}
            onRedo={doRedo}  canRedo={historyRef.current.canRedo()}
            onDuplicate={doDuplicateSel} onDelete={doDeleteSel} hasSelection={selectedIds.length > 0}
            onFit={handleFit} onAutoArrange={handleAutoArrange}
            gridVisible={gridVisible} onToggleGrid={() => setGridVisible(v => !v)}
            onSearch={handleSearch}
            fileSlot={repo && captureProject ? <PersistenceToolbar repo={repo} capture={captureProject} /> : undefined}
            onPresent={onEnterPresentation ?? (() => {})}
            onToggleLang={onToggleLocale ?? (() => {})}
          />
        </div>
      )}

      {/* ── System Status Strip — hidden in build (toolbar+status bar cover it) & presentation ── */}
      <div style={{
        maxHeight:  (presentationMode || buildMode) ? 0 : 40,
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
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', width: '100%' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div
          data-testid="workspace-left"
          style={{
            flex:            `0 0 ${showLeft ? (buildMode ? 300 : 280) : 0}px`,
            width:           showLeft ? (buildMode ? 300 : 280) : 0,
            maxWidth:        showLeft ? (buildMode ? 300 : 280) : 0,
            overflow:        'hidden',
            transition:      'width 0.25s cubic-bezier(0.4,0,0.2,1), flex 0.25s cubic-bezier(0.4,0,0.2,1)',
            display:         'flex',
            flexDirection:   'column',
            background:      'var(--bg-crust)',
            borderInlineEnd: '1px solid var(--border)',
            minHeight:       0,
            minWidth:        0,
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
        <div style={{ flex: '1 1 0px', minWidth: 1, position: 'relative', overflow: 'hidden' }}>

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

          {/* ELK loading indicator (monitor only — build uses stored positions) */}
          {!buildMode && !isReady && (
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

          {/* Empty canvas — warm LEGO invitation */}
          {buildMode && components.length === 0 && !isPlacingMode && (
            <div style={{
              position:      'absolute',
              inset:         0,
              zIndex:        5,
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              justifyContent:'center',
              gap:           20,
              pointerEvents: 'none',
            }}>
              {/* Animated dashed drop target */}
              <svg width={160} height={160} viewBox="0 0 160 160" style={{ overflow: 'visible' }}>
                <circle
                  cx={80} cy={80} r={68}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth={2}
                  strokeDasharray="12 8"
                  opacity={0.35}
                  style={{ animation: 'emptyPulse 2s ease-in-out infinite' }}
                />
                <circle
                  cx={80} cy={80} r={50}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth={1.5}
                  strokeDasharray="8 6"
                  opacity={0.2}
                  style={{ animation: 'emptyPulse 2s ease-in-out infinite', animationDelay: '0.5s' }}
                />
                <text x={80} y={88} textAnchor="middle" fontSize={44} fill="#fb923c" opacity={0.45}
                  style={{ animation: 'emptyPulse 2s ease-in-out infinite' }}>
                  ⬡
                </text>
              </svg>
              <div style={{ textAlign: 'center', direction: 'rtl' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fb923c', opacity: 0.7, marginBottom: 6 }}>
                  גרור רכיב לכאן
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', opacity: 0.6 }}>
                  בחר מהרשימה משמאל ורשור ישירות אל הבד
                </div>
              </div>
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

          {buildMode && showShortcuts && (
            <div data-testid="builder-shortcuts-hint" style={{
              position: 'absolute', top: 12, insetInlineStart: '50%', transform: 'translateX(-50%)',
              zIndex: 25, display: 'flex', alignItems: 'center', gap: 10, maxWidth: '92%',
              background: 'var(--bg-crust)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 12px', fontSize: 11, color: 'var(--text-sub)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('builder.shortcuts_hint')}</span>
              <button
                data-testid="builder-shortcuts-dismiss"
                onClick={() => setShowShortcuts(false)}
                style={{ background: 'var(--bg-mantle)', border: '1px solid var(--border)', borderRadius: 4,
                  color: 'var(--text-base)', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '2px 8px', flexShrink: 0 }}
              >{t('builder.shortcuts_dismiss')}</button>
            </div>
          )}

          {toast && (
            <div data-testid="undo-toast" style={{
              position: 'absolute', bottom: 16, insetInlineStart: '50%', transform: 'translateX(-50%)',
              zIndex: 30, background: 'var(--bg-crust)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 600,
              color: 'var(--text-base)', display: 'flex', gap: 10, alignItems: 'center',
              pointerEvents: 'none', boxShadow: 'var(--shadow, 0 2px 8px rgba(0,0,0,0.3))',
            }}>
              <span>{toast.text}</span>
              {toast.hint && <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>Ctrl+Z / Ctrl+Y</span>}
            </div>
          )}

          {/* FlowMap — fills the entire center column */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <FlowMap
              nodes={buildMode ? nodes : layoutNodes}
              edges={edges}
              onNodeClick={handleSelectComponent}
              onEdgeClick={buildMode ? handleEdgeClick : undefined}
              onPaneClick={isPlacingMode ? handlePaneClick : undefined}
              onSelectionChange={buildMode ? handleSelectionChange : undefined}
              onNodeContextMenu={buildMode ? handleNodeContextMenu : undefined}
              onConnect={buildMode ? handleConnect : undefined}
              onEdgeDelete={buildMode ? handleEdgeDelete : undefined}
              onNodesDelete={buildMode ? handleNodesDelete : undefined}
              onNodeMoved={buildMode ? handleNodeMoved : undefined}
              onDropComponent={buildMode ? handleDropComponent : undefined}
              placingMode={isPlacingMode}
              isValidConnection={buildMode ? isValidConnection : undefined}
              selectedIds={buildMode ? selectedIds : undefined}
              builderMode={buildMode}
              gridVisible={gridVisible}
              onViewportReady={(api) => { viewportRef.current = api; }}
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
            const label  = typeId ? heComponentName(typeId, def?.label ?? typeId) : '';
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
            flex:              `0 0 ${showRight ? (buildMode ? 280 : 360) : 0}px`,
            width:             showRight ? (buildMode ? 280 : 360) : 0,
            maxWidth:          showRight ? (buildMode ? 280 : 360) : 0,
            overflow:          'hidden',
            transition:        'width 0.25s cubic-bezier(0.4,0,0.2,1), flex 0.25s cubic-bezier(0.4,0,0.2,1)',
            display:           'flex',
            flexDirection:     'column',
            background:        'var(--bg-crust)',
            borderInlineStart: '1px solid var(--border)',
            minHeight:         0,
            minWidth:          0,
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

      {/* ── Bottom status / validation bar (pid-spec §9.5) — collapses in presentation ── */}
      <div style={{
        maxHeight:  presentationMode ? 0 : 28,
        overflow:   'hidden',
        flexShrink: 0,
        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <WorkspaceStatusBar
          components={components}
          connections={connections}
          selectedCount={buildMode ? selectedIds.length : (selectedComponentId ? 1 : 0)}
        />
      </div>
    </div>
  );
}
