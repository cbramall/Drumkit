import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Grid, SavedBeat } from '@/lib/types';
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

  // Load beats whenever the logged-in user changes
  useEffect(() => {
    setLoading(true);
    if (userId) {
      supabase
        .from('beats')
        .select('id, name, grid, tempo')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error) {
            const beats: Record<string, SavedBeat> = {};
            for (const row of data ?? []) {
              beats[row.name] = { id: row.id, grid: row.grid as Grid, tempo: row.tempo };
            }
            setSavedBeats(beats);
          }
          setLoading(false);
        });
    } else {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, { grid: Grid; tempo: number }>;
          const beats: Record<string, SavedBeat> = {};
          for (const [k, v] of Object.entries(parsed)) {
            beats[k] = { grid: v.grid, tempo: v.tempo };
          }
          setSavedBeats(beats);
        }
      } catch (e) {
        console.error('Failed to parse saved beats from localStorage:', e);
      }
      setLoading(false);
    }
  }, [userId]);

  /** Persist a beat. Returns an error code or null on success. */
  const saveBeat = useCallback(
    async (
      name: string,
      grid: Grid,
      tempo: number,
      overwrite = false,
    ): Promise<SaveBeatsError | null> => {
      const trimmed = name.trim();
      if (!trimmed) return 'name_empty';
      if (trimmed.length > BEATS_NAME_MAX) return 'name_too_long';
      if (!BEATS_NAME_PATTERN.test(trimmed)) return 'name_invalid_chars';
      if (savedBeats[trimmed] && !overwrite) return 'name_exists';

      if (userId) {
        const { data, error } = await supabase
          .from('beats')
          .upsert({ user_id: userId, name: trimmed, grid, tempo }, { onConflict: 'user_id,name' })
          .select('id')
          .single();
        if (error) return 'save_failed';
        setSavedBeats((prev) => ({ ...prev, [trimmed]: { id: data?.id, grid, tempo } }));
      } else {
        const next = { ...savedBeats, [trimmed]: { grid, tempo } };
        setSavedBeats(next);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to persist beats to localStorage:', e);
        }
      }
      return null;
    },
    [userId, savedBeats],
  );

  /** Load a beat from local state into the sequencer. */
  const loadBeat = useCallback(
    (name: string): { grid: Grid; tempo: number } | null => {
      const beat = savedBeats[name];
      if (!beat) return null;
      return { grid: ensureFullGrid(beat.grid), tempo: beat.tempo };
    },
    [savedBeats],
  );

  /** Delete a beat. Returns an error code or null on success. */
  const deleteBeat = useCallback(
    async (name: string): Promise<SaveBeatsError | null> => {
      const beat = savedBeats[name];
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
    [userId, savedBeats],
  );

  return { savedBeats, loading, saveBeat, loadBeat, deleteBeat };
}
