import { describe, it, expect } from 'vitest';
import { getPaletteItems, getPaletteItemsByCategory } from './palette.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';

function makeRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  return r;
}

describe('getPaletteItems', () => {
  it('returns at least one item per registered type', () => {
    const registry = makeRegistry();
    const items = getPaletteItems(registry);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBe(registry.listAll().length);
  });

  it('every item has typeId, label, category', () => {
    const items = getPaletteItems(makeRegistry());
    for (const item of items) {
      expect(typeof item.typeId).toBe('string');
      expect(item.typeId.length).toBeGreaterThan(0);
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.category).toBe('string');
      expect(item.category.length).toBeGreaterThan(0);
    }
  });

  it('results are sorted by category then label', () => {
    const items = getPaletteItems(makeRegistry());
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1]!;
      const curr = items[i]!;
      const catCmp = prev.category.localeCompare(curr.category);
      if (catCmp === 0) {
        expect(prev.label.localeCompare(curr.label)).toBeLessThanOrEqual(0);
      } else {
        expect(catCmp).toBeLessThanOrEqual(0);
      }
    }
  });

  it('returns empty array for empty registry', () => {
    const empty = createComponentRegistry();
    expect(getPaletteItems(empty)).toHaveLength(0);
  });
});

describe('getPaletteItemsByCategory', () => {
  it('groups items correctly — all typeIds present', () => {
    const registry = makeRegistry();
    const groups   = getPaletteItemsByCategory(registry);
    const allIds   = getPaletteItems(registry).map(i => i.typeId).sort();
    const grouped  = Object.values(groups).flat().map(i => i.typeId).sort();
    expect(grouped).toEqual(allIds);
  });

  it('each item is in the correct category key', () => {
    const groups = getPaletteItemsByCategory(makeRegistry());
    for (const [cat, items] of Object.entries(groups)) {
      for (const item of items) {
        expect(item.category).toBe(cat);
      }
    }
  });

  it('returns empty object for empty registry', () => {
    expect(getPaletteItemsByCategory(createComponentRegistry())).toEqual({});
  });
});
