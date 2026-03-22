import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Grid, SavedBeat, EffectValues } from '@/lib/types';
import { ensureFullGrid } from '@/hooks/useGrid';

const BEATS_NAME_MAX = 100;
const BEATS_NAME_PATTERN = /^[a-zA-Z0-9 _\-'.]+$/;
const LOCAL_STORAGE_KEY = 'superbeats_saved';

export type SaveBeatsError =
  | 'name_empty'
  | 'name_too_long'
  | 'name_invalid_chars'
  | 'save_failed'
  | 'delete_failed'
  | 'delete_missing_id'
  | 'name_exists'; // caller should prompt overwrite confirmation

interface UseSavedBeatsOptions {
  userId: string | undefined;
}

export function useSavedBeats({ userId }: UseSavedBeatsOptions) {
  const [savedBeats, setSavedBeats] = useState<Record<string, SavedBeat>>({});
  const [loading, setLoading] = useState(false);

  // Mirror savedBeats into a ref so callbacks can read the latest value
  // without being recreated on every save/load.
  const savedBeatsRef = useRef(savedBeats);
  savedBeatsRef.current = savedBeats;

  // Load beats whenever the logged-in user changes.
  // A cancelled flag prevents a stale Supabase response from overwriting
  // state if userId changes before the request resolves.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (userId) {
      supabase
        .from('beats')
        .select('id, name, grid, tempo, effects')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (cancelled) return;
          if (!error) {
            const beats: Record<string, SavedBeat> = {};
            for (const row of data ?? []) {
              beats[row.name] = {
                id: row.id,
                grid: row.grid as Grid,
                tempo: row.tempo,
                effects: (row.effects as EffectValues | null) ?? null,
              };
            }
            setSavedBeats(beats);
          }
          setLoading(false);
        });
    } else {
      // Always reset to empty first so a previous user's beats are never
      // shown while localStorage is being read.
      let beats: Record<string, SavedBeat> = {};
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<
            string,
            { grid: Grid; tempo: number; effects?: EffectValues | null }
          >;
          for (const [k, v] of Object.entries(parsed)) {
            beats[k] = { grid: v.grid, tempo: v.tempo, effects: v.effects ?? null };
          }
        }
      } catch (e) {
        console.error('Failed to parse saved beats from localStorage:', e);
        beats = {};
      }
      setSavedBeats(beats);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [userId]);

  /** Persist a beat. Returns an error code or null on success. */
  const saveBeat = useCallback(
    async (
      name: string,
      grid: Grid,
      tempo: number,
      effects: EffectValues,
      overwrite = false,
    ): Promise<SaveBeatsError | null> => {
      const trimmed = name.trim();
      if (!trimmed) return 'name_empty';
      if (trimmed.length > BEATS_NAME_MAX) return 'name_too_long';
      if (!BEATS_NAME_PATTERN.test(trimmed)) return 'name_invalid_chars';
      if (savedBeatsRef.current[trimmed] && !overwrite) return 'name_exists';

      if (userId) {
        const { data, error } = await supabase
          .from('beats')
          .upsert({ user_id: userId, name: trimmed, grid, tempo, effects }, { onConflict: 'user_id,name' })
          .select('id')
          .single();
        if (error) return 'save_failed';
        setSavedBeats((prev) => ({ ...prev, [trimmed]: { id: data?.id, grid, tempo, effects } }));
      } else {
        setSavedBeats((prev) => {
          const next = { ...prev, [trimmed]: { grid, tempo, effects } };
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
          } catch (e) {
            console.error('Failed to persist beats to localStorage:', e);
          }
          return next;
        });
      }
      return null;
    },
    [userId],
  );

  /** Load a beat from local state into the sequencer. */
  const loadBeat = useCallback(
    (name: string): { grid: Grid; tempo: number; effects: EffectValues | null } | null => {
      const beat = savedBeatsRef.current[name];
      if (!beat) return null;
      return { grid: ensureFullGrid(beat.grid), tempo: beat.tempo, effects: beat.effects ?? null };
    },
    [],
  );

  /** Delete a beat. Returns an error code or null on success. */
  const deleteBeat = useCallback(
    async (name: string): Promise<SaveBeatsError | null> => {
      const beat = savedBeatsRef.current[name];
      if (userId) {
        if (!beat?.id) {
          console.error('deleteBeat: beat has no id', { name, beat });
          return 'delete_missing_id';
        }
        const { error } = await supabase.from('beats').delete().eq('id', beat.id);
        if (error) return 'delete_failed';
      }
      setSavedBeats((prev) => {
        const next = { ...prev };
        delete next[name];
        if (!userId) {
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
          } catch (e) {
            console.error('Failed to update localStorage after delete:', e);
          }
        }
        return next;
      });
      return null;
    },
    [userId],
  );

  return { savedBeats, loading, saveBeat, loadBeat, deleteBeat };
}
