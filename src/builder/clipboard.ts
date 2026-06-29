/**
 * Zentro Digital Twin — Builder Clipboard (Stage 35, P0/P1)
 *
 * Pure helpers for copy/paste of a selection of components plus the connections
 * that live entirely WITHIN that selection. The executor (MissionControlView)
 * creates the new components through the Builder actions and remaps connection
 * endpoints to the freshly-created ids.
 */

import type { Component, Connection } from '../domain/types.js';

export interface ClipboardData {
  components: Component[];
  /** Only connections whose BOTH endpoints are in the copied selection. */
  connections: Connection[];
}

function clone<T>(v: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);
}

/**
 * Build clipboard data from the current graph and a set of selected ids.
 * Returns null when nothing usable is selected.
 */
export function copySelection(
  allComponents: Component[],
  allConnections: Connection[],
  selectedIds: string[],
): ClipboardData | null {
  const idSet = new Set(selectedIds);
  const components = allComponents.filter((c) => idSet.has(c.id)).map(clone);
  if (components.length === 0) return null;

  const connections = allConnections
    .filter((cn) => idSet.has(cn.fromComponentId) && idSet.has(cn.toComponentId))
    .map(clone);

  return { components, connections };
}

export interface PasteComponentPlan {
  /** id of the source component in the clipboard (for endpoint remapping). */
  sourceId: string;
  type: string;
  name: string;
  position: { x: number; y: number };
}

export interface PasteConnectionPlan {
  fromSourceId: string;
  fromPortId: string;
  toSourceId: string;
  toPortId: string;
  medium: Connection['medium'];
  direction: Connection['topologicalDirection'];
}

export interface PastePlan {
  components: PasteComponentPlan[];
  connections: PasteConnectionPlan[];
}

/**
 * Produce a paste plan: where each copied component should be created (offset
 * applied) and which internal connections to recreate. Names get a " (copy)"
 * suffix. The caller executes the plan and maps sourceId -> new id.
 */
export function planPaste(clipboard: ClipboardData, offset: number): PastePlan {
  const components: PasteComponentPlan[] = clipboard.components.map((c) => {
    const pos = c.position ?? { x: 60, y: 60 };
    return {
      sourceId: c.id,
      type: c.type,
      name: `${c.name} (copy)`,
      position: { x: pos.x + offset, y: pos.y + offset },
    };
  });

  const connections: PasteConnectionPlan[] = clipboard.connections.map((cn) => ({
    fromSourceId: cn.fromComponentId,
    fromPortId: cn.fromPortId,
    toSourceId: cn.toComponentId,
    toPortId: cn.toPortId,
    medium: cn.medium,
    direction: cn.topologicalDirection,
  }));

  return { components, connections };
}
