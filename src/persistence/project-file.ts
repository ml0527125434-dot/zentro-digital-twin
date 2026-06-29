/**
 * Zentro Digital Twin — Project file import/export (Stage 35, P0-1)
 *
 * Browser-side helpers to move a ProjectSnapshot in and out of a `.zentro.json`
 * file. The encode/decode logic lives in `project-snapshot.ts` (pure); this file
 * only handles the browser interactions (Blob download, File read), so the core
 * stays testable without a DOM.
 */

import {
  snapshotToJson,
  snapshotFromJson,
  type ProjectSnapshot,
} from './project-snapshot.js';

export const PROJECT_FILE_EXTENSION = '.zentro.json';

/** Build a safe download filename from the project name. */
export function suggestFileName(snapshot: ProjectSnapshot): string {
  const base = (snapshot.project.name || snapshot.project.id || 'zentro-project')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'zentro-project'}${PROJECT_FILE_EXTENSION}`;
}

/**
 * Trigger a browser download of the snapshot as pretty-printed JSON.
 * Returns the filename used. No-throw guard for non-DOM environments.
 */
export function downloadSnapshot(
  snapshot: ProjectSnapshot,
  fileName: string = suggestFileName(snapshot),
): string {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    throw new Error('downloadSnapshot requires a browser environment.');
  }
  const json = snapshotToJson(snapshot);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on next tick so the click has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return fileName;
}

/**
 * Read a user-picked File and parse it into a validated ProjectSnapshot.
 * Rejects (via thrown SnapshotError) on invalid JSON or shape.
 */
export async function readSnapshotFromFile(file: File): Promise<ProjectSnapshot> {
  const text = await file.text();
  return snapshotFromJson(text);
}
