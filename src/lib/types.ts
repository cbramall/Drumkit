import type { InstrumentName } from '@/lib/audio-engine';

export type Grid = Record<InstrumentName, boolean[]>;

export interface EffectValues {
  reverb: number;
  delay: number;
  dryWet: number;
  chorus: number;
  compression: number;
  cutoff: number;
  resonance: number;
  swing: number;
}

export type SavedBeat = { id?: string; grid: Grid; tempo: number; effects?: EffectValues | null };
