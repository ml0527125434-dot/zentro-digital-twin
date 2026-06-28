import React, { useEffect, useRef } from 'react';
import { useLocale } from '../../i18n/index.js';

export interface BuilderContextMenuProps {
  x:           number;
  y:           number;
  componentId: string;
  onRename:    () => void;
  onDuplicate: () => void;
  onDelete:    () => void;
  onClose:     () => void;
}

const ITEM_STYLE: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  gap:            8,
  padding:        '6px 12px',
  fontSize:       12,
  fontWeight:     500,
  color:          'var(--text-base)',
  cursor:         'pointer',
  borderRadius:   4,
  transition:     'background 0.1s',
  whiteSpace:     'nowrap',
  userSelect:     'none',
};

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...ITEM_STYLE,
        background: hover ? (danger ? 'rgba(239,68,68,0.12)' : 'var(--bg-mantle)') : 'transparent',
        color:      danger ? 'var(--status-critical)' : 'var(--text-base)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      {label}
    </div>
  );
}

export function BuilderContextMenu({ x, y, onRename, onDuplicate, onDelete, onClose }: BuilderContextMenuProps) {
  const { t } = useLocale();
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  const clampedX = Math.min(x, window.innerWidth  - 180);
  const clampedY = Math.min(y, window.innerHeight - 140);

  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('keydown',   handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('keydown',   handler, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Component actions"
      style={{
        position:     'fixed',
        left:         clampedX,
        top:          clampedY,
        zIndex:       1000,
        background:   'var(--bg-crust)',
        border:       '1px solid var(--border)',
        borderRadius: 8,
        boxShadow:    '0 8px 24px rgba(0,0,0,0.45)',
        padding:      '4px',
        minWidth:     160,
      }}
    >
      <MenuItem icon="✏" label={t('builder.rename_btn')}  onClick={() => { onRename();    onClose(); }} />
      <MenuItem icon="⎘"  label={t('builder.duplicate')}  onClick={() => { onDuplicate(); onClose(); }} />
      <div style={{ margin: '4px 8px', borderTop: '1px solid var(--border)' }} />
      <MenuItem icon="🗑" label={t('builder.delete_btn')} onClick={() => { onDelete();    onClose(); }} danger />
    </div>
  );
}
