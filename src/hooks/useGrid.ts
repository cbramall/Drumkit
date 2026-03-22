import { useState, useCallback, useRef } from 'react';
import { INSTRUMENTS, STEPS, type InstrumentName } from '@/lib/audio-engine';
import type { Grid } from '@/lib/types';

export function createEmptyGrid(): Grid {
  const grid: Partial<Grid> = {};
  for (const inst of INSTRUMENTS) {
    grid[inst] = new Array(STEPS).fill(false);
  }
  return grid as Grid;
}

export function ensureFullGrid(partial: Partial<Grid>): Grid {
  const full: Partial<Grid> = { ...partial };
  for (const inst of INSTRUMENTS) {
    if (!full[inst]) full[inst] = new Array(STEPS).fill(false);
  }
  return full as Grid;
}

// Maximum number of history snapshots to retain
const MAX_HISTORY = 100;
// How long to wait after the last cell toggle before committing to history.
// This batches an entire drag-paint gesture into a single undo step.
const HISTORY_DEBOUNCE_MS = 400;

export function useGrid() {
  const [grid, setGridRaw] = useState<Grid>(createEmptyGrid);

  // History lives in refs so pushing/navigating doesn't cause re-renders.
  // Only canUndo/canRedo are reactive so the toolbar buttons stay in sync.
  const historyRef = useRef<Grid[]>([createEmptyGrid()]);
  const idxRef     = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncUndoRedo = useCallback(() => {
    setCanUndo(idxRef.current > 0);
    setCanRedo(idxRef.current < historyRef.current.length - 1);
  }, []);

  /** Flush any pending debounced snapshot and push `g` as a new history entry. */
  const commitToHistory = useCallback((g: Grid) => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    const next = historyRef.current.slice(0, idxRef.current + 1);
    next.push(g);
    if (next.length > MAX_HISTORY) next.shift();
    historyRef.current = next;
    idxRef.current = next.length - 1;
    syncUndoRedo();
  }, [syncUndoRedo]);

  /** Set the grid and immediately record it as a history entry (load / reset). */
  const setGrid = useCallback((g: Grid) => {
    setGridRaw(g);
    commitToHistory(g);
  }, [commitToHistory]);

  /**
   * Toggle a single cell. History is committed after a short debounce so that
   * an entire drag-paint gesture becomes a single undo step rather than one
   * entry per cell.
   */
  const toggleCell = useCallback((instrument: InstrumentName, step: number) => {
    setGridRaw((prev) => {
      const next = { ...prev, [instrument]: [...prev[instrument]] };
      next[instrument][step] = !next[instrument][step];
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        commitToHistory(next);
        debounceRef.current = null;
      }, HISTORY_DEBOUNCE_MS);
      return next;
    });
  }, [commitToHistory]);

  const resetGrid = useCallback(() => {
    const empty = createEmptyGrid();
    setGridRaw(empty);
    commitToHistory(empty);
  }, [commitToHistory]);

  const undo = useCallback(() => {
    // Cancel any pending debounce — the in-progress drag is discarded
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (idxRef.current <= 0) return;
    idxRef.current--;
    setGridRaw(historyRef.current[idxRef.current]);
    syncUndoRedo();
  }, [syncUndoRedo]);

  const redo = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (idxRef.current >= historyRef.current.length - 1) return;
    idxRef.current++;
    setGridRaw(historyRef.current[idxRef.current]);
    syncUndoRedo();
  }, [syncUndoRedo]);

  return { grid, setGrid, toggleCell, resetGrid, undo, redo, canUndo, canRedo };
}
