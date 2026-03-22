import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react';
import { INSTRUMENTS, STEPS, playInstrument, getAudioCurrentTime } from '@/lib/audio-engine';
import type { Grid } from '@/lib/types';

// How far ahead (seconds) to schedule audio events — eliminates setTimeout drift
const LOOKAHEAD = 0.1;
// How often (ms) the scheduler loop fires
const SCHEDULER_INTERVAL = 25;

export function usePlayback(gridRef: MutableRefObject<Grid>) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);

  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Swing is owned here so the playback engine always reads the latest value
  const swingRef = useRef(0);

  const schedulerTimerRef = useRef<number | null>(null);
  const uiRafRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const scheduleQueueRef = useRef<Array<{ when: number; step: number }>>([]);

  const stopPlayback = useCallback(() => {
    if (schedulerTimerRef.current !== null) {
      window.clearTimeout(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (uiRafRef.current !== null) {
      cancelAnimationFrame(uiRafRef.current);
      uiRafRef.current = null;
    }
    scheduleQueueRef.current = [];
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    setIsPlaying(true);

    const beatSec = 60 / tempoRef.current / 4;
    let scheduledStep = 0;
    nextNoteTimeRef.current = getAudioCurrentTime();
    scheduleQueueRef.current = [];

    // Audio scheduler: fills the lookahead window with precisely-timed events
    const schedule = () => {
      const now = getAudioCurrentTime();
      while (nextNoteTimeRef.current < now + LOOKAHEAD) {
        const when = nextNoteTimeRef.current;
        const step = scheduledStep;

        const g = gridRef.current;
        for (const inst of INSTRUMENTS) {
          if (g[inst]?.[step]) playInstrument(inst, when);
        }

        scheduleQueueRef.current.push({ when, step });

        const sw = swingRef.current;
        nextNoteTimeRef.current += beatSec * (step % 2 === 0 ? 1 + sw : 1 - sw);
        scheduledStep = (step + 1) % STEPS;
      }
      schedulerTimerRef.current = window.setTimeout(schedule, SCHEDULER_INTERVAL);
    };
    schedule();

    // UI tracker: syncs the visual step indicator to AudioContext time
    const trackUI = () => {
      const now = getAudioCurrentTime();
      const queue = scheduleQueueRef.current;
      while (queue.length > 1 && queue[1].when <= now) queue.shift();
      if (queue.length > 0 && queue[0].when <= now) setCurrentStep(queue[0].step);
      while (queue.length > STEPS * 2) queue.shift();
      uiRafRef.current = requestAnimationFrame(trackUI);
    };
    uiRafRef.current = requestAnimationFrame(trackUI);
  }, [stopPlayback, gridRef]);

  // Seamlessly restart when tempo changes mid-playback
  useEffect(() => {
    if (isPlayingRef.current) startPlayback();
  }, [tempo, startPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current !== null) window.clearTimeout(schedulerTimerRef.current);
      if (uiRafRef.current !== null) cancelAnimationFrame(uiRafRef.current);
    };
  }, []);

  return {
    isPlaying,
    isPlayingRef,
    tempo,
    setTempo,
    currentStep,
    swingRef,
    startPlayback,
    stopPlayback,
  };
}
