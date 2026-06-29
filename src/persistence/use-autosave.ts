/**
 * Zentro Digital Twin — useAutosave (Stage 35, P0-1)
 *
 * React glue that debounces snapshot saves through a ProjectRepository.
 * The component calls `requestSave()` after any mutation; saves coalesce so a
 * burst of edits results in a single write. Storage failures are swallowed
 * (autosave is best-effort and must never break the editing flow).
 *
 * The hook depends only on the ProjectRepository PORT and a capture callback —
 * it has no knowledge of localStorage, files, or any concrete backend.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { ProjectRepository } from './project-repository.js';
import type { ProjectSnapshot } from './project-snapshot.js';

export function useAutosave(
  repo: ProjectRepository | undefined,
  capture: () => ProjectSnapshot,
  debounceMs = 600,
): () => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(() => {
    if (!repo) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        void Promise.resolve(repo.save(captureRef.current())).catch(() => {
          /* best-effort autosave */
        });
      } catch {
        /* best-effort autosave */
      }
    }, debounceMs);
  }, [repo, debounceMs]);
}
