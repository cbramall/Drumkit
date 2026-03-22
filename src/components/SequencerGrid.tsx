import { useState, useEffect, useRef, useCallback, memo, type FC } from 'react';
import { INSTRUMENTS, INSTRUMENT_LABELS, STEPS, initAudio, playInstrument, type InstrumentName } from '@/lib/audio-engine';
import type { Grid } from '@/lib/types';

type InstrumentColors = {
  bg: string;
  hit: string;
  border: string;
  glow: string;
  label: string;
};

export const INSTRUMENT_COLORS: Record<InstrumentName, InstrumentColors> = {
  kick:        { bg: '#ff1744', hit: '#ff4569', border: '#ff6b8a', glow: 'rgba(255, 23, 68, 0.8)',   label: '#ff4569' },
  snare:       { bg: '#2979ff', hit: '#448aff', border: '#82b1ff', glow: 'rgba(41, 121, 255, 0.8)',  label: '#82b1ff' },
  openHiHat:   { bg: '#00e5ff', hit: '#18ffff', border: '#84ffff', glow: 'rgba(0, 229, 255, 0.8)',   label: '#18ffff' },
  closedHiHat: { bg: '#ffd600', hit: '#ffea00', border: '#ffff8d', glow: 'rgba(255, 234, 0, 0.8)',   label: '#ffea00' },
  clap:        { bg: '#d500f9', hit: '#e040fb', border: '#ea80fc', glow: 'rgba(213, 0, 249, 0.8)',   label: '#ea80fc' },
  tom:         { bg: '#ff6d00', hit: '#ff9100', border: '#ffab40', glow: 'rgba(255, 109, 0, 0.8)',   label: '#ff9100' },
  rimshot:     { bg: '#00e676', hit: '#69f0ae', border: '#b9f6ca', glow: 'rgba(0, 230, 118, 0.8)',   label: '#69f0ae' },
  cowbell:     { bg: '#ff4081', hit: '#ff80ab', border: '#ff80ab', glow: 'rgba(255, 64, 129, 0.8)',  label: '#ff80ab' },
};

// ─── Grid Cell ──────────────────────────────────────────────────

// B1: GridCell receives instrument+step as stable props and a single stable
// onToggleCell reference. This lets memo work — a cell only re-renders when
// its own `active` or `isCurrentStep` value changes, not on every App update.
const GridCell = memo(function GridCell({
  instrument,
  step,
  active,
  isCurrentStep,
  onToggleCell,
  ariaLabel,
  colors,
}: {
  instrument: InstrumentName;
  step: number;
  active: boolean;
  isCurrentStep: boolean;
  onToggleCell: (instrument: InstrumentName, step: number) => void;
  ariaLabel: string;
  colors: InstrumentColors;
}) {
  const [flash, setFlash] = useState<false | 'click' | 'play'>(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFiring = useRef(false);

  const triggerFlash = useCallback((source: 'click' | 'play') => {
    setFlash(source);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), source === 'click' ? 150 : 180);
  }, []);

  const handleClick = useCallback(() => {
    onToggleCell(instrument, step);
    triggerFlash('click');
  }, [onToggleCell, instrument, step, triggerFlash]);

  const isFiring = isCurrentStep && active;
  useEffect(() => {
    if (isFiring && !prevFiring.current) triggerFlash('play');
    prevFiring.current = isFiring;
  }, [isFiring, triggerFlash]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const isPlay = flash === 'play';
  const isClick = flash === 'click';

  const bg = isPlay
    ? `radial-gradient(circle at 35% 35%, ${colors.hit}, ${colors.bg} 70%)`
    : isClick
      ? `radial-gradient(circle at 35% 35%, ${colors.hit}99, ${colors.bg}dd 75%)`
      : active
        ? `radial-gradient(circle at 35% 35%, ${colors.hit}66, ${colors.bg}cc 80%)`
        : isCurrentStep ? '#111' : '#000';

  const borderColor = isPlay ? colors.hit
    : isClick ? colors.border
    : active ? colors.border
    : isCurrentStep ? '#3a4a7a' : '#1e2854';

  const boxShadow = isPlay
    ? `0 0 18px 6px ${colors.glow}, 0 0 40px 12px ${colors.glow}, inset 0 0 12px ${colors.glow}`
    : isClick
      ? `0 0 10px 3px ${colors.glow}88, inset 0 0 6px ${colors.glow}44`
      : 'none';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      style={{
        background: bg,
        boxShadow,
        borderColor,
        width: 'var(--cell)',
        height: 'var(--cell)',
        transition: flash
          ? 'background 40ms, box-shadow 40ms, border-color 40ms'
          : 'background 400ms ease-out, box-shadow 400ms ease-out, border-color 400ms ease-out',
      }}
      className="synth-cell relative rounded-[4px] shrink-0 cursor-pointer border-2 border-solid"
    >
      {active && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[2px] pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }}
        />
      )}
    </button>
  );
});

// ─── Sequencer Grid ─────────────────────────────────────────────

interface SequencerGridProps {
  grid: Grid;
  currentStep: number;
  onToggleCell: (instrument: InstrumentName, step: number) => void;
}

const SequencerGrid: FC<SequencerGridProps> = memo(function SequencerGrid({ grid, currentStep, onToggleCell }) {
  const [flashInst, setFlashInst] = useState<InstrumentName | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePreview = useCallback(async (inst: InstrumentName) => {
    await initAudio();
    playInstrument(inst);
    setFlashInst(inst);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashInst(null), 220);
  }, []);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  return (
    <div
      className="synth-grid-panel border-x-2 border-b-2 border-[#1a2050] rounded-bl-[4px] rounded-br-[4px] overflow-x-auto relative"
      style={{ padding: 'var(--grid-pad)' }}
    >
      <div className="min-w-fit relative z-[1]" style={{ display: 'flex', gap: 'var(--row-gap)', flexDirection: 'column' }}>

        {/* Header row: blank track label + step numbers */}
        <div className="flex" style={{ gap: 'var(--row-gap)' }}>
          {/* Empty corner above track labels */}
          <div className="flex items-center shrink-0" style={{ width: 'var(--track-w)', height: 'var(--header-h)' }}>
            <p className="font-['Press_Start_2P',cursive] text-[#3a4a7a] text-[5px] md:text-[7px] tracking-[0.1em]">TRACKS</p>
          </div>
          {/* Step numbers */}
          <div className="flex items-center" style={{ height: 'var(--header-h)' }}>
            {Array.from({ length: STEPS }, (_, i) => (
              <div
                key={i}
                style={{
                  color: currentStep === i ? '#ff2d78' : '#2a3a6a',
                  textShadow: currentStep === i ? '0 0 8px #ff2d7888, 0 0 18px #ff2d7844' : 'none',
                  marginLeft: i > 0 && i % 4 === 0 ? 'var(--cell-group-gap)' : i > 0 ? 'var(--cell-gap)' : '0',
                  width: 'var(--cell)',
                  height: 'var(--header-h)',
                }}
                className="flex items-center justify-center font-['Press_Start_2P',cursive] text-[6px] md:text-[8px] transition-colors shrink-0"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Instrument rows */}
        {INSTRUMENTS.map((inst) => {
          const c = INSTRUMENT_COLORS[inst];
          return (
            <div key={inst} className="flex" style={{ gap: 'var(--row-gap)', height: 'var(--row-h)' }}>
              {/* Track label — click to preview the sound */}
              <button
                type="button"
                onClick={() => handlePreview(inst)}
                aria-label={`Preview ${INSTRUMENT_LABELS[inst]}`}
                className="flex items-center shrink-0 cursor-pointer group"
                style={{ width: 'var(--track-w)', height: 'var(--row-h)' }}
              >
                <p
                  style={{
                    color: c.label,
                    textShadow: flashInst === inst
                      ? `0 0 6px ${c.label}, 0 0 14px ${c.label}cc, 0 0 28px ${c.label}88`
                      : `0 0 8px ${c.label}88, 0 0 20px ${c.label}44`,
                    transition: flashInst === inst ? 'text-shadow 40ms' : 'text-shadow 300ms ease-out',
                    filter: flashInst === inst ? `drop-shadow(0 0 4px ${c.label})` : 'none',
                  }}
                  className="font-['Press_Start_2P',cursive] leading-[1] text-[6px] md:text-[9px] whitespace-nowrap tracking-[0.05em]"
                >
                  {INSTRUMENT_LABELS[inst]}
                </p>
              </button>
              {/* Step cells */}
              <div className="flex items-center" style={{ height: 'var(--row-h)' }}>
                {Array.from({ length: STEPS }, (_, step) => (
                  <div
                    key={step}
                    style={{
                      marginLeft: step > 0 && step % 4 === 0 ? 'var(--cell-group-gap)' : step > 0 ? 'var(--cell-gap)' : '0',
                    }}
                  >
                    <GridCell
                      instrument={inst}
                      step={step}
                      active={grid[inst][step]}
                      isCurrentStep={currentStep === step}
                      onToggleCell={onToggleCell}
                      ariaLabel={`${INSTRUMENT_LABELS[inst]} step ${step + 1}${grid[inst][step] ? ', active' : ''}`}
                      colors={INSTRUMENT_COLORS[inst]}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SequencerGrid;
