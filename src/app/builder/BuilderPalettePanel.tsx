/**
 * BuilderPalettePanel — left sidebar in Build Mode.
 *
 * Shows all registered component types grouped by category.
 * Supports text search. Selecting a type enters 'placing' mode.
 */

import React, { useState, useMemo } from 'react';
import type { ComponentRegistry, ComponentCategory } from '../../lib/component-registry.js';
import { getPaletteItems } from '../../builder/palette.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { useLocale } from '../../i18n/index.js';

const TYPE_ICON: Record<string, string> = {
  storage_tank:         '🛢',
  buffer_tank:          '🪣',
  expansion_vessel:     '⊕',
  heat_pump:            '♨',
  gas_backup:           '🔥',
  electric_heater:      '⚡',
  solar_collector:      '☀',
  plate_heat_exchanger: '⇄',
  recirc_pump:          '◎',
  variable_speed_pump:  '⟳',
  mixing_valve:         '⬡',
  control_valve:        '⊛',
  isolation_valve:      '🔒',
  safety_valve:         '🛡',
  temperature_sensor:   '🌡',
  pressure_sensor:      '⦿',
  flow_sensor:          '≋',
  energy_meter:         '⚡',
  water_meter:          '💧',
  filter:               '⊡',
  air_separator:        '⊞',
  distribution_manifold:'⊢',
  point_of_use:         '🚿',
  tap:                  '🚰',
};

const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  source:   'Heat Sources',
  storage:  'Storage',
  pump:     'Pumps',
  valve:    'Valves',
  sensor:   'Sensors',
  meter:    'Meters',
  consumer: 'Consumers',
  zone:     'Distribution',
  air:      'Auxiliary',
};

const CATEGORY_ORDER: ComponentCategory[] = [
  'source', 'storage', 'pump', 'valve', 'sensor', 'meter', 'consumer', 'zone', 'air',
];

export interface BuilderPalettePanelProps {
  registry: ComponentRegistry;
}

export function BuilderPalettePanel({ registry }: BuilderPalettePanelProps) {
  const { t } = useLocale();
  const { state, dispatchFsm } = useBuilder();
  const [search, setSearch] = useState('');

  const allItems = getPaletteItems(registry);

  const filtered = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(i =>
      i.label.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [allItems, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<ComponentCategory, typeof allItems>();
    for (const item of filtered) {
      const cat = item.category as ComponentCategory;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [filtered]);

  const isPlacing = state.mode === 'placing';
  const placingId = state.pendingTypeId ?? null;

  return (
    <div
      data-testid="builder-palette"
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        overflow:      'hidden',
      }}
    >
      {/* Search */}
      <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Search components…"
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{
            width:        '100%',
            background:   'var(--bg-base)',
            border:       '1px solid var(--border)',
            borderRadius: 4,
            color:        'var(--text-base)',
            fontSize:     11,
            padding:      '4px 8px',
            outline:      'none',
            boxSizing:    'border-box',
          }}
        />
      </div>

      {/* Placing mode banner */}
      {isPlacing && (
        <div
          data-testid="builder-placing-banner"
          style={{
            padding:      '6px 12px',
            background:   'color-mix(in srgb, var(--accent) 10%, var(--bg-crust))',
            borderBottom: '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            flexShrink:   0,
          }}
        >
          <span style={{ fontSize: 10, color: 'var(--accent)', flex: 1, lineHeight: 1.4 }}>
            {t('builder.placing_hint')}
          </span>
          <button
            data-testid="builder-cancel-placing"
            onClick={() => dispatchFsm({ type: 'CANCEL_PLACING' })}
            style={{
              background:   'var(--bg-mantle)',
              border:       '1px solid var(--border)',
              borderRadius: 3,
              color:        'var(--text-sub)',
              cursor:       'pointer',
              fontSize:     10,
              padding:      '2px 7px',
              flexShrink:   0,
            }}
          >
            {t('builder.cancel')}
          </button>
        </div>
      )}

      {/* Component list grouped by category */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
        {CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(cat => (
          <div key={cat}>
            {/* Category header */}
            <div style={{
              fontSize:      8,
              fontWeight:    800,
              color:         'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding:       '8px 4px 4px',
            }}>
              {CATEGORY_LABEL[cat]}
            </div>

            {/* Items in category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {grouped.get(cat)!.map(item => {
                const isActive = isPlacing && placingId === item.typeId;
                return (
                  <button
                    key={item.typeId}
                    data-testid={`palette-item-${item.typeId}`}
                    onClick={() => {
                      if (isPlacing && placingId === item.typeId) {
                        dispatchFsm({ type: 'CANCEL_PLACING' });
                      } else {
                        dispatchFsm({ type: 'START_PLACING', typeId: item.typeId });
                      }
                    }}
                    title={item.label}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          7,
                      padding:      '6px 8px',
                      background:   isActive
                        ? 'color-mix(in srgb, var(--accent) 15%, var(--bg-mantle))'
                        : 'var(--bg-mantle)',
                      border:       isActive
                        ? '1px solid color-mix(in srgb, var(--accent) 50%, var(--border))'
                        : '1px solid var(--border)',
                      borderRadius: 5,
                      color:        isActive ? 'var(--accent)' : 'var(--text-base)',
                      cursor:       'pointer',
                      fontSize:     11,
                      fontWeight:   isActive ? 700 : 500,
                      textAlign:    'start',
                      width:        '100%',
                      transition:   'background 0.12s, border-color 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0, opacity: isActive ? 1 : 0.8 }} aria-hidden="true">
                      {TYPE_ICON[item.typeId] ?? '⬡'}
                    </span>
                    <span style={{
                      fontWeight:   isActive ? 700 : 500,
                      fontSize:     11,
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                      flex:         1,
                    }}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize:  9,
                        fontWeight:800,
                        color:     'var(--accent)',
                        flexShrink:0,
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{
            padding:  '24px 8px',
            textAlign:'center',
            color:    'var(--text-dim)',
            fontSize: 11,
          }}>
            No components match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
