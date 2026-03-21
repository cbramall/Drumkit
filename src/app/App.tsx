import { useState, useEffect, useRef, useCallback } from 'react';
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

type Grid = Record<InstrumentName, boolean[]>;

type SavedBeat = { id?: string; grid: Grid; tempo: number };

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
    <div className="bg-[#18181b] relative shrink-0 w-full">
      <div className="flex flex-row items-center justify-end overflow-clip rounded-[inherit] size-full">
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
            <p className="font-['IBM_Plex_Mono',monospace] font-black italic leading-[normal] relative shrink-0 text-[#f8fafc] text-[36px]">Super Beats</p>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-[#3f3f47] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

// ─── Grid Cell ──────────────────────────────────────────────────

function GridCell({
  active,
  isCurrentStep,
  onClick,
}: {
  active: boolean;
  isCurrentStep: boolean;
  onClick: () => void;
}) {
  let bg = active ? 'bg-[#8200db]' : 'bg-[#18181b]';
  if (isCurrentStep && !active) bg = 'bg-[#27272a]';
  if (isCurrentStep && active) bg = 'bg-[#ad46ff]';

  return (
    <button
      onClick={onClick}
      className={`${bg} relative rounded-[8px] shrink-0 size-[40px] transition-colors duration-75 cursor-pointer hover:brightness-125`}
    >
      <div
        aria-hidden="true"
        className={`absolute border border-solid inset-0 pointer-events-none rounded-[8px] ${
          active ? 'border-[#ad46ff]' : 'border-[#4a5565]'
        } ${isCurrentStep ? 'border-[#ad46ff]' : ''}`}
      />
    </button>
  );
}

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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  // Load saved beats: from Supabase when logged in, else from localStorage
  useEffect(() => {
    if (user) {
      supabase
        .from('beats')
        .select('id, name, grid, tempo')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to fetch beats:', error);
            return;
          }
          const beats: Record<string, SavedBeat> = {};
          for (const row of data || []) {
            beats[row.name] = { id: row.id, grid: row.grid as Grid, tempo: row.tempo };
          }
          setSavedBeats(beats);
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
    const intervalMs = (60 / tempo / 4) * 1000; // 16th notes

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

  const toggleCell = (instrument: InstrumentName, step: number) => {
    setGrid((prev) => {
      const newGrid = { ...prev };
      newGrid[instrument] = [...prev[instrument]];
      newGrid[instrument][step] = !newGrid[instrument][step];
      return newGrid;
    });
  };

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
  };

  const confirmSave = async () => {
    if (!saveName.trim()) return;
    const name = saveName.trim();
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
        console.error('Failed to save beat:', error);
        return;
      }
      setSavedBeats((prev) => ({ ...prev, [name]: { id: data?.id, grid, tempo } }));
    } else {
      const newSaved = { ...savedBeats, [name]: { grid, tempo } };
      setSavedBeats(newSaved);
      localStorage.setItem('superbeats_saved', JSON.stringify(newSaved));
    }
    setShowSaveModal(false);
  };

  const handleOpenBeat = () => {
    setShowOpenModal(true);
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
      await supabase.from('beats').delete().eq('id', beat.id);
    }
    const newSaved = { ...savedBeats };
    delete newSaved[name];
    setSavedBeats(newSaved);
    if (!user) {
      localStorage.setItem('superbeats_saved', JSON.stringify(newSaved));
    }
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

      <div className="flex-1 flex flex-col px-[40px] py-[40px]">
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
                  <p className="font-['IBM_Plex_Mono',monospace] font-medium leading-[normal] not-italic text-[20px] whitespace-nowrap text-[#a8a8ed]">
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
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSaveModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Save Beat</h2>
            <input
              type="text"
              placeholder="Enter beat name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmSave()}
              autoFocus
              className="w-full bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[12px] py-[8px] text-[#f1f5f9] font-['IBM_Plex_Mono',monospace] text-[16px] outline-none focus:border-[#8200db] transition-colors"
            />
            <div className="flex gap-[8px] mt-[16px] justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-[16px] py-[8px] rounded-[8px] text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] font-medium hover:bg-[#27272a] transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmSave} className="px-[16px] py-[8px] rounded-[8px] bg-[#8200db] text-[#f8fafc] font-['IBM_Plex_Mono',monospace] font-medium hover:bg-[#9b20ef] transition-colors cursor-pointer border border-[#ad46ff]">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowOpenModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px] max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Open Beat</h2>
            {Object.keys(savedBeats).length === 0 ? (
              <p className="text-[#9f9fa9] font-['IBM_Plex_Mono',monospace] text-[16px]">No saved beats yet.</p>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {Object.keys(savedBeats).map((name) => (
                  <div key={name} className="flex items-center justify-between bg-[#27272a] border border-[#3f3f47] rounded-[8px] px-[12px] py-[10px]">
                    <button onClick={() => loadBeat(name)} className="text-[#f1f5f9] font-['IBM_Plex_Mono',monospace] font-medium text-[16px] hover:text-[#ad46ff] transition-colors cursor-pointer flex-1 text-left">
                      {name}
                    </button>
                    <button onClick={() => deleteBeat(name)} className="text-[#9f9fa9] hover:text-[#ef4444] transition-colors cursor-pointer ml-[8px] text-[14px]">
                      ✕
                    </button>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSignInModal(false)}>
          <div className="bg-[#18181b] border-2 border-[#3f3f47] rounded-[12px] p-[24px] w-[400px]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-['IBM_Plex_Mono',monospace] font-medium text-[20px] text-[#f8fafc] mb-[16px]">Log In</h2>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSignUpModal(false)}>
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