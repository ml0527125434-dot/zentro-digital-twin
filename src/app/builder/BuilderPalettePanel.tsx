/**
 * BuilderPalettePanel — left sidebar in Build Mode.
 *
 * Shows the six hot-water component types as clickable palette cards.
 * Selecting a type enters 'placing' mode in the BuilderContext FSM.
 * Stage 30.
 */

import React from 'react';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import { getPaletteItems } from '../../builder/palette.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { useLocale } from '../../i18n/index.js';

// Restrict palette to the six hot-water types (Stage 30 scope)
const HOT_WATER_TYPE_IDS = new Set([
  'storage_tank',
  'heat_pump',
  'recirc_pump',
  'mixing_valve',
  'gas_backup',
  'point_of_use',
]);

const TYPE_ICON: Record<string, string> = {
  storage_tank: '🛢',
  heat_pump:    '♨',
  gas_backup:   '🔥',
  recirc_pump:  '◎',
  mixing_valve: '⬡',
  point_of_use: '🚿',
};

export interface BuilderPalettePanelProps {
  registry: ComponentRegistry;
}

export function BuilderPalettePanel({ registry }: BuilderPalettePanelProps) {
  const { t } = useLocale();
  const { state, dispatchFsm } = useBuilder();

  const items = getPaletteItems(registry).filter(i => HOT_WATER_TYPE_IDS.has(i.typeId));

  const isPlacing  = state.mode === 'placing';
  const placingId  = state.pendingTypeId ?? null;

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
      {/* Panel header */}
      <div style={{
        padding:       '8px 12px 6px',
        borderBottom:  '1px solid var(--border)',
        flexShrink:    0,
      }}>
        <span style={{
          fontSize:      9,
          fontWeight:    800,
          color:         'var(--text-sub)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {t('builder.palette_title')}
        </span>
      </div>

      {/* Placing mode banner */}
      {isPlacing && (
        <div
          data-testid="builder-placing-banner"
          style={{
            padding:     '6px 12px',
            background:  'color-mix(in srgb, var(--accent) 10%, var(--bg-crust))',
            borderBottom:'1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
            display:     'flex',
            alignItems:  'center',
            gap:         8,
            flexShrink:  0,
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

      {/* Palette cards */}
      <div style={{
        flex:          1,
        overflowY:     'auto',
        padding:       '8px',
        display:       'flex',
        flexDirection: 'column',
        gap:           5,
      }}>
        {items.map(item => {
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
                gap:          8,
                padding:      '8px 10px',
                background:   isActive
                  ? 'color-mix(in srgb, var(--accent) 15%, var(--bg-mantle))'
                  : 'var(--bg-mantle)',
                border:       isActive
                  ? '1px solid color-mix(in srgb, var(--accent) 50%, var(--border))'
                  : '1px solid var(--border)',
                borderRadius: 'var(--card-radius)',
                color:        isActive ? 'var(--accent)' : 'var(--text-base)',
                cursor:       'pointer',
                fontSize:     11,
                fontWeight:   isActive ? 700 : 500,
                textAlign:    'start',
                width:        '100%',
                transition:   'background 0.15s, border-color 0.15s',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
                {TYPE_ICON[item.typeId] ?? '⬡'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{
                  fontWeight:   isActive ? 700 : 600,
                  fontSize:     11,
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                  {item.category}
                </span>
              </div>
              {isActive && (
                <span style={{
                  marginInlineStart: 'auto',
                  fontSize:          9,
                  fontWeight:        800,
                  color:             'var(--accent)',
                  flexShrink:        0,
                }}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
