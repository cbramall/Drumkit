import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/components/AuthProvider';
import { useGrid } from '@/hooks/useGrid';
import { usePlayback } from '@/hooks/usePlayback';
import { useSavedBeats } from '@/hooks/useSavedBeats';
import { initAudio, getEffectsState, resetEffectsToDefaults, applyEffectsState, getAnalyser } from '@/lib/audio-engine';
import Navbar from '@/components/Navbar';
import SequencerGrid, { INSTRUMENT_COLORS } from '@/components/SequencerGrid';
import EffectsPanel from '@/components/EffectsPanel';
import type { EffectValues } from '@/lib/types';
import AuthModal, { type AuthMode } from '@/components/AuthModal';
import CookieConsent from '@/components/CookieConsent';
import svgPaths from '@/assets/svg-paths';
import { encodeShareParam, decodeShareParam } from '@/lib/shareBeat';
import { INSTRUMENTS, type InstrumentName } from '@/lib/audio-engine';

// ─── Waveform Background ────────────────────────────────────────

const WAVE_HALF = 600;
const WAVE_H = 60;

function buildWavePath(cycles: number, amp: number): string {
  const w = WAVE_HALF * 2;
  const mid = WAVE_H / 2;
  const omega = (cycles * 2 * Math.PI) / WAVE_HALF;
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 3) {
    pts.push(`${x === 0 ? 'M' : 'L'}${x},${(mid + Math.sin(x * omega) * amp).toFixed(1)}`);
  }
  return pts.join(' ');
}

const WAVE_CFG: Record<InstrumentName, { cycles: number; amp: number; idleSpeed: number; playSpeed: number; sw: number }> = {
  kick:        { cycles: 2,  amp: 18, idleSpeed: 16, playSpeed: 5,   sw: 2.5 },
  snare:       { cycles: 5,  amp: 14, idleSpeed: 13, playSpeed: 4,   sw: 2   },
  clap:        { cycles: 8,  amp: 11, idleSpeed: 10, playSpeed: 3.5, sw: 1.8 },
  openHiHat:   { cycles: 13, amp: 9,  idleSpeed: 8,  playSpeed: 2.5, sw: 1.5 },
  closedHiHat: { cycles: 20, amp: 6,  idleSpeed: 6,  playSpeed: 2,   sw: 1.2 },
  tom:         { cycles: 3,  amp: 16, idleSpeed: 14, playSpeed: 4.5, sw: 2.2 },
  rimshot:     { cycles: 15, amp: 8,  idleSpeed: 7,  playSpeed: 2.2, sw: 1.4 },
  cowbell:     { cycles: 18, amp: 7,  idleSpeed: 9,  playSpeed: 3,   sw: 1.3 },
};

const WAVE_DEFS = INSTRUMENTS.map((inst, i) => {
  const c = WAVE_CFG[inst];
  return { inst, color: INSTRUMENT_COLORS[inst].label, path: buildWavePath(c.cycles, c.amp), ...c, reverse: i % 2 === 1 };
});

// ─── VU Meter ────────────────────────────────────────────────────

const VuMeter = memo(function VuMeter({ isPlaying }: { isPlaying: boolean }) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  // D2: separate refs for each ID type — prevents calling the wrong cancel fn
  const rafRef     = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const analyser = getAnalyser();
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const BARS = 12;

    const update = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      const lit = Math.round((avg / 255) * BARS);

      for (let i = 0; i < BARS; i++) {
        const el = barsRef.current[i];
        if (!el) continue;
        if (i < lit) {
          const color = i >= 9 ? '#ff1744' : i >= 6 ? '#ffd600' : '#00e676';
          const glow  = i >= 9 ? 'rgba(255,23,68,0.5)' : i >= 6 ? 'rgba(255,214,0,0.5)' : 'rgba(0,230,118,0.5)';
          el.style.background = color;
          el.style.boxShadow  = `0 0 4px ${glow}`;
        } else {
          el.style.background = '#000';
          el.style.boxShadow  = 'none';
        }
      }
      // Throttle to ~10fps when silent to save CPU
      if (avg > 1) {
        rafRef.current = requestAnimationFrame(update);
      } else {
        timeoutRef.current = window.setTimeout(() => {
          rafRef.current = requestAnimationFrame(update);
        }, 100);
      }
    };

    update();
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="vu-meter flex flex-col-reverse gap-[1px]" style={{ backgroundColor: '#000' }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} ref={(el) => { barsRef.current[i] = el; }} className="vu-meter-seg w-[8px] h-[3px] rounded-[0.5px]" />
      ))}
    </div>
  );
});

// ─── Modal shared styles ─────────────────────────────────────────

const inputCls =
  "w-full bg-[#1a2245] border border-[#2a3a6a] rounded-[8px] px-[12px] py-[10px] text-[#e0e8f8] font-['Press_Start_2P',cursive] text-[8px] outline-none focus:border-[#ff2d78] transition-colors";
const btnCls =
  "px-[16px] py-[8px] rounded-[8px] font-['Press_Start_2P',cursive] text-[8px] transition-colors cursor-pointer";

// ─── App ─────────────────────────────────────────────────────────

export default function App() {
  const { user, signIn, signUp, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Domain hooks ──────────────────────────────────────────────
  const { grid, setGrid, toggleCell, resetGrid, undo, redo, canUndo, canRedo } = useGrid();
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const { isPlaying, isPlayingRef, tempo, setTempo, currentStep, swingRef, startPlayback, stopPlayback } = usePlayback(gridRef);

  const { savedBeats, loading: beatsLoading, saveBeat, loadBeat, deleteBeat } = useSavedBeats({ userId: user?.id });

  // ── UI state ──────────────────────────────────────────────────
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [overwriteConfirmName, setOverwriteConfirmName] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string | null>(null);
  const [currentBeatName, setCurrentBeatName] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showWaveforms, setShowWaveforms] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(true);

  // ── BPM draft input — lets the user type freely; commits on blur/Enter ──
  const [bpmDraft, setBpmDraft] = useState(String(tempo));
  // Keep draft in sync when tempo is changed externally (e.g. loading a beat)
  const prevTempoRef = useRef(tempo);
  if (prevTempoRef.current !== tempo) {
    prevTempoRef.current = tempo;
    setBpmDraft(String(tempo));
  }
  const commitBpm = useCallback(() => {
    const n = parseInt(bpmDraft, 10);
    const clamped = Number.isFinite(n) ? Math.max(40, Math.min(300, n)) : tempo;
    setTempo(clamped);
    setBpmDraft(String(clamped));
  }, [bpmDraft, tempo]);

  // ── Effects state ─────────────────────────────────────────────
  // B3: lazy initialiser — getEffectsState() runs once, not on every render
  const [fxValues, setFxValues] = useState<EffectValues>(() => {
    const d = getEffectsState();
    return {
      reverb:      d.reverb,
      delay:       d.delayAmount,
      dryWet:      d.dryWet,
      chorus:      d.chorus,
      compression: d.compression,
      cutoff:      d.filterCutoff,
      resonance:   d.filterResonance,
      swing:       d.swing,
    };
  });

  // ── Feedback toast ────────────────────────────────────────────
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFeedback = useCallback((msg: string, duration = 3000) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(msg);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), duration);
  }, []);
  useEffect(() => () => { if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current); }, []);

  const savedBeatNames = useMemo(() => Object.keys(savedBeats), [savedBeats]);

  // ── Load a shared beat from the ?beat= URL param ──────────────
  // The SHARE button encodes the current beat into a URL-safe base64 param.
  // On mount we decode it, apply it, and immediately strip the param so the
  // URL stays clean and a refresh doesn't re-load the same data.
  useEffect(() => {
    const param = new URLSearchParams(location.search).get('beat');
    if (!param) return;
    const shared = decodeShareParam(param);
    if (!shared) return;
    setGrid(shared.grid);
    setTempo(shared.tempo);
    setFxValues(shared.effects);
    swingRef.current = shared.effects.swing;
    applyEffectsState(shared.effects);
    // Strip ?beat= from the URL without a navigation/re-render
    navigate('/', { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // ── Effects handlers ──────────────────────────────────────────
  const handleFxChange = useCallback((key: keyof EffectValues, value: number) => {
    setFxValues((prev) => ({ ...prev, [key]: value }));
    if (key === 'swing') swingRef.current = value;
  }, [swingRef]);

  const handleResetEffects = useCallback(() => {
    resetEffectsToDefaults();
    const d = getEffectsState();
    const next: EffectValues = {
      reverb: d.reverb, delay: d.delayAmount, dryWet: d.dryWet,
      chorus: d.chorus, compression: d.compression, cutoff: d.filterCutoff,
      resonance: d.filterResonance, swing: d.swing,
    };
    setFxValues(next);
    swingRef.current = d.swing;
  }, [swingRef]);

  // ── Playback ──────────────────────────────────────────────────
  const handlePlayback = useCallback(async () => {
    if (isPlaying) { stopPlayback(); }
    else { await initAudio(); startPlayback(); }
  }, [isPlaying, stopPlayback, startPlayback]);

  const handleNewBeat = useCallback(() => {
    stopPlayback();
    resetGrid();
    setTempo(120);
    setCurrentBeatName(null);
  }, [stopPlayback, resetGrid]);

  // ── Save / Open ───────────────────────────────────────────────

  /** Overwrite the currently-loaded beat without opening a modal. */
  const handleDirectSave = useCallback(async () => {
    if (!currentBeatName) return;
    const err = await saveBeat(currentBeatName, grid, tempo, fxValues, true);
    if (err === null) showFeedback(`"${currentBeatName}" saved!`, 2000);
    else if (err === 'save_failed') showFeedback('Failed to save beat. Please try again.');
  }, [currentBeatName, grid, tempo, fxValues, saveBeat, showFeedback]);

  const handleConfirmSave = useCallback(async () => {
    const isOverwrite = overwriteConfirmName === saveName.trim();
    const err = await saveBeat(saveName, grid, tempo, fxValues, isOverwrite);
    switch (err) {
      case null:
        setShowSaveModal(false);
        setOverwriteConfirmName(null);
        setCurrentBeatName(saveName.trim());
        showFeedback('Beat saved!', 2000);
        break;
      case 'name_empty':     break; // no-op: button should be disabled
      case 'name_too_long':  showFeedback('Beat name must be 100 characters or fewer.'); break;
      case 'name_invalid_chars': showFeedback('Beat name: letters, numbers, spaces, hyphens, underscores, apostrophes, and periods only.', 4000); break;
      case 'name_exists':    setOverwriteConfirmName(saveName.trim()); break;
      case 'save_failed':    showFeedback('Failed to save beat. Please try again.'); break;
    }
  }, [overwriteConfirmName, saveName, saveBeat, grid, tempo, fxValues, showFeedback]);

  const handleLoadBeat = useCallback((name: string) => {
    const result = loadBeat(name);
    if (result) {
      stopPlayback();
      setGrid(result.grid);
      setTempo(result.tempo);
      setCurrentBeatName(name);
      if (result.effects && 'reverb' in result.effects) {
        setFxValues(result.effects);
        swingRef.current = result.effects.swing;
        applyEffectsState(result.effects);
      }
    }
    setShowOpenModal(false);
  }, [loadBeat, stopPlayback, setGrid, swingRef]);

  const handleShareBeat = useCallback(async () => {
    const param = encodeShareParam(grid, tempo, fxValues);
    const url = `${window.location.origin}/?beat=${param}`;
    try {
      await navigator.clipboard.writeText(url);
      showFeedback('Link copied!', 2500);
    } catch {
      showFeedback(`Share: ${url}`, 8000);
    }
  }, [grid, tempo, fxValues, showFeedback]);

  const handleDeleteBeat = useCallback(async (name: string) => {
    const err = await deleteBeat(name);
    if (err === 'delete_failed')     showFeedback('Failed to delete beat. Please try again.');
    if (err === 'delete_missing_id') showFeedback('Cannot delete beat — missing record ID. Please refresh and try again.');
    setDeleteConfirmName(null);
  }, [deleteBeat, showFeedback]);

  // ── Auth ──────────────────────────────────────────────────────
  const handleAuthSubmit = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = authMode === 'signup'
      ? await signUp(email, password)
      : await signIn(email, password);
    if (error) { setAuthError(error.message); return; }
    setAuthMode(null);
  }, [authMode, signIn, signUp]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === 'Escape') {
        setShowSaveModal(false); setShowOpenModal(false);
        setAuthMode(null); setAuthError(null); setDeleteConfirmName(null);
        return;
      }
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        if (isPlayingRef.current) stopPlayback();
        else initAudio().then(() => startPlayback());
      }
      if (e.key === 'w' && !typing) setShowWaveforms((v) => !v);
      if (e.key === 'e' && !typing) setShowEffectsPanel((v) => !v);
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stopPlayback, startPlayback, isPlayingRef, undo, redo]);

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen retro-bg flex flex-col scanlines">
      <div className="retro-scene" aria-hidden="true">
        <div className="retro-scene-sky" /><div className="retro-scene-sun" />
        <div className="retro-scene-glow" /><div className="retro-scene-horizon" />
        <div className="retro-scene-floor" />
      </div>

      <Navbar
        user={user}
        onSignUpClick={() => { setAuthError(null); setAuthMode('signup'); }}
        onSignInClick={() => { setAuthError(null); setAuthMode('signin'); }}
        onSignOut={signOut}
      />

      <main className="min-h-screen flex flex-col items-center justify-center px-2 md:px-[24px] pt-[60px] md:pt-[108px] pb-[60px] relative">
        {/* D5: role+aria-live ensures screen readers announce saves/errors */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed top-[80px] left-1/2 -translate-x-1/2 z-40 px-[20px] py-[12px] rounded-[8px] font-['Press_Start_2P',cursive] text-[8px] text-center max-w-[calc(100vw-32px)] pointer-events-none transition-opacity duration-200 ${
            feedback ? 'opacity-100' : 'opacity-0'
          } ${
            feedback && /failed|cannot|corrupt/i.test(feedback)
              ? 'bg-[#ff1744]/20 text-[#ff4569] border border-[#ff1744]/40'
              : 'bg-[#00e676]/20 text-[#69f0ae] border border-[#00e676]/40'
          }`}
        >
          {feedback ?? ''}
        </div>

        <div className="flex flex-col md:flex-row md:items-stretch gap-0">
          <div className="w-full min-w-0 md:w-fit md:shrink-0">
            {/* ── Toolbar ── */}
            <div className="synth-toolbar relative rounded-tl-[4px] rounded-tr-[4px] shrink-0 border-2 border-[#1a2050]">
              <div className="overflow-clip rounded-[inherit]">
                {/* ── Beat title bar — title left, action buttons right ── */}
                <div className="flex items-center justify-between gap-[16px] px-4 md:px-[28px] py-[11px] border-b border-[#1a2050] bg-[rgba(3,5,18,0.5)]">
                  <div className="flex items-center gap-[12px] min-w-0">
                    <span className="beat-title-gem shrink-0">◆</span>
                    <h1 className={`font-['Press_Start_2P',cursive] text-[13px] tracking-[0.18em] uppercase truncate ${currentBeatName ? 'beat-title-active' : 'beat-title-untitled'}`}>
                      {currentBeatName ?? 'untitled'}
                    </h1>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-[6px] shrink-0 flex-wrap justify-end">
                    {/* Save / Open / New group */}
                    {user ? (
                      <>
                        <button
                          onClick={currentBeatName
                            ? handleDirectSave
                            : () => { setShowSaveModal(true); setSaveName(''); setOverwriteConfirmName(null); }}
                          className="synth-btn-chrome flex gap-[6px] items-center justify-center px-[12px] py-[10px] shrink-0 cursor-pointer rounded-[4px]"
                          title={currentBeatName ? `Save "${currentBeatName}"` : 'Save beat'}
                        >
                          <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                            <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                            <rect x="5" y="2" width="6" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                            <rect x="4.5" y="8.5" width="7" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                            <line x1="7" y1="3" x2="7" y2="6.5" stroke="currentColor" strokeWidth="1.1" />
                          </svg>
                          <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none">SAVE</p>
                        </button>
                        {currentBeatName && (
                          <button
                            onClick={() => { setShowSaveModal(true); setSaveName(currentBeatName); setOverwriteConfirmName(null); }}
                            className="synth-btn-chrome flex gap-[6px] items-center justify-center px-[12px] py-[10px] shrink-0 cursor-pointer rounded-[4px]"
                            title="Save as a new beat"
                          >
                            <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                              <rect x="5" y="2" width="6" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                              <rect x="4.5" y="8.5" width="7" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
                              <line x1="7" y1="3" x2="7" y2="6.5" stroke="currentColor" strokeWidth="1.1" />
                            </svg>
                            <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none">SAVE AS</p>
                          </button>
                        )}
                        <button
                          onClick={() => { setShowOpenModal(true); setDeleteConfirmName(null); }}
                          className="synth-btn-chrome flex gap-[6px] items-center justify-center px-[12px] py-[10px] shrink-0 cursor-pointer rounded-[4px]"
                        >
                          <svg className="shrink-0 size-[14px]" fill="none" viewBox="0 0 18.4272 15.25"><path d={svgPaths.p14df6180} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                          <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none">OPEN</p>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setAuthMode('signin')}
                        className="synth-btn-chrome flex gap-[6px] items-center justify-center px-[12px] py-[10px] shrink-0 cursor-pointer rounded-[4px] opacity-60 hover:opacity-100"
                        title="Sign in to save and open beats"
                      >
                        <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none">SIGN IN TO SAVE</p>
                      </button>
                    )}
                    <button
                      onClick={handleNewBeat}
                      className="synth-btn-chrome flex gap-[6px] items-center justify-center px-[12px] py-[10px] shrink-0 cursor-pointer rounded-[4px]"
                    >
                      <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                        <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none">NEW</p>
                    </button>

                    {/* Divider + SHARE BEAT! CTA */}
                    {user && (
                      <>
                        <div className="w-px h-[20px] bg-[#2a3a6a] mx-[4px] shrink-0" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={handleShareBeat}
                          title="Copy a shareable link to this beat"
                          className="synth-btn-yellow flex gap-[6px] items-center justify-center px-[12px] py-[10px] shrink-0 cursor-pointer rounded-[4px]"
                        >
                          <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                            <circle cx="12" cy="3"  r="2" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.3" />
                            <circle cx="3"  cy="8"  r="2" stroke="currentColor" strokeWidth="1.3" />
                            <line x1="4.8"  y1="7.1"  x2="10.2" y2="4.1"  stroke="currentColor" strokeWidth="1.3" />
                            <line x1="4.8"  y1="8.9"  x2="10.2" y2="11.9" stroke="currentColor" strokeWidth="1.3" />
                          </svg>
                          <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none">Share Your Beat</p>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Playback row ── */}
                <div className="flex items-center justify-between px-4 md:px-[28px] py-[14px] w-full flex-wrap gap-[16px]">
                  {/* Left: transport controls */}
                  <div className="flex gap-[20px] items-center shrink-0 flex-wrap">
                    <VuMeter isPlaying={isPlaying} />
                    <div className="flex gap-[10px] items-center shrink-0">
                      <label htmlFor="bpm-input" className="font-['Press_Start_2P',cursive] text-[#8aa0d4] text-[8px] tracking-[0.1em]">BPM</label>
                      <div className="led-display flex items-center justify-center shrink-0">
                        <input
                          id="bpm-input"
                          type="number" min={40} max={300}
                          value={bpmDraft}
                          aria-label="Tempo in BPM"
                          onChange={(e) => setBpmDraft(e.target.value)}
                          onBlur={commitBpm}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                          className="led-input bg-transparent text-[14px] font-['Press_Start_2P',cursive] w-[80px] text-center outline-none px-[12px] py-[8px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handlePlayback}
                      aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
                      aria-pressed={isPlaying}
                      className={`${isPlaying ? 'synth-btn-stop' : 'synth-btn-play'} flex gap-[6px] items-center justify-center px-[14px] py-[8px] rounded-[4px] shrink-0 cursor-pointer`}
                    >
                      <div className="shrink-0 size-[16px]">
                        {isPlaying ? (
                          <svg className="block size-full" viewBox="0 0 16 16">
                            <rect x="2" y="2" width="4.5" height="12" rx="1" fill="currentColor" />
                            <rect x="9.5" y="2" width="4.5" height="12" rx="1" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg className="block size-full" viewBox="0 0 16 16">
                            <polygon points="3,1 14,8 3,15" fill="currentColor" />
                          </svg>
                        )}
                      </div>
                      <p className="font-['Press_Start_2P',cursive] text-[8px] tracking-[0.05em]">{isPlaying ? 'STOP' : 'PLAY'}</p>
                    </button>

                    <div className="w-px h-[20px] bg-[#2a3a6a] mx-[4px] shrink-0" aria-hidden="true" />

                    <button
                      onClick={undo}
                      disabled={!canUndo}
                      title="Undo (Ctrl+Z / ⌘Z)"
                      className="synth-btn-chrome flex items-center justify-center px-[10px] py-[10px] shrink-0 rounded-[4px] transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5A5 5 0 1 1 5.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <polyline points="3,5 3,9 7,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      onClick={redo}
                      disabled={!canRedo}
                      title="Redo (Ctrl+Shift+Z / ⌘⇧Z)"
                      className="synth-btn-chrome flex items-center justify-center px-[10px] py-[10px] shrink-0 rounded-[4px] transition-opacity disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                        <path d="M13 8.5A5 5 0 1 0 10.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <polyline points="13,5 13,9 9,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Right: view toggles as switches */}
                  <div className="flex items-center gap-[20px] shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showWaveforms}
                      onClick={() => setShowWaveforms((v) => !v)}
                      className="synth-switch"
                    >
                      <div className={`synth-switch-track ${showWaveforms ? 'synth-switch-track--on' : ''}`}>
                        <div className={`synth-switch-thumb ${showWaveforms ? 'synth-switch-thumb--on' : ''}`} />
                      </div>
                      <p className={`font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none ${showWaveforms ? 'text-[#00d4ff]' : ''}`}>WAVES</p>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showEffectsPanel}
                      onClick={() => setShowEffectsPanel((v) => !v)}
                      className="synth-switch"
                    >
                      <div className={`synth-switch-track ${showEffectsPanel ? 'synth-switch-track--on' : ''}`}>
                        <div className={`synth-switch-thumb ${showEffectsPanel ? 'synth-switch-thumb--on' : ''}`} />
                      </div>
                      <p className={`font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] leading-none ${showEffectsPanel ? 'text-[#00d4ff]' : ''}`}>EFFECTS</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <SequencerGrid grid={grid} currentStep={currentStep} onToggleCell={toggleCell} />
          </div>

          <EffectsPanel open={showEffectsPanel} values={fxValues} onChange={handleFxChange} onReset={handleResetEffects} />
        </div>

        {/* Waveforms — hidden on mobile for performance */}
        <div className={`waveform-container hidden md:block mt-[24px] w-screen -mx-[24px] transition-opacity duration-300 ${showWaveforms ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden="true">
          {WAVE_DEFS.map(({ inst, color, path, idleSpeed, playSpeed, sw, reverse }) => {
            const firing = isPlaying && currentStep >= 0 && grid[inst][currentStep];
            return (
              <div key={inst} className="wave-layer" style={{ top: '50%', opacity: firing ? 0.9 : isPlaying ? 0.45 : 0.2, transform: `translateY(-50%) scaleY(${firing ? 2.8 : isPlaying ? 1.3 : 1})` }}>
                <svg className={`wave-svg${reverse ? ' wave-reverse' : ''}`} viewBox={`0 0 ${WAVE_HALF * 2} ${WAVE_H}`} preserveAspectRatio="none" style={{ animationDuration: `${isPlaying ? playSpeed : idleSpeed}s`, filter: `drop-shadow(0 0 ${firing ? 28 : 12}px ${color}) drop-shadow(0 0 ${firing ? 56 : 24}px ${color})` }}>
                  <path d={path} stroke={color} fill="none" strokeWidth={sw * 1.5} strokeOpacity={0.35} />
                  <path d={path} stroke="#fff"   fill="none" strokeWidth={sw * 0.5} strokeOpacity={firing ? 0.8 : 0.3} />
                  <path d={path} stroke={color} fill="none" strokeWidth={sw} />
                </svg>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2a3a6a] retro-panel px-4 md:px-[40px] py-[16px]">
        <div className="flex flex-wrap items-center justify-center gap-x-[24px] gap-y-[8px] font-['Press_Start_2P',cursive] text-[7px] text-[#7a8ab8]">
          <span>&copy; {new Date().getFullYear()} Beatz-maker</span>
          <Link to="/privacy" className="hover:text-[#ff2d78] transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[#ff2d78] transition-colors">Terms of Service</Link>
        </div>
      </footer>

      <CookieConsent />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="save-modal-title" onClick={() => setShowSaveModal(false)}>
          <div className="retro-panel border-2 border-[#2a3a6a] rounded-[12px] p-[24px] w-[calc(100vw-32px)] max-w-[400px] neon-border-pink" onClick={(e) => e.stopPropagation()}>
            <h2 id="save-modal-title" className="font-['Press_Start_2P',cursive] text-[11px] text-[#e0e8f8] mb-[16px]">SAVE BEAT</h2>
            <input type="text" placeholder="Enter beat name..." value={saveName} onChange={(e) => { setSaveName(e.target.value); setOverwriteConfirmName(null); }} onKeyDown={(e) => e.key === 'Enter' && handleConfirmSave()} maxLength={100} autoFocus className={inputCls} />
            {overwriteConfirmName && (
              <p className="mt-[12px] text-[#ffd740] text-[7px] font-['Press_Start_2P',cursive] leading-[1.6]">
                "{overwriteConfirmName}" already exists. Press Save again to overwrite.
              </p>
            )}
            <div className="flex gap-[8px] mt-[16px] justify-end">
              <button onClick={() => setShowSaveModal(false)} className={`${btnCls} text-[#7a8ab8] hover:bg-[#1a2245]`}>Cancel</button>
              <button onClick={handleConfirmSave} className={`${btnCls} cursor-pointer border ${overwriteConfirmName ? 'bg-[#ffab00] text-[#0a0e27] hover:bg-[#ffc107] border-[#ffd740]' : 'retro-btn-pink text-[#e0e8f8] border-[#ff5a9e]'}`}>
                {overwriteConfirmName ? 'Overwrite' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="open-modal-title" onClick={() => setShowOpenModal(false)}>
          <div className="retro-panel border-2 border-[#2a3a6a] rounded-[12px] p-[24px] w-[calc(100vw-32px)] max-w-[400px] max-h-[500px] overflow-y-auto neon-border-pink" onClick={(e) => e.stopPropagation()}>
            <h2 id="open-modal-title" className="font-['Press_Start_2P',cursive] text-[11px] text-[#e0e8f8] mb-[16px]">OPEN BEAT</h2>
            {beatsLoading ? (
              <p className="text-[#7a8ab8] font-['Press_Start_2P',cursive] text-[8px]">Loading beats...</p>
            ) : savedBeatNames.length === 0 ? (
              <p className="text-[#7a8ab8] font-['Press_Start_2P',cursive] text-[8px]">No saved beats yet.</p>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {savedBeatNames.map((name) => (
                  <div key={name} className="flex items-center justify-between bg-[#1a2245] border border-[#2a3a6a] rounded-[8px] px-[12px] py-[10px]">
                    <button onClick={() => handleLoadBeat(name)} className="text-[#e0e8f8] font-['Press_Start_2P',cursive] text-[8px] hover:text-[#ff2d78] transition-colors cursor-pointer flex-1 text-left">{name}</button>
                    {deleteConfirmName === name ? (
                      <div className="flex gap-[6px] items-center ml-[8px] shrink-0">
                        <button onClick={() => handleDeleteBeat(name)} className="text-[#ff4569] font-['Press_Start_2P',cursive] text-[7px] hover:text-[#ff6b8a] cursor-pointer">Delete</button>
                        <button onClick={() => setDeleteConfirmName(null)} className="text-[#7a8ab8] font-['Press_Start_2P',cursive] text-[7px] hover:text-[#e0e8f8] cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmName(name)} className="text-[#7a8ab8] hover:text-[#ff4569] cursor-pointer ml-[8px] text-[14px]" aria-label={`Delete ${name}`}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-[16px]">
              <button onClick={() => setShowOpenModal(false)} className={`${btnCls} text-[#7a8ab8] hover:bg-[#1a2245]`}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {authMode && (
        <AuthModal mode={authMode} onClose={() => { setAuthMode(null); setAuthError(null); }} onSubmit={handleAuthSubmit} error={authError} />
      )}
    </div>
  );
}

