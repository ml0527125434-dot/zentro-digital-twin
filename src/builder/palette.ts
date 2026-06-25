/**
 * Zentro Digital Twin — Component Palette (Stage 5A)
 *
 * Pure data model derived from ComponentRegistry.
 * Returns palette items for the builder UI to render.
 * No React, no rendering, no TELEMETRY, no COMMAND.
 */

import type { ComponentRegistry } from '../lib/component-registry.js';

export interface PaletteItem {
  typeId:    string;
  label:     string;
  category:  string;
}

/**
 * Returns all registered components as palette items, sorted by category then label.
 */
export function getPaletteItems(registry: ComponentRegistry): PaletteItem[] {
  return registry
    .listAll()
    .map(def => ({
      typeId:   def.typeId,
      label:    def.label,
      category: def.category,
    }))
    .sort((a, b) =>
      a.category.localeCompare(b.category) || a.label.localeCompare(b.label),
    );
}

/**
 * Returns palette items grouped by category.
 * Keys are category names; values are sorted arrays of items within that category.
 */
export function getPaletteItemsByCategory(
  registry: ComponentRegistry,
): Record<string, PaletteItem[]> {
  const items = getPaletteItems(registry);
  const groups: Record<string, PaletteItem[]> = {};

  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }

  return groups;
}
