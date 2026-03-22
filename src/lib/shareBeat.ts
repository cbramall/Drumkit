import { INSTRUMENTS } from '@/lib/audio-engine';
import type { Grid, EffectValues } from '@/lib/types';

// ─── Compact share encoding ──────────────────────────────────────
//
// Beat data is packed into a URL-safe base64 string:
//   { g: Record<inst, bitmask16>, t: tempo, e: EffectValues }
//
// Each instrument row of 16 booleans becomes a single 16-bit integer
// (bitmask), keeping the JSON small enough for a clean URL.

interface SharePayload {
  g: Record<string, number>;
  t: number;
  e: EffectValues;
}

function toUrlBase64(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlBase64(str: string): string {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export function encodeShareParam(
  grid: Grid,
  tempo: number,
  effects: EffectValues,
): string {
  const g: Record<string, number> = {};
  for (const inst of INSTRUMENTS) {
    let mask = 0;
    for (let i = 0; i < grid[inst].length; i++) {
      if (grid[inst][i]) mask |= 1 << i;
    }
    g[inst] = mask;
  }
  const payload: SharePayload = { g, t: tempo, e: effects };
  return toUrlBase64(JSON.stringify(payload));
}

export function decodeShareParam(
  param: string,
): { grid: Grid; tempo: number; effects: EffectValues } | null {
  try {
    const payload = JSON.parse(fromUrlBase64(param)) as SharePayload;
    if (!payload?.g || !payload?.t || !payload?.e) return null;

    const grid = {} as Grid;
    for (const inst of INSTRUMENTS) {
      const mask: number = payload.g[inst] ?? 0;
      grid[inst] = Array.from({ length: 16 }, (_, i) => Boolean(mask & (1 << i)));
    }
    return { grid, tempo: payload.t, effects: payload.e };
  } catch {
    return null;
  }
}
