import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/components/AuthProvider';
import { useGrid } from '@/hooks/useGrid';
import { usePlayback } from '@/hooks/usePlayback';
import { useSavedBeats } from '@/hooks/useSavedBeats';
import { initAudio, getEffectsState, resetEffectsToDefaults, getAnalyser } from '@/lib/audio-engine';
import Navbar from '@/components/Navbar';
import SequencerGrid, { INSTRUMENT_COLORS } from '@/components/SequencerGrid';
import EffectsPanel, { type EffectValues } from '@/components/EffectsPanel';
import AuthModal, { type AuthMode } from '@/components/AuthModal';
import CookieConsent from '@/components/CookieConsent';
import svgPaths from '@/assets/svg-paths';
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

function VuMeter({ isPlaying }: { isPlaying: boolean }) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animRef = useRef<number>(0);

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
      animRef.current = avg > 1
        ? requestAnimationFrame(update)
        : window.setTimeout(() => { animRef.current = requestAnimationFrame(update); }, 100) as unknown as number;
    };

    update();
    return () => { cancelAnimationFrame(animRef.current); clearTimeout(animRef.current); };
  }, [isPlaying]);

  return (
    <div className="vu-meter flex flex-col-reverse gap-[1px]" style={{ backgroundColor: '#000' }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} ref={(el) => { barsRef.current[i] = el; }} className="vu-meter-seg w-[8px] h-[3px] rounded-[0.5px]" />
      ))}
    </div>
  );
}

// ─── Modal shared styles ─────────────────────────────────────────

const inputCls =
  "w-full bg-[#1a2245] border border-[#2a3a6a] rounded-[8px] px-[12px] py-[10px] text-[#e0e8f8] font-['Press_Start_2P',cursive] text-[8px] outline-none focus:border-[#ff2d78] transition-colors";
const btnCls =
  "px-[16px] py-[8px] rounded-[8px] font-['Press_Start_2P',cursive] text-[8px] transition-colors cursor-pointer";

// ─── App ─────────────────────────────────────────────────────────

export default function App() {
  const { user, signIn, signUp, signOut } = useAuth();

  // ── Domain hooks ──────────────────────────────────────────────
  const { grid, setGrid, toggleCell, resetGrid } = useGrid();
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
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showWaveforms, setShowWaveforms] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(true);

  // ── Effects state ─────────────────────────────────────────────
  const fxDefaults = getEffectsState();
  const [fxValues, setFxValues] = useState<EffectValues>({
    reverb:      fxDefaults.reverb,
    delay:       fxDefaults.delayAmount,
    dryWet:      fxDefaults.dryWet,
    chorus:      fxDefaults.chorus,
    compression: fxDefaults.compression,
    cutoff:      fxDefaults.filterCutoff,
    resonance:   fxDefaults.filterResonance,
    swing:       fxDefaults.swing,
  });

  // ── Feedback toast ────────────────────────────────────────────
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFeedback = useCallback((msg: string, duration = 3000) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(msg);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), duration);
  }, []);

  const savedBeatNames = useMemo(() => Object.keys(savedBeats), [savedBeats]);

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
  const handlePlayback = async () => {
    if (isPlaying) { stopPlayback(); }
    else { await initAudio(); startPlayback(); }
  };

  const handleNewBeat = () => {
    stopPlayback();
    resetGrid();
    setTempo(120);
  };

  // ── Save / Open ───────────────────────────────────────────────
  const handleConfirmSave = async () => {
    const isOverwrite = overwriteConfirmName === saveName.trim();
    const err = await saveBeat(saveName, grid, tempo, isOverwrite);
    switch (err) {
      case null:
        setShowSaveModal(false);
        setOverwriteConfirmName(null);
        showFeedback('Beat saved!', 2000);
        break;
      case 'name_empty':     break; // no-op: button should be disabled
      case 'name_too_long':  showFeedback('Beat name must be 100 characters or fewer.'); break;
      case 'name_invalid_chars': showFeedback('Beat name: letters, numbers, spaces, hyphens, underscores, apostrophes, and periods only.', 4000); break;
      case 'name_exists':    setOverwriteConfirmName(saveName.trim()); break;
      case 'save_failed':    showFeedback('Failed to save beat. Please try again.'); break;
    }
  };

  const handleLoadBeat = (name: string) => {
    const result = loadBeat(name);
    if (result) {
      stopPlayback();
      setGrid(result.grid);
      setTempo(result.tempo);
    }
    setShowOpenModal(false);
  };

  const handleDeleteBeat = async (name: string) => {
    const err = await deleteBeat(name);
    if (err === 'delete_failed')     showFeedback('Failed to delete beat. Please try again.');
    if (err === 'delete_missing_id') showFeedback('Cannot delete beat — missing record ID. Please refresh and try again.');
    setDeleteConfirmName(null);
  };

  // ── Auth ──────────────────────────────────────────────────────
  const handleAuthSubmit = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = authMode === 'signup'
      ? await signUp(email, password)
      : await signIn(email, password);
    if (error) { setAuthError(error.message); return; }
    setAuthMode(null);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stopPlayback, startPlayback, isPlayingRef]);

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

      <main className="min-h-screen flex flex-col items-center justify-center px-[24px] py-[24px] relative z-10">
        {feedback && (
          <div className={`mb-[16px] px-[16px] py-[10px] rounded-[8px] font-['Press_Start_2P',cursive] text-[8px] text-center ${
            /failed|cannot|corrupt/i.test(feedback)
              ? 'bg-[#ff1744]/20 text-[#ff4569] border border-[#ff1744]/40'
              : 'bg-[#00e676]/20 text-[#69f0ae] border border-[#00e676]/40'
          }`}>
            {feedback}
          </div>
        )}

        <div className="flex items-stretch gap-0">
          <div className="w-fit shrink-0">
            {/* ── Toolbar ── */}
            <div className="synth-toolbar relative rounded-tl-[4px] rounded-tr-[4px] shrink-0 border-2 border-[#1a2050]">
              <div className="overflow-clip rounded-[inherit]">
                <div className="content-stretch flex items-center justify-between px-[28px] py-[14px] relative w-full flex-wrap gap-[16px]">
                  <div className="content-stretch flex gap-[20px] items-center relative shrink-0 flex-wrap">
                    <VuMeter isPlaying={isPlaying} />
                    <div className="content-stretch flex gap-[10px] items-center relative shrink-0">
                      <p className="font-['Press_Start_2P',cursive] text-[#8aa0d4] text-[8px] tracking-[0.1em]">BPM</p>
                      <div className="led-display flex items-center justify-center relative shrink-0">
                        <input
                          type="number" min={40} max={300} value={tempo}
                          onChange={(e) => setTempo(Math.max(40, Math.min(300, Number(e.target.value) || 120)))}
                          className="led-input bg-transparent text-[14px] font-['Press_Start_2P',cursive] w-[80px] text-center outline-none px-[12px] py-[8px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handlePlayback}
                      className={`${isPlaying ? 'synth-btn-stop' : 'synth-btn-play'} content-stretch flex gap-[6px] items-center justify-center px-[14px] py-[8px] relative rounded-[4px] shrink-0 cursor-pointer`}
                    >
                      <div className="relative shrink-0 size-[16px]">
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
                  </div>

                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0 flex-wrap">
                    <button onClick={() => setShowEffectsPanel((v) => !v)} className={`synth-btn-chrome content-stretch flex gap-[6px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer rounded-[4px] ${showEffectsPanel ? 'synth-toggle-on' : ''}`}>
                      <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                        <circle cx="4" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                        <line x1="4" y1="7" x2="4" y2="15" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                        <line x1="12" y1="1" x2="12" y2="9" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                      <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em]">FX</p>
                    </button>
                    <button onClick={() => setShowWaveforms((v) => !v)} className={`synth-btn-chrome content-stretch flex gap-[6px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer rounded-[4px] ${showWaveforms ? 'synth-toggle-on' : ''}`}>
                      <svg className="shrink-0 size-[14px]" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8 Q3 3, 5 8 T9 8 T13 8 T16 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                      <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em]">WAVES</p>
                    </button>
                    <button onClick={() => { setShowSaveModal(true); setSaveName(''); setOverwriteConfirmName(null); }} className="synth-btn-chrome content-stretch flex gap-[6px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer rounded-[4px]">
                      <svg className="shrink-0 size-[14px]" fill="none" viewBox="0 0 17.75 14"><path d={svgPaths.pb0ea00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                      <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em]">SAVE</p>
                    </button>
                    <button onClick={() => { setShowOpenModal(true); setDeleteConfirmName(null); }} className="synth-btn-chrome content-stretch flex gap-[6px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer rounded-[4px]">
                      <svg className="shrink-0 size-[14px]" fill="none" viewBox="0 0 18.4272 15.25"><path d={svgPaths.p14df6180} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                      <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em]">OPEN</p>
                    </button>
                    <button onClick={handleNewBeat} className="synth-btn-chrome content-stretch flex gap-[6px] items-center justify-center px-[12px] py-[8px] relative shrink-0 cursor-pointer rounded-[4px]">
                      <svg className="shrink-0 size-[14px]" fill="none" viewBox="0 0 15.25 17.75"><path d={svgPaths.p2543cf1} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                      <p className="font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em]">NEW</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <SequencerGrid grid={grid} currentStep={currentStep} onToggleCell={toggleCell} />
          </div>

          <EffectsPanel open={showEffectsPanel} values={fxValues} swingRef={swingRef} onChange={handleFxChange} onReset={handleResetEffects} />
        </div>

        {/* Waveforms */}
        <div className={`waveform-container mt-[24px] w-screen -mx-[24px] transition-opacity duration-300 ${showWaveforms ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden="true">
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

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2a3a6a] retro-panel px-[40px] py-[16px]">
        <div className="flex items-center justify-center gap-[24px] font-['Press_Start_2P',cursive] text-[7px] text-[#7a8ab8]">
          <span>&copy; {new Date().getFullYear()} Beatz-maker</span>
          <Link to="/privacy" className="hover:text-[#ff2d78] transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[#ff2d78] transition-colors">Terms of Service</Link>
        </div>
      </footer>

      <CookieConsent />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setShowSaveModal(false)}>
          <div className="retro-panel border-2 border-[#2a3a6a] rounded-[12px] p-[24px] w-[400px] neon-border-pink" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['Press_Start_2P',cursive] text-[11px] text-[#e0e8f8] mb-[16px]">SAVE BEAT</h2>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setShowOpenModal(false)}>
          <div className="retro-panel border-2 border-[#2a3a6a] rounded-[12px] p-[24px] w-[400px] max-h-[500px] overflow-y-auto neon-border-pink" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['Press_Start_2P',cursive] text-[11px] text-[#e0e8f8] mb-[16px]">OPEN BEAT</h2>
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

