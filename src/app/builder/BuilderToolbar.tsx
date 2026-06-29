/**
 * BuilderToolbar — top engineering toolbar (Phase 2B, pid-spec §9.1 / §13.5).
 *
 * A 44px full-width toolbar of grouped, labelled, icon+text actions. Replaces the
 * tiny header mode toggle. Groups: Mode · File · Edit · Layout · View · Search,
 * separated by 1px dividers. Hebrew-first via i18n, RTL, tokens only, line icons
 * (no emoji — §13.3), and the full interaction-state set (§13.6).
 *
 * Pure & presentational: every action is a prop. The File group is a slot so the
 * existing PersistenceToolbar can be reused without duplicating persistence logic.
 */

import React, { useState } from 'react';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

// ── Line icons (1.5px stroke, 16px grid) ──────────────────────────────────────
const ICON: Record<string, React.ReactNode> = {
  monitor:    <><path d="M3 4h10v7H3z" /><path d="M6 13h4M8 11v2" /></>,
  build:      <><path d="M8 2l5 3v6l-5 3-5-3V5z" /><path d="M8 8l5-3M8 8v6M8 8L3 5" /></>,
  undo:       <><path d="M6 4L3 7l3 3" /><path d="M3 7h7a3 3 0 0 1 0 6H7" /></>,
  redo:       <><path d="M10 4l3 3-3 3" /><path d="M13 7H6a3 3 0 0 0 0 6h3" /></>,
  duplicate:  <><rect x="5.5" y="5.5" width="8" height="8" rx="1" /><path d="M10.5 5.5V3.5h-8v8h2" /></>,
  trash:      <><path d="M3.5 4.5h9" /><path d="M5.5 4.5V3h5v1.5M5 4.5l.5 9h5l.5-9" /></>,
  fit:        <><path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" /></>,
  arrange:    <><rect x="2.5" y="2.5" width="4" height="4" rx="1" /><rect x="9.5" y="2.5" width="4" height="4" rx="1" /><rect x="6" y="9.5" width="4" height="4" rx="1" /></>,
  grid:       <><path d="M2.5 6h11M2.5 10h11M6 2.5v11M10 2.5v11" /></>,
  search:     <><circle cx="7" cy="7" r="4" /><path d="M10 10l3.5 3.5" /></>,
};

function Icon({ name }: { name: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0 }}>
      {ICON[name]}
    </svg>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps {
  icon:     string;
  labelKey: TranslationKey;
  onClick?: () => void;
  active?:  boolean;
  disabled?: boolean;
  danger?:  boolean;
  testid?:  string;
}

function ToolBtn({ icon, labelKey, onClick, active, disabled, danger, testid }: BtnProps) {
  const { t } = useLocale();
  const [hov, setHov] = useState(false);
  const label = t(labelKey);

  const color = disabled ? 'var(--text-dim)'
    : active           ? 'var(--accent)'
    : danger && hov    ? 'var(--status-critical)'
    : hov              ? 'var(--text-base)'
    :                    'var(--text-sub)';

  const background = active ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
    : hov && !disabled ? 'var(--bg-mantle)'
    : 'transparent';

  return (
    <button
      type="button"
      data-testid={testid}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          6,
        height:       30,
        padding:      '0 9px',
        background,
        color,
        border:       active ? '1px solid color-mix(in srgb, var(--accent) 45%, transparent)' : '1px solid transparent',
        borderRadius: 6,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.4 : 1,
        fontSize:     12,
        fontWeight:   active ? 700 : 600,
        whiteSpace:   'nowrap',
        transition:   'background 0.12s, color 0.12s, border-color 0.12s',
        flexShrink:   0,
      }}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function Sep() {
  return <span aria-hidden="true" style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />;
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
export interface BuilderToolbarProps {
  mode:          'build' | 'monitor';
  onSetMode:     (mode: 'build' | 'monitor') => void;
  // Edit
  onUndo:        () => void;
  canUndo:       boolean;
  onRedo:        () => void;
  canRedo:       boolean;
  onDuplicate:   () => void;
  onDelete:      () => void;
  hasSelection:  boolean;
  // Layout
  onFit:         () => void;
  onAutoArrange?: (() => void) | undefined; // undefined → disabled (Phase 3 Stage F)
  // View
  gridVisible:   boolean;
  onToggleGrid:  () => void;
  // Search
  onSearch:      () => void;
  // File group slot (reuses the existing PersistenceToolbar)
  fileSlot?:     React.ReactNode;
}

export function BuilderToolbar(props: BuilderToolbarProps) {
  const { t } = useLocale();
  const {
    mode, onSetMode,
    onUndo, canUndo, onRedo, canRedo, onDuplicate, onDelete, hasSelection,
    onFit, onAutoArrange, gridVisible, onToggleGrid, onSearch, fileSlot,
  } = props;

  return (
    <div
      data-testid="builder-toolbar"
      role="toolbar"
      aria-label={t('app.title')}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          4,
        height:       44,
        padding:      '0 12px',
        background:   'var(--bg-crust)',
        borderBottom: '1px solid var(--border)',
        overflowX:    'auto',
        scrollbarWidth: 'none',
        flexShrink:   0,
      }}
    >
      {/* Mode */}
      <ToolBtn icon="build"   labelKey="builder.mode_build"   active={mode === 'build'}   onClick={() => onSetMode('build')}   testid="tb-mode-build" />
      <ToolBtn icon="monitor" labelKey="builder.mode_monitor" active={mode === 'monitor'} onClick={() => onSetMode('monitor')} testid="tb-mode-monitor" />

      <Sep />

      {/* File (reused PersistenceToolbar) */}
      {fileSlot}

      <Sep />

      {/* Edit */}
      <ToolBtn icon="undo"      labelKey="toolbar.undo"      onClick={onUndo}      disabled={!canUndo}      testid="tb-undo" />
      <ToolBtn icon="redo"      labelKey="toolbar.redo"      onClick={onRedo}      disabled={!canRedo}      testid="tb-redo" />
      <ToolBtn icon="duplicate" labelKey="toolbar.duplicate" onClick={onDuplicate} disabled={!hasSelection} testid="tb-duplicate" />
      <ToolBtn icon="trash"     labelKey="toolbar.delete"    onClick={onDelete}    disabled={!hasSelection} danger testid="tb-delete" />

      <Sep />

      {/* Layout */}
      <ToolBtn icon="fit"     labelKey="toolbar.fit"          onClick={onFit}        testid="tb-fit" />
      <ToolBtn icon="arrange" labelKey="toolbar.auto_arrange" onClick={onAutoArrange} disabled={!onAutoArrange} testid="tb-arrange" />

      <Sep />

      {/* View */}
      <ToolBtn icon="grid" labelKey="toolbar.grid" active={gridVisible} onClick={onToggleGrid} testid="tb-grid" />

      <Sep />

      {/* Search */}
      <ToolBtn icon="search" labelKey="toolbar.search" onClick={onSearch} testid="tb-search" />
    </div>
  );
}
