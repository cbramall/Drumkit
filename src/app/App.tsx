import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router';
import svgPaths from '../imports/svg-9ke3e5drs7';
import {
  INSTRUMENTS,
  INSTRUMENT_LABELS,
  STEPS,
  playInstrument,
  initAudio,
  type InstrumentName,
} from './components/audio-engine';
import { useAuth } from './components/AuthProvider';
import { supabase } from '../lib/supabase';
import CookieConsent from './components/CookieConsent';

type Grid = Record<InstrumentName, boolean[]>;

type SavedBeat = { id?: string; grid: Grid; tempo: number };

const BEAT_NAME_MAX = 100;
const BEAT_NAME_PATTERN = /^[a-zA-Z0-9 _\-'.]+$/;

function createEmptyGrid(): Grid {
  const grid: Partial<Grid> = {};
  for (const inst of INSTRUMENTS) {
    grid[inst] = new Array(STEPS).fill(false);
  }
  return grid as Grid;
}

// ─── Navbar ─────────────────────────────────────────────────────

function Navbar({
  onSignUpClick,
  onSignInClick,
  user,
  onSignOut,
}: {
  onSignUpClick: () => void;
  onSignInClick: () => void;
  user: { email?: string } | null;
  onSignOut: () => void;
}) {
  return (
    <header className="bg-[#18181b] relative shrink-0 w-full">
      <nav className="flex flex-row items-center justify-end overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-end px-[40px] py-[24px] relative w-full">
          <div className="content-stretch flex gap-[8px] items-center justify-end relative z-10 shrink-0">
            {user ? (
              <>
                <p className="font-['IBM_Plex_Mono',monospace] font-medium text-[14px] text-[#9f9fa9] truncate max-w-[180px]">
                  {user.email}
                </p>
                <button
                  onClick={onSignOut}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">
                    Log Out
                  </p>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSignUpClick}
                  className="bg-[#8200db] content-stretch flex gap-[4px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 cursor-pointer hover:bg-[#9b20ef] transition-colors"
                >
                  <div aria-hidden="true" className="absolute border border-[#ad46ff] border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f8fafc] text-[16px]">Sign Up</p>
                </button>
                <button
                  onClick={onSignInClick}
                  className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:text-white transition-colors"
                >
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Log In</p>
                </button>
              </>
            )}
          </div>
          <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-[#8200db] content-stretch flex items-center justify-center left-1/2 px-[16px] py-[4px] top-[calc(50%+1px)] pointer-events-none">
            <h1 className="font-['IBM_Plex_Mono',monospace] font-black italic leading-[normal] relative shrink-0 text-[#f8fafc] text-[36px]">Super Beats</h1>
          </div>
        </div>
      </nav>
      <div aria-hidden="true" className="absolute border-[#3f3f47] border-b border-solid inset-0 pointer-events-none" />
    </header>
  );
}

// ─── Instrument Colors ──────────────────────────────────────────

type InstrumentColors = {
  bg: string;
  hit: string;
  border: string;
  glow: string;
  label: string;
};

const INSTRUMENT_COLORS: Record<InstrumentName, InstrumentColors> = {
  kick:        { bg: '#dc2626', hit: '#ef4444', border: '#f87171', glow: 'rgba(239, 68, 68, 0.7)',  label: '#f87171' },
  snare:       { bg: '#2563eb', hit: '#3b82f6', border: '#60a5fa', glow: 'rgba(59, 130, 246, 0.7)', label: '#60a5fa' },
  openHiHat:   { bg: '#0891b2', hit: '#06b6d4', border: '#22d3ee', glow: 'rgba(6, 182, 212, 0.7)', label: '#22d3ee' },
  closedHiHat: { bg: '#ca8a04', hit: '#eab308', border: '#facc15', glow: 'rgba(234, 179, 8, 0.7)', label: '#facc15' },
  clap:        { bg: '#c026d3', hit: '#d946ef', border: '#e879f9', glow: 'rgba(217, 70, 239, 0.7)', label: '#e879f9' },
};

// ─── Grid Cell ──────────────────────────────────────────────────

const GridCell = memo(function GridCell({
  active,
  isCurrentStep,
  onClick,
  ariaLabel,
  colors,
}: {
  active: boolean;
  isCurrentStep: boolean;
  onClick: () => void;
  ariaLabel: string;
  colors: InstrumentColors;
}) {
  const isFiring = isCurrentStep && active;

  let backgroundColor = active ? colors.bg : '#18181b';
  if (isCurrentStep && !active) backgroundColor = '#27272a';
  if (isFiring) backgroundColor = colors.hit;

  const borderColor = active || isCurrentStep ? colors.border : '#4a5565';
  const boxShadow = isFiring ? `0 0 12px 3px ${colors.glow}, 0 0 24px 6px ${colors.glow}` : 'none';

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{ backgroundColor, boxShadow, transition: 'background-color 75ms, box-shadow 75ms' }}
      className="relative rounded-[8px] shrink-0 size-[40px] cursor-pointer hover:brightness-125"
    >
      <div
        aria-hidden="true"
        style={{ borderColor }}
        className="absolute border border-solid inset-0 pointer-events-none rounded-[8px] transition-colors duration-75"
      />
    </button>
  );
});

// ─── Beat Maker ─────────────────────────────────────────────────

const modalInputClass =
  'w-full bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[12px] py-[8px] text-[#f1f5f9] font-[\'IBM_Plex_Mono\',monospace] text-[16px] outline-none focus:border-[#8200db] transition-colors';
const modalButtonClass =
  'px-[16px] py-[8px] rounded-[8px] font-[\'IBM_Plex_Mono\',monospace] font-medium transition-colors cursor-pointer';

export default function App() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [grid, setGrid] = useState<Grid>(createEmptyGrid);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);
  const [savedBeats, setSavedBeats] = useState<Record<string, SavedBeat>>({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string | null>(null);
  const [beatsLoading, setBeatsLoading] = useState(false);
  const [overwriteConfirmName, setOverwriteConfirmName] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;

  const savedBeatNames = useMemo(() => Object.keys(savedBeats), [savedBeats]);

  // Load saved beats: from Supabase when logged in, else from localStorage
  useEffect(() => {
    setBeatsLoading(true);
    if (user) {
      supabase
        .from('beats')
        .select('id, name, grid, tempo')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to fetch beats:', error);
            setSaveFeedback('Failed to load beats.');
            setTimeout(() => setSaveFeedback(null), 3000);
          } else {
            const beats: Record<string, SavedBeat> = {};
            for (const row of data || []) {
              beats[row.name] = { id: row.id, grid: row.grid as Grid, tempo: row.tempo };
            }
            setSavedBeats(beats);
          }
          setBeatsLoading(false);
        });
    } else {
      try {
        const saved = localStorage.getItem('superbeats_saved');
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, { grid: Grid; tempo: number }>;
          const withSavedBeat: Record<string, SavedBeat> = {};
          for (const [k, v] of Object.entries(parsed)) {
            withSavedBeat[k] = { grid: v.grid, tempo: v.tempo };
          }
          setSavedBeats(withSavedBeat);
        }
      } catch {}
      setBeatsLoading(false);
    }
  }, [user?.id]);

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const startPlayback = useCallback(() => {
    stopPlayback();
    setIsPlaying(true);
    let step = 0;
    const intervalMs = (60 / tempo / 4) * 1000;

    const tick = () => {
      setCurrentStep(step);
      const g = gridRef.current;
      for (const inst of INSTRUMENTS) {
        if (g[inst][step]) {
          playInstrument(inst);
        }
      }
      step = (step + 1) % STEPS;
    };

    tick();
    intervalRef.current = setInterval(tick, intervalMs);
  }, [tempo, stopPlayback]);

  // Restart interval when tempo changes during playback
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        setShowSaveModal(false);
        setShowOpenModal(false);
        setShowSignInModal(false);
        setShowSignUpModal(false);
        setDeleteConfirmName(null);
        return;
      }

      if (e.code === 'Space' && !isTyping) {
        e.preventDefault();
        if (isPlayingRef.current) {
          stopPlayback();
        } else {
          initAudio().then(() => {
            const ms = (60 / tempoRef.current / 4) * 1000;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsPlaying(true);
            let step = 0;
            const tick = () => {
              setCurrentStep(step);
              const g = gridRef.current;
              for (const inst of INSTRUMENTS) {
                if (g[inst][step]) playInstrument(inst);
              }
              step = (step + 1) % STEPS;
            };
            tick();
            intervalRef.current = setInterval(tick, ms);
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopPlayback]);

  const toggleCell = useCallback((instrument: InstrumentName, step: number) => {
    setGrid((prev) => {
      const newGrid = { ...prev };
      newGrid[instrument] = [...prev[instrument]];
      newGrid[instrument][step] = !newGrid[instrument][step];
      return newGrid;
    });
  }, []);

  const handlePlayback = async () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      await initAudio();
      startPlayback();
    }
  };

  const handleNewBeat = () => {
    stopPlayback();
    setGrid(createEmptyGrid());
    setTempo(120);
  };

  const handleSaveBeat = () => {
    setShowSaveModal(true);
    setSaveName('');
    setOverwriteConfirmName(null);
  };

  const executeSave = async (name: string) => {
    if (user) {
      const { data, error } = await supabase
        .from('beats')
        .upsert(
          { user_id: user.id, name, grid, tempo },
          { onConflict: 'user_id,name' }
        )
        .select('id')
        .single();
      if (error) {
        setSaveFeedback('Failed to save beat. Please try again.');
        setTimeout(() => setSaveFeedback(null), 3000);
        return;
      }
      setSavedBeats((prev) => ({ ...prev, [name]: { id: data?.id, grid, tempo } }));
    } else {
      const newSaved = { ...savedBeats, [name]: { grid, tempo } };
      setSavedBeats(newSaved);
      localStorage.setItem('superbeats_saved', JSON.stringify(newSaved));
    }
    setShowSaveModal(false);
    setOverwriteConfirmName(null);
    setSaveFeedback('Beat saved!');
    setTimeout(() => setSaveFeedback(null), 2000);
  };

  const confirmSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    if (name.length > BEAT_NAME_MAX) {
      setSaveFeedback(`Beat name must be ${BEAT_NAME_MAX} characters or fewer.`);
      setTimeout(() => setSaveFeedback(null), 3000);
      return;
    }
    if (!BEAT_NAME_PATTERN.test(name)) {
      setSaveFeedback('Beat name can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, and periods.');
      setTimeout(() => setSaveFeedback(null), 4000);
      return;
    }
    if (savedBeats[name] && overwriteConfirmName !== name) {
      setOverwriteConfirmName(name);
      return;
    }
    await executeSave(name);
  };

  const handleOpenBeat = () => {
    setShowOpenModal(true);
    setDeleteConfirmName(null);
  };

  const loadBeat = (name: string) => {
    const beat = savedBeats[name];
    if (beat) {
      stopPlayback();
      setGrid(beat.grid);
      setTempo(beat.tempo);
    }
    setShowOpenModal(false);
  };

  const deleteBeat = async (name: string) => {
    const beat = savedBeats[name];
    if (user && beat?.id) {
      const { error } = await supabase.from('beats').delete().eq('id', beat.id);
      if (error) {
        setSaveFeedback('Failed to delete beat. Please try again.');
        setTimeout(() => setSaveFeedback(null), 3000);
        return;
      }
    }
    const newSaved = { ...savedBeats };
    delete newSaved[name];
    setSavedBeats(newSaved);
    if (!user) {
      localStorage.setItem('superbeats_saved', JSON.stringify(newSaved));
    }
    setDeleteConfirmName(null);
  };

  const handleSignIn = async () => {
    setAuthError(null);
    const { error } = await signIn(authEmail, authPassword);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setShowSignInModal(false);
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleSignUp = async () => {
    setAuthError(null);
    const { error } = await signUp(authEmail, authPassword);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setShowSignUpModal(false);
    setAuthEmail('');
    setAuthPassword('');
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <Navbar
        onSignUpClick={() => {
          setAuthError(null);
          setShowSignUpModal(true);
        }}
        onSignInClick={() => {
          setAuthError(null);
          setShowSignInModal(true);
        }}
        user={user}
        onSignOut={signOut}
      />

      <main className="flex-1 flex flex-col px-[40px] py-[40px]">
        {/* Save feedback toast */}
        {saveFeedback && (
          <div className={`mb-[16px] px-[16px] py-[10px] rounded-[8px] font-['IBM_Plex_Mono',monospace] font-medium text-[14px] text-center transition-opacity ${
            saveFeedback.includes('Failed') ? 'bg-[#dc2626]/20 text-[#ef4444] border border-[#dc2626]/40' : 'bg-[#16a34a]/20 text-[#4ade80] border border-[#16a34a]/40'
          }`}>
            {saveFeedback}
          </div>
        )}

        {/* Playback Tools */}
        <div className="bg-[#18181b] relative rounded-tl-[12px] rounded-tr-[12px] shrink-0 w-full">
          <div className="overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex items-center justify-between px-[40px] py-[16px] relative w-full flex-wrap gap-[16px]">
              {/* Left toolbar */}
              <div className="content-stretch flex gap-[40px] items-center relative shrink-0 flex-wrap">
                <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] not-italic relative shrink-0 text-[#f1f5f9] text-[16px]">Tempo</p>
                  <div className="bg-[#27272a] content-stretch flex items-center justify-center relative rounded-[2px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[2px]" />
                    <input
                      type="number"
                      min={40}
                      max={300}
                      value={tempo}
                      onChange={(e) => setTempo(Math.max(40, Math.min(300, Number(e.target.value) || 120)))}
                      className="bg-transparent text-[#f1f5f9] text-[16px] font-['IBM_Plex_Mono',monospace] font-medium w-[60px] text-center outline-none px-[8px] py-[4px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handlePlayback}
                  className={`${isPlaying ? 'bg-[#dc2626]' : 'bg-[#8200db]'} content-stretch flex gap-[4px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 cursor-pointer hover:brightness-110 transition-all`}
                >
                  <div aria-hidden="true" className={`absolute border ${isPlaying ? 'border-[#ef4444]' : 'border-[#ad46ff]'} border-solid inset-0 pointer-events-none rounded-[8px]`} />
                  <div className="overflow-clip relative shrink-0 size-[20px]">
                    <div className="absolute inset-[12.5%]">
                      <div className="absolute inset-[-5%]">
                        {isPlaying ? (
                          <svg className="block size-full" fill="none" viewBox="0 0 16.5 16.5">
                            <rect x="3" y="3" width="4" height="10.5" rx="1" stroke="#F8FAFC" strokeWidth="1.5" />
                            <rect x="9.5" y="3" width="4" height="10.5" rx="1" stroke="#F8FAFC" strokeWidth="1.5" />
                          </svg>
                        ) : (
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.5 16.5">
                            <g>
                              <path d={svgPaths.p3031a300} stroke="#F8FAFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                              <path d={svgPaths.p2aad7200} stroke="#F8FAFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                            </g>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f8fafc] text-[16px]">
                    {isPlaying ? 'Stop' : 'Playback'}
                  </p>
                </button>
              </div>

              {/* Right toolbar */}
              <div className="content-stretch flex gap-[16px] items-center relative shrink-0 flex-wrap">
                <button onClick={handleSaveBeat} className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:bg-[#27272a] rounded-[8px] transition-colors">
                  <div className="bg-[#27272a] content-stretch flex items-center p-[4px] relative rounded-[4px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[4px]" />
                    <div className="overflow-clip relative rounded-[4px] shrink-0 size-[20px]">
                      <div className="absolute inset-[18.75%_9.38%]">
                        <div className="absolute inset-[-6%_-4.62%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.75 14">
                            <path d={svgPaths.pb0ea00} stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Save Beat</p>
                </button>
                <button onClick={handleOpenBeat} className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:bg-[#27272a] rounded-[8px] transition-colors">
                  <div className="bg-[#27272a] content-stretch flex items-center p-[4px] relative rounded-[4px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[4px]" />
                    <div className="overflow-clip relative rounded-[4px] shrink-0 size-[20px]">
                      <div className="absolute inset-[15.63%_7.68%]">
                        <div className="absolute inset-[-5.45%_-4.43%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.4272 15.25">
                            <path d={svgPaths.p14df6180} stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">Open Beat</p>
                </button>
                <button onClick={handleNewBeat} className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative shrink-0 cursor-pointer hover:bg-[#27272a] rounded-[8px] transition-colors">
                  <div className="bg-[#27272a] content-stretch flex items-center p-[4px] relative rounded-[4px] shrink-0">
                    <div aria-hidden="true" className="absolute border border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-[4px]" />
                    <div className="overflow-clip relative rounded-[4px] shrink-0 size-[20px]">
                      <div className="absolute inset-[9.38%_15.63%]">
                        <div className="absolute inset-[-4.62%_-5.45%]">
                          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.25 17.75">
                            <path d={svgPaths.p2543cf1} stroke="#99A1AF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] relative shrink-0 text-[#f1f5f9] text-[16px]">New Beat</p>
                </button>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="absolute border-2 border-[#3f3f47] border-solid inset-0 pointer-events-none rounded-tl-[12px] rounded-tr-[12px]" />
        </div>

        {/* Sequencer Grid */}
        <div className="bg-[#18181b]/50 border-x-2 border-b-2 border-[#3f3f47] rounded-bl-[12px] rounded-br-[12px] p-[24px] overflow-x-auto">
          <div className="flex gap-[8px] min-w-fit">
            {/* Track titles */}
            <div className="flex flex-col gap-[8px] shrink-0 w-[160px]">
              <div className="flex items-center p-[8px] h-[40px]">
                <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] not-italic text-[#3f3f47] text-[20px]">Tracks</p>
              </div>
              {INSTRUMENTS.map((inst) => (
                <div key={inst} className="flex items-center p-[8px] h-[56px]">
                  <p
                    style={{ color: INSTRUMENT_COLORS[inst].label }}
                    className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] not-italic text-[20px] whitespace-nowrap"
                  >
                    {INSTRUMENT_LABELS[inst]}
                  </p>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex flex-col gap-[8px]">
              {/* Step numbers */}
              <div className="flex gap-[16px] h-[40px] items-center">
                {Array.from({ length: STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`size-[40px] flex items-center justify-center font-['IBM_Plex_Mono',monospace] font-medium text-[14px] transition-colors ${
                      currentStep === i ? 'text-[#ad46ff]' : 'text-[#3f3f47]'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Instrument rows */}
              {INSTRUMENTS.map((inst) => (
                <div key={inst} className="flex gap-[16px] py-[8px]">
                  {Array.from({ length: STEPS }, (_, step) => (
                    <GridCell
                      key={step}
                      active={grid[inst][step]}
                      isCurrentStep={currentStep === step}
                      onClick={() => toggleCell(inst, step)}
                      ariaLabel={`${INSTRUMENT_LABELS[inst]} step ${step + 1}${grid[inst][step] ? ', active' : ''}`}
                      colors={INSTRUMENT_COLORS[inst]}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-[#3f3f47] bg-[#18181b] px-[40px] py-[16px]">
        <div className="flex items-center justify-center gap-[24px] font-['IBM_Plex_Mono',monospace] text-[12px] text-[#9f9fa9]">
          <span>&copy; {new Date().getFullYear()} Super Beats</span>
          <Link to="/privacy" className="hover:text-[#ad46ff] transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-[#ad46ff] transition-colors">Terms of Service</Link>
        </div>
      </footer>

      <CookieConsent />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setShowSaveModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Save Beat</h2>
            <input
              type="text"
              placeholder="Enter beat name..."
              value={saveName}
              onChange={(e) => { setSaveName(e.target.value); setOverwriteConfirmName(null); }}
              onKeyDown={(e) => e.key === 'Enter' && confirmSave()}
              maxLength={BEAT_NAME_MAX}
              autoFocus
              className="w-full bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[12px] py-[8px] text-[#f1f5f9] font-['IBM_Plex_Mono',monospace] text-[16px] outline-none focus:border-[#8200db] transition-colors"
            />
            {overwriteConfirmName && (
              <p className="mt-[12px] text-[#eab308] text-[13px] font-['IBM_Plex_Mono',monospace]">
                A beat named "{overwriteConfirmName}" already exists. Press Save again to overwrite it.
              </p>
            )}
            <div className="flex gap-[8px] mt-[16px] justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-[16px] py-[8px] rounded-[8px] text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] font-medium hover:bg-[#27272a] transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmSave} className={`px-[16px] py-[8px] rounded-[8px] font-['IBM_Plex_Mono',monospace] font-medium transition-colors cursor-pointer border ${overwriteConfirmName ? 'bg-[#ca8a04] text-[#f8fafc] hover:bg-[#eab308] border-[#eab308]' : 'bg-[#8200db] text-[#f8fafc] hover:bg-[#9b20ef] border-[#ad46ff]'}`}>
                {overwriteConfirmName ? 'Overwrite' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setShowOpenModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px] max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Open Beat</h2>
            {beatsLoading ? (
              <p className="text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] text-[16px]">Loading beats...</p>
            ) : savedBeatNames.length === 0 ? (
              <p className="text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] text-[16px]">No saved beats yet.</p>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {savedBeatNames.map((name) => (
                  <div key={name} className="flex items-center justify-between bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[12px] py-[10px]">
                    <button onClick={() => loadBeat(name)} className="text-[#f1f5f9] font-['IBM_Plex_Mono',monospace] font-medium text-[16px] hover:text-[#ad46ff] transition-colors cursor-pointer flex-1 text-left">
                      {name}
                    </button>
                    {deleteConfirmName === name ? (
                      <div className="flex gap-[6px] items-center ml-[8px] shrink-0">
                        <button onClick={() => deleteBeat(name)} className="text-[#ef4444] font-['IBM_Plex_Mono',monospace] text-[12px] font-medium hover:text-[#f87171] transition-colors cursor-pointer">
                          Delete
                        </button>
                        <button onClick={() => setDeleteConfirmName(null)} className="text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] text-[12px] font-medium hover:text-[#f1f5f9] transition-colors cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmName(name)} className="text-[#9f9fa9] hover:text-[#ef4444] transition-colors cursor-pointer ml-[8px] text-[14px]" aria-label={`Delete ${name}`}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-[16px]">
              <button onClick={() => setShowOpenModal(false)} className="px-[16px] py-[8px] rounded-[8px] text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] font-medium hover:bg-[#27272a] transition-colors cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In Modal */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setShowSignInModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Log In</h2>
            {authError && <p className="text-[#ef4444] text-[14px] mb-[12px]">{authError}</p>}
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              className={modalInputClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              className={`${modalInputClass} mt-[12px]`}
            />
            <div className="flex gap-[8px] mt-[16px] justify-end">
              <button onClick={() => setShowSignInModal(false)} className={`${modalButtonClass} text-[#9f9fa9] hover:bg-[#27272a]`}>Cancel</button>
              <button onClick={handleSignIn} className={`${modalButtonClass} bg-[#8200db] text-[#f8fafc] hover:bg-[#9b20ef] border border-[#ad46ff]`}>Log In</button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setShowSignUpModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Sign Up</h2>
            {authError && <p className="text-[#ef4444] text-[14px] mb-[12px]">{authError}</p>}
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className={modalInputClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignUp()}
              className={`${modalInputClass} mt-[12px]`}
            />
            <p className="mt-[12px] text-[#9f9fa9] text-[12px] font-['IBM_Plex_Mono',monospace]">
              By signing up you agree to our{' '}
              <Link to="/terms" className="text-[#ad46ff] hover:underline" onClick={() => setShowSignUpModal(false)}>Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-[#ad46ff] hover:underline" onClick={() => setShowSignUpModal(false)}>Privacy Policy</Link>.
            </p>
            <div className="flex gap-[8px] mt-[16px] justify-end">
              <button onClick={() => setShowSignUpModal(false)} className={`${modalButtonClass} text-[#9f9fa9] hover:bg-[#27272a]`}>Cancel</button>
              <button onClick={handleSignUp} className={`${modalButtonClass} bg-[#8200db] text-[#f8fafc] hover:bg-[#9b20ef] border border-[#ad46ff]`}>Sign Up</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
