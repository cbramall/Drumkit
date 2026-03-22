import { useState, useCallback } from 'react';
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

export function useGrid() {
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);

  const toggleCell = useCallback((instrument: InstrumentName, step: number) => {
    setGrid((prev) => {
      const next = { ...prev };
      next[instrument] = [...prev[instrument]];
      next[instrument][step] = !next[instrument][step];
      return next;
    });
  }, []);

  const resetGrid = useCallback(() => setGrid(createEmptyGrid()), []);

  return { grid, setGrid, toggleCell, resetGrid };
}
