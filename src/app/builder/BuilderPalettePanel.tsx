/**
 * BuilderPalettePanel — LEGO-style visual component library.
 *
 * Design: category tabs → large visual cards → drag-to-canvas.
 * Hebrew-first. Touch-friendly. Zero technical jargon on the surface.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ComponentRegistry, ComponentCategory } from '../../lib/component-registry.js';
import { getPaletteItems } from '../../builder/palette.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

// ── Category meta ─────────────────────────────────────────────────────────────

interface CatMeta {
  icon:    string;
  accent:  string;
  bg:      string;
  labelHe: string;
  labelEn: string;
}

const CAT_META: Record<string, CatMeta> = {
  source:   { icon: '♨',  accent: '#fb923c', bg: '#2a1000', labelHe: 'מקורות', labelEn: 'Sources'  },
  storage:  { icon: '🛢', accent: '#60a5fa', bg: '#001230', labelHe: 'אגירה',  labelEn: 'Storage'  },
  pump:     { icon: '⚙',  accent: '#22d3ee', bg: '#001e2a', labelHe: 'משאבות', labelEn: 'Pumps'    },
  valve:    { icon: '⊛',  accent: '#c084fc', bg: '#1a0030', labelHe: 'שסתומים',labelEn: 'Valves'   },
  sensor:   { icon: '📡', accent: '#4ade80', bg: '#001a0a', labelHe: 'חיישנים',labelEn: 'Sensors'  },
  meter:    { icon: '📊', accent: '#facc15', bg: '#1a1200', labelHe: 'מדים',   labelEn: 'Meters'   },
  consumer: { icon: '🚿', accent: '#2dd4bf', bg: '#001a18', labelHe: 'צריכה',  labelEn: 'Consumers'},
  zone:     { icon: '🔀', accent: '#818cf8', bg: '#10103a', labelHe: 'הפצה',   labelEn: 'Zones'    },
  air:      { icon: '💨', accent: '#94a3b8', bg: '#0a0f1a', labelHe: 'עזר',    labelEn: 'Aux'      },
};

const CAT_ORDER: ComponentCategory[] = [
  'source', 'storage', 'pump', 'valve', 'sensor', 'meter', 'consumer', 'zone', 'air',
];

// ── Mini SVG icons (48×48) ────────────────────────────────────────────────────

function MiniIcon({ typeId, accent }: { typeId: string; accent: string }) {
  const dim = '#1e2938';

  switch (typeId) {
    case 'storage_tank':
    case 'buffer_tank':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <ellipse cx={24} cy={12} rx={17} ry={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={7} y={12} width={34} height={24} fill={dim} />
          <rect x={7} y={26} width={34} height={10} fill={accent} opacity="0.25" rx="1" />
          <ellipse cx={24} cy={36} rx={17} ry={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          <line x1={24} y1={36} x2={24} y2={44} stroke={accent} strokeWidth="2" opacity="0.6" />
          <text x={24} y={28} textAnchor="middle" fill={accent} fontSize="10" fontWeight="800">58°</text>
        </svg>
      );

    case 'expansion_vessel':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <ellipse cx={24} cy={24} rx={18} ry={20} fill={dim} stroke={accent} strokeWidth="1.5" />
          <line x1={6} y1={24} x2={42} y2={24} stroke={accent} strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
          <text x={24} y={20} textAnchor="middle" fill={accent} fontSize="8" opacity="0.7">AIR</text>
          <rect x={21} y={40} width={6} height={6} rx={2} fill={dim} stroke={accent} strokeWidth="1.2" />
        </svg>
      );

    case 'heat_pump':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={4} y={10} width={40} height={28} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={24} cy={24} r={8} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <path d="M18,24 C18,20 22,18 24,18 C26,18 30,20 30,24" fill="none" stroke={accent} strokeWidth="1.5" />
          <path d="M28,24 L32,24 M16,24 L12,24" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx={24} cy={24} r={2.5} fill={accent} />
        </svg>
      );

    case 'recirc_pump':
    case 'variable_speed_pump':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <circle cx={24} cy={24} r={19} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={24} cy={24} r={5} fill={accent} opacity="0.8" />
          {[0,90,180,270].map(deg => {
            const r = deg * Math.PI / 180;
            const x1 = 24 + Math.cos(r) * 5;
            const y1 = 24 + Math.sin(r) * 5;
            const x2 = 24 + Math.cos(r + 0.5) * 14;
            const y2 = 24 + Math.sin(r + 0.5) * 14;
            return <path key={deg} d={`M${x1},${y1} Q${x2},${y2} ${x2},${y2}`}
              fill={accent} opacity="0.6" stroke="none" />;
          })}
          <circle cx={24} cy={24} r={13} fill="none" stroke={accent} strokeWidth="0.8" opacity="0.3" />
        </svg>
      );

    case 'mixing_valve':
    case 'control_valve':
    case 'isolation_valve':
    case 'safety_valve': {
      const isOpen = typeId !== 'isolation_valve';
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <polygon points="6,10 6,38 22,24" fill={isOpen ? accent : dim}
            stroke={accent} strokeWidth="1.5" opacity={isOpen ? 0.8 : 0.6} />
          <polygon points="42,10 42,38 26,24" fill={dim}
            stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <circle cx={24} cy={24} r={4} fill={accent} />
          <line x1={24} y1={8} x2={24} y2={16} stroke={accent} strokeWidth="2" opacity="0.6" />
        </svg>
      );
    }

    case 'temperature_sensor':
    case 'pressure_sensor':
    case 'flow_sensor':
    case 'energy_meter':
    case 'water_meter': {
      const color =
        typeId === 'temperature_sensor' ? '#f97316' :
        typeId === 'pressure_sensor'    ? '#818cf8' :
        typeId === 'flow_sensor'        ? '#22d3ee' :
        typeId === 'energy_meter'       ? '#facc15' :
        '#60a5fa';
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <circle cx={24} cy={26} r={18} fill={dim} stroke={color} strokeWidth="1.5" />
          <path d={`M 9,34 A 18,18 0 1,1 39,34`} fill="none" stroke={dim} strokeWidth="5" />
          <path d={`M 9,34 A 18,18 0 0,1 ${24 + 18 * Math.cos(Math.PI * 0.7)},${26 + 18 * Math.sin(Math.PI * 0.7)}`}
            fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
          <line x1={24} y1={26} x2={24} y2={14} stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.9"
            style={{ transformOrigin: '24px 26px', transform: 'rotate(-30deg)' }} />
          <circle cx={24} cy={26} r={3} fill={color} />
          <text x={24} y={42} textAnchor="middle" fill={color} fontSize="7" fontWeight="700">
            {typeId === 'temperature_sensor' ? '°C' : typeId === 'pressure_sensor' ? 'bar' : typeId === 'flow_sensor' ? 'ℓ/m' : typeId === 'energy_meter' ? 'kWh' : 'm³'}
          </text>
        </svg>
      );
    }

    case 'gas_backup':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={10} y={14} width={28} height={28} rx={4} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[20,26,32].map(y => (
            <line key={y} x1={10} y1={y} x2={38} y2={y} stroke={accent} strokeWidth="0.8" opacity="0.3" />
          ))}
          <path d="M24,28 C20,22 18,18 22,14 C20,18 26,18 24,14 C28,18 26,22 28,26 C26,24 22,24 24,28 Z"
            fill={accent} opacity="0.85" />
          <path d="M24,28 C22,25 23,22 24.5,20 C23.5,22 25.5,22 24.5,20 C26,22 25,25 24,28 Z"
            fill="#fff" opacity="0.5" />
        </svg>
      );

    case 'electric_heater':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={4} y={12} width={40} height={28} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[20,28,36].map((y, i) => {
            const fromL = i % 2 === 0;
            return (
              <g key={y}>
                <line x1={10} y1={y} x2={38} y2={y} stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                {i < 2 && (
                  <path d={fromL
                    ? `M38,${y} A4,4 0 0,1 38,${y+8}`
                    : `M10,${y} A4,4 0 0,0 10,${y+8}`}
                    fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                )}
              </g>
            );
          })}
          <text x={24} y={10} textAnchor="middle" fill={accent} fontSize="9">⚡</text>
        </svg>
      );

    case 'solar_collector':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={4} y={10} width={40} height={30} rx={3} fill={dim} stroke="#fbbf24" strokeWidth="1.5" />
          {[10,17,24,31,38].map(x => (
            <rect key={x} x={x} y={12} width={5} height={26} rx={2.5}
              fill="#fbbf24" opacity="0.5" />
          ))}
          <text x={24} y={30} textAnchor="middle" fill="#fbbf24" fontSize="16" opacity="0.85">☀</text>
        </svg>
      );

    case 'plate_heat_exchanger':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={4} y={10} width={40} height={28} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[16,22,28,34].map((x, i) => (
            <rect key={x} x={x} y={13} width={5} height={22} rx={2}
              fill={i % 2 === 0 ? '#38bdf8' : '#f97316'} opacity="0.55" />
          ))}
          <path d="M4,20 L14,20 M34,20 L44,20" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" />
          <path d="M4,28 L14,28 M34,28 L44,28" stroke="#f97316" strokeWidth="1.5" opacity="0.7" />
        </svg>
      );

    case 'filter':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={6} y={14} width={36} height={20} rx={4} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[14,19,24,29,34].map(x => (
            <line key={x} x1={x} y1={16} x2={x} y2={32} stroke={accent} strokeWidth="1" opacity="0.5" />
          ))}
          <rect x={0} y={20} width={8} height={8} rx={2} fill={dim} stroke={accent} strokeWidth="1" />
          <rect x={40} y={20} width={8} height={8} rx={2} fill={dim} stroke={accent} strokeWidth="1" />
        </svg>
      );

    case 'air_separator':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={14} y={12} width={20} height={28} rx={4} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={20} cy={28} r={3} fill="none" stroke={accent} strokeWidth="1.2" opacity="0.7" />
          <circle cx={28} cy={24} r={2} fill="none" stroke={accent} strokeWidth="1.2" opacity="0.5" />
          <circle cx={23} cy={32} r={1.5} fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
          <rect x={22} y={4} width={4} height={10} rx={2} fill={dim} stroke={accent} strokeWidth="1.2" opacity="0.8" />
          <path d="M24,3 L24,0 M22,2 L24,0 L26,2" stroke={accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <rect x={4} y={20} width={10} height={8} rx={2} fill={dim} stroke={accent} strokeWidth="1" />
          <rect x={34} y={20} width={10} height={8} rx={2} fill={dim} stroke={accent} strokeWidth="1" />
        </svg>
      );

    case 'distribution_manifold':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={4} y={10} width={40} height={10} rx={4} fill={dim} stroke="#f97316" strokeWidth="1.5" />
          {[12,24,36].map(x => (
            <g key={x}>
              <line x1={x} y1={20} x2={x} y2={34} stroke="#f97316" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <circle cx={x} cy={34} r={2.5} fill="#f97316" opacity="0.6" />
            </g>
          ))}
          <rect x={4} y={38} width={40} height={8} rx={4} fill={dim} stroke="#38bdf8" strokeWidth="1.5" />
        </svg>
      );

    case 'point_of_use':
    case 'tap':
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <circle cx={24} cy={22} r={18} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={16} y={12} width={16} height={7} rx={2} fill={dim} stroke={accent} strokeWidth="1.2" opacity="0.9" />
          {[-8,0,8].map((dx, i) => (
            <ellipse key={i} cx={24 + dx} cy={33} rx={2} ry={3}
              fill={accent} opacity="0.7"
              style={{ animation: `dropFall 1.2s ease-in infinite`, animationDelay: `${i * 0.25}s` }} />
          ))}
        </svg>
      );

    default:
      return (
        <svg width={48} height={48} viewBox="0 0 48 48">
          <rect x={8} y={8} width={32} height={32} rx={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <text x={24} y={29} textAnchor="middle" fill={accent} fontSize="16">⬡</text>
        </svg>
      );
  }
}

// ── Component card ────────────────────────────────────────────────────────────

interface CardProps {
  typeId:   string;
  label:    string;
  meta:     CatMeta;
  isActive: boolean;
  onSelect: (typeId: string) => void;
}

function ComponentCard({ typeId, label, meta, isActive, onSelect }: CardProps) {
  const [hovered, setHovered] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/zentro-type', typeId);
    e.dataTransfer.effectAllowed = 'copy';
    // Create a compact drag ghost
    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position:absolute', 'top:-1000px', 'left:-1000px',
      `background:${meta.bg}`,
      `border:2px solid ${meta.accent}`,
      'border-radius:8px', 'padding:6px 12px',
      'color:' + meta.accent,
      'font-size:12px', 'font-weight:700',
      'white-space:nowrap',
      'font-family:inherit',
    ].join(';');
    ghost.textContent = label;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, 20);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }, [typeId, label, meta]);

  const ring  = isActive ? meta.accent : hovered ? meta.accent + 'aa' : meta.accent + '22';
  const glow  = isActive
    ? `0 0 0 2px ${meta.accent}66, 0 0 20px ${meta.accent}33`
    : hovered
    ? `0 0 0 1px ${meta.accent}55, 0 0 14px ${meta.accent}22`
    : 'none';
  const bgFill = isActive
    ? `linear-gradient(145deg, ${meta.bg} 0%, color-mix(in srgb, ${meta.accent} 10%, #0a0e17) 100%)`
    : `linear-gradient(145deg, ${meta.bg} 0%, #0a0e17 80%)`;

  return (
    <div
      draggable
      data-testid={`palette-item-${typeId}`}
      onDragStart={handleDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(typeId)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            6,
        padding:        '12px 6px 10px',
        background:     bgFill,
        border:         `1.5px solid ${ring}`,
        borderRadius:   10,
        cursor:         'grab',
        transition:     'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease',
        transform:      hovered || isActive ? 'translateY(-2px) scale(1.03)' : 'none',
        boxShadow:      glow,
        userSelect:     'none',
        WebkitUserSelect:'none',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Active pip */}
      {isActive && (
        <div style={{
          position:     'absolute',
          top:          5,
          insetInlineStart: 5,
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   meta.accent,
          boxShadow:    `0 0 6px ${meta.accent}`,
        }} />
      )}

      {/* Category color stripe at top */}
      <div style={{
        position:        'absolute',
        top:             0,
        left:            0,
        right:           0,
        height:          3,
        background:      meta.accent,
        opacity:         isActive ? 1 : hovered ? 0.8 : 0.4,
        borderRadius:    '9px 9px 0 0',
        transition:      'opacity 0.15s',
      }} />

      {/* Icon */}
      <div style={{ lineHeight: 0, opacity: isActive ? 1 : hovered ? 0.95 : 0.8, transition: 'opacity 0.15s' }}>
        <MiniIcon typeId={typeId} accent={meta.accent} />
      </div>

      {/* Label */}
      <div style={{
        fontSize:     11,
        fontWeight:   700,
        color:        isActive ? meta.accent : hovered ? meta.accent : 'var(--text-base)',
        textAlign:    'center',
        lineHeight:   1.25,
        transition:   'color 0.15s',
        maxWidth:     '100%',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
        direction:    'rtl',
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Category tab ──────────────────────────────────────────────────────────────

function CategoryTab({
  catId, meta, isActive, onClick,
}: { catId: string; meta: CatMeta; isActive: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            3,
        padding:        '8px 10px 6px',
        background:     isActive
          ? `linear-gradient(180deg, ${meta.bg} 0%, color-mix(in srgb, ${meta.accent} 12%, #0a0e17) 100%)`
          : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        border:         'none',
        borderRadius:   8,
        cursor:         'pointer',
        color:          isActive ? meta.accent : hovered ? 'var(--text-base)' : 'var(--text-dim)',
        transition:     'background 0.15s, color 0.15s, transform 0.12s',
        transform:      isActive ? 'scale(1.05)' : 'none',
        flexShrink:     0,
        minWidth:       56,
        outline:        isActive ? `1px solid ${meta.accent}44` : 'none',
        outlineOffset:  '-1px',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{meta.icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
        {meta.labelHe}
      </span>
    </button>
  );
}

// ── Main palette ──────────────────────────────────────────────────────────────

export interface BuilderPalettePanelProps {
  registry: ComponentRegistry;
}

export function BuilderPalettePanel({ registry }: BuilderPalettePanelProps) {
  const { t } = useLocale();
  const { state, dispatchFsm } = useBuilder();
  const [activeCat, setActiveCat] = useState<string>(CAT_ORDER[0]!);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const allItems = getPaletteItems(registry);

  // Search filter (category is handled via CSS visibility on each card)
  const searchItems = useMemo(() => {
    if (!searchQuery.trim()) return null; // null = show all by category
    const q = searchQuery.toLowerCase();
    return new Set(allItems
      .filter(i => i.label.toLowerCase().includes(q) || i.typeId.toLowerCase().includes(q))
      .map(i => i.typeId)
    );
  }, [allItems, searchQuery]);

  // Whether a given item is visible (used for empty state detection)
  const isVisible = useCallback((item: { typeId: string; category: string }) => {
    if (searchItems !== null) return searchItems.has(item.typeId);
    return item.category === activeCat;
  }, [searchItems, activeCat]);

  const visibleCount = useMemo(() => allItems.filter(isVisible).length, [allItems, isVisible]);

  // Available categories that have items
  const availableCats = useMemo(() => {
    const hasCat = new Set(allItems.map(i => i.category));
    return CAT_ORDER.filter(c => hasCat.has(c));
  }, [allItems]);

  const isPlacing = state.mode === 'placing';
  const placingId = state.pendingTypeId ?? null;

  const handleSelect = useCallback((typeId: string) => {
    if (isPlacing && placingId === typeId) {
      dispatchFsm({ type: 'CANCEL_PLACING' });
    } else {
      dispatchFsm({ type: 'START_PLACING', typeId });
    }
  }, [isPlacing, placingId, dispatchFsm]);

  const toggleSearch = useCallback(() => {
    setSearchOpen(v => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 50);
      else setSearchQuery('');
      return !v;
    });
  }, []);

  return (
    <div
      data-testid="builder-palette"
      style={{
        display:        'flex',
        flexDirection:  'column',
        height:         '100%',
        overflow:       'hidden',
        background:     '#060a10',
      }}
    >

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        padding:        '10px 12px 8px',
        borderBottom:   '1px solid var(--border)',
        flexShrink:     0,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize:    14,
            fontWeight:  800,
            color:       'var(--text-base)',
            direction:   'rtl',
            letterSpacing: '-0.01em',
          }}>
            {t('builder.lego_title')}
          </div>
          {!isPlacing && (
            <div style={{
              fontSize:    10,
              color:       'var(--text-dim)',
              marginTop:   1,
              direction:   'rtl',
            }}>
              {t('builder.lego_hint')}
            </div>
          )}
          {isPlacing && (
            <div style={{
              fontSize:    10,
              color:       '#fb923c',
              fontWeight:  700,
              marginTop:   1,
              direction:   'rtl',
              animation:   'emptyPulse 1.4s ease-in-out infinite',
            }}>
              ✦ {t('builder.placing_hint')}
            </div>
          )}
        </div>

        {/* Search toggle */}
        <button
          onClick={toggleSearch}
          aria-label="Search"
          title="חיפוש"
          style={{
            background:   searchOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
            border:       '1px solid var(--border)',
            borderRadius: 6,
            color:        searchOpen ? 'var(--text-base)' : 'var(--text-dim)',
            cursor:       'pointer',
            fontSize:     14,
            padding:      '4px 7px',
            lineHeight:   1,
            transition:   'background 0.15s, color 0.15s',
            flexShrink:   0,
          }}
        >
          🔍
        </button>
      </div>

      {/* ── Search bar (collapsible) ────────────────────────────────────── */}
      <div style={{
        maxHeight:    searchOpen ? 48 : 0,
        overflow:     'hidden',
        transition:   'max-height 0.2s cubic-bezier(0.4,0,0.2,1)',
        flexShrink:   0,
      }}>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
          <input
            ref={searchRef}
            type="search"
            placeholder={t('builder.palette_search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.currentTarget.value)}
            style={{
              width:        '100%',
              background:   'rgba(255,255,255,0.04)',
              border:       '1px solid var(--border)',
              borderRadius: 6,
              color:        'var(--text-base)',
              fontSize:     12,
              padding:      '5px 10px',
              outline:      'none',
              boxSizing:    'border-box',
              direction:    'rtl',
            }}
          />
        </div>
      </div>

      {/* ── Category tabs ─────────────────────────────────────────────── */}
      {!searchQuery && (
        <div
          ref={tabsRef}
          data-testid="palette-category-tabs"
          style={{
            display:        'flex',
            flexDirection:  'row',
            gap:            2,
            padding:        '6px 6px 4px',
            overflowX:      'auto',
            flexShrink:     0,
            borderBottom:   '1px solid var(--border)',
            scrollbarWidth: 'none',
          }}
        >
          {availableCats.map(cat => (
            <CategoryTab
              key={cat}
              catId={cat}
              meta={CAT_META[cat] ?? CAT_META['air']!}
              isActive={activeCat === cat}
              onClick={() => setActiveCat(cat)}
            />
          ))}
        </div>
      )}

      {/* ── Placing-mode cancel banner ─────────────────────────────────── */}
      {isPlacing && (
        <div
          data-testid="builder-placing-banner"
          style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent:'space-between',
            gap:          8,
            padding:      '6px 12px',
            background:   'rgba(251,146,60,0.08)',
            borderBottom: '1px solid rgba(251,146,60,0.2)',
            flexShrink:   0,
          }}
        >
          <span style={{ fontSize: 10, color: '#fb923c', fontWeight: 600, direction: 'rtl' }}>
            {t('builder.lego_active_hint')}
          </span>
          <button
            data-testid="builder-cancel-placing"
            onClick={() => dispatchFsm({ type: 'CANCEL_PLACING' })}
            style={{
              background:   'rgba(251,146,60,0.1)',
              border:       '1px solid rgba(251,146,60,0.3)',
              borderRadius: 5,
              color:        '#fb923c',
              cursor:       'pointer',
              fontSize:     10,
              fontWeight:   700,
              padding:      '2px 8px',
              flexShrink:   0,
            }}
          >
            {t('builder.cancel')} ✕
          </button>
        </div>
      )}

      {/* ── Card grid ──────────────────────────────────────────────────── */}
      <div style={{
        flex:            1,
        overflowY:       'auto',
        overflowX:       'hidden',
        padding:         '10px 8px 16px',
        display:         'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridAutoRows:    'min-content',
        gap:             8,
        alignContent:    'start',
        scrollbarWidth:  'thin',
        scrollbarColor:  'rgba(255,255,255,0.06) transparent',
      }}>
        {allItems.map(item => {
          const meta = CAT_META[item.category] ?? CAT_META['air']!;
          const show = isVisible(item);
          // Hidden items stay in DOM (for data-testid accessibility) but invisible
          if (!show) {
            return (
              <div key={item.typeId} style={{ display: 'none' }}>
                <ComponentCard
                  typeId={item.typeId}
                  label={item.label}
                  meta={meta}
                  isActive={false}
                  onSelect={handleSelect}
                />
              </div>
            );
          }
          return (
            <ComponentCard
              key={item.typeId}
              typeId={item.typeId}
              label={item.label}
              meta={meta}
              isActive={isPlacing && placingId === item.typeId}
              onSelect={handleSelect}
            />
          );
        })}

        {visibleCount === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            padding:    '32px 16px',
            textAlign:  'center',
            color:      'var(--text-dim)',
            fontSize:   12,
            direction:  'rtl',
          }}>
            {t('builder.palette_no_match')}
          </div>
        )}
      </div>

      {/* ── Footer: drag hint ──────────────────────────────────────────── */}
      <div style={{
        padding:      '6px 12px',
        borderTop:    '1px solid var(--border)',
        flexShrink:   0,
        fontSize:     9,
        color:        'var(--text-dim)',
        textAlign:    'center',
        direction:    'rtl',
        letterSpacing:'0.02em',
      }}>
        {t('builder.lego_drag_tip')}
      </div>
    </div>
  );
}
