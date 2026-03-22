import type { InstrumentName } from '@/lib/audio-engine';

export type Grid = Record<InstrumentName, boolean[]>;

export type SavedBeat = { id?: string; grid: Grid; tempo: number };
