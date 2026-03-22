import { type MutableRefObject } from 'react';
import {
  setReverb,
  setDelayAmount,
  setDryWet,
  setFilterCutoff,
  setFilterResonance,
  setChorus,
  setCompression,
  setSwing,
} from '@/lib/audio-engine';

export interface EffectValues {
  reverb: number;
  delay: number;
  dryWet: number;
  chorus: number;
  compression: number;
  cutoff: number;
  resonance: number;
  swing: number;
}

interface EffectsPanelProps {
  open: boolean;
  values: EffectValues;
  swingRef: MutableRefObject<number>;
  onChange: (key: keyof EffectValues, value: number) => void;
  onReset: () => void;
}

export default function EffectsPanel({ open, values, swingRef, onChange, onReset }: EffectsPanelProps) {
  const { reverb, delay, dryWet, chorus, compression, cutoff, resonance, swing } = values;

  const sendSliders = [
    { label: 'REVERB',    val: Math.round(reverb * 100),      onChange: (v: number) => { onChange('reverb',      v / 100); setReverb(v / 100);      } },
    { label: 'DELAY',     val: Math.round(delay * 100),       onChange: (v: number) => { onChange('delay',       v / 100); setDelayAmount(v / 100); } },
    { label: 'DRY/WET',  val: Math.round(dryWet * 100),      onChange: (v: number) => { onChange('dryWet',      v / 100); setDryWet(v / 100);      } },
    { label: 'CHORUS',   val: Math.round(chorus * 100),      onChange: (v: number) => { onChange('chorus',      v / 100); setChorus(v / 100);      } },
    { label: 'COMPRESS', val: Math.round(compression * 100), onChange: (v: number) => { onChange('compression', v / 100); setCompression(v / 100); } },
  ];

  const cutoffPct = Math.round(Math.log(cutoff / 200) / Math.log(20000 / 200) * 100);
  const resPct    = Math.round((resonance - 0.1) / (20 - 0.1) * 100);
  const swingPct  = Math.round(swing * 100);

  return (
    <div className={`fx-panel border-2 border-l-0 border-[#1a2050] rounded-tr-[4px] rounded-br-[4px] ${open ? 'fx-panel-open' : ''}`}>
      <div className="p-[16px] flex flex-col gap-[24px] min-w-[208px]">

        <p className="font-['Press_Start_2P',cursive] text-[8px] text-[#e0e8f8] tracking-[0.1em]">SENDS</p>
        {sendSliders.map(({ label, val, onChange: onSlider }) => (
          <div key={label} className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between">
              <label className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#8aa0d4] tracking-[0.1em]">{label}</label>
              <span className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#00ffa0] w-[24px] text-right">{val}</span>
            </div>
            <input
              type="range" min={0} max={100} value={val}
              onChange={(e) => onSlider(Number(e.target.value))}
              className="synth-knob"
              style={{ '--val': val } as React.CSSProperties}
            />
          </div>
        ))}

        <div className="border-t border-[#1a2050] mt-[8px] mb-[4px]" />
        <p className="font-['Press_Start_2P',cursive] text-[8px] text-[#e0e8f8] tracking-[0.1em]">FILTER</p>

        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <label className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#8aa0d4] tracking-[0.1em]">CUTOFF</label>
            <span className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#00ffa0] w-[32px] text-right">
              {cutoff >= 1000 ? `${(cutoff / 1000).toFixed(1)}k` : Math.round(cutoff)}
            </span>
          </div>
          <input
            type="range" min={0} max={100} value={cutoffPct}
            onChange={(e) => {
              const hz = 200 * Math.pow(20000 / 200, Number(e.target.value) / 100);
              onChange('cutoff', hz); setFilterCutoff(hz);
            }}
            className="synth-knob"
            style={{ '--val': cutoffPct } as React.CSSProperties}
          />
        </div>

        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <label className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#8aa0d4] tracking-[0.1em]">RES</label>
            <span className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#00ffa0] w-[24px] text-right">{resPct}</span>
          </div>
          <input
            type="range" min={0} max={100} value={resPct}
            onChange={(e) => {
              const q = 0.1 + (Number(e.target.value) / 100) * (20 - 0.1);
              onChange('resonance', q); setFilterResonance(q);
            }}
            className="synth-knob"
            style={{ '--val': resPct } as React.CSSProperties}
          />
        </div>

        <div className="border-t border-[#1a2050] mt-[8px] mb-[4px]" />
        <p className="font-['Press_Start_2P',cursive] text-[8px] text-[#e0e8f8] tracking-[0.1em]">GROOVE</p>

        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <label className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#8aa0d4] tracking-[0.1em]">SWING</label>
            <span className="font-['Press_Start_2P',cursive] text-[6px] leading-[1] text-[#00ffa0] w-[24px] text-right">{swingPct}</span>
          </div>
          <input
            type="range" min={0} max={50} value={swingPct}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              onChange('swing', v); setSwing(v); swingRef.current = v;
            }}
            className="synth-knob"
            style={{ '--val': swingPct * 2 } as React.CSSProperties}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="synth-btn-chrome mt-[8px] w-full flex items-center justify-center px-[12px] py-[10px] rounded-[4px] cursor-pointer font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] text-[#8aa0d4] border border-[#2a3a6a]"
        >
          RESET DEFAULTS
        </button>
      </div>
    </div>
  );
}
