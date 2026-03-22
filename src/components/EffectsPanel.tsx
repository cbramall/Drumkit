import { memo, type CSSProperties } from 'react';
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
import type { EffectValues } from '@/lib/types';

export type { EffectValues };

interface EffectsPanelProps {
  open: boolean;
  values: EffectValues;
  onChange: (key: keyof EffectValues, value: number) => void;
  onReset: () => void;
}

function Slider({
  id,
  label,
  val,
  displayVal,
  min,
  max,
  onChange,
  cssVal,
}: {
  id: string;
  label: string;
  val: number;
  displayVal: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
  cssVal: number;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="font-['Press_Start_2P',cursive] text-[7px] leading-[1] text-[#8aa0d4] tracking-[0.1em]">
          {label}
        </label>
        <span className="font-['Press_Start_2P',cursive] text-[7px] leading-[1] text-[#00ffa0] w-[32px] text-right">
          {displayVal}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="synth-knob"
        style={{ '--val': cssVal } as CSSProperties}
      />
    </div>
  );
}

export default memo(function EffectsPanel({ open, values, onChange, onReset }: EffectsPanelProps) {
  const { reverb, delay, dryWet, chorus, compression, cutoff, resonance, swing } = values;

  const cutoffPct = Math.round(Math.log(cutoff / 200) / Math.log(20000 / 200) * 100);
  const resPct    = Math.round((resonance - 0.1) / (20 - 0.1) * 100);
  const swingPct  = Math.round(swing * 100);

  const sectionCls = "font-['Press_Start_2P',cursive] text-[8px] text-[#e0e8f8] tracking-[0.1em]";
  const dividerCls = "border-t border-[#1a2050]";

  return (
    <div className={`fx-panel border-2 border-t-0 md:border-t-2 md:border-l-0 border-[#1a2050] rounded-b-[4px] md:rounded-bl-none md:rounded-tr-[4px] md:rounded-br-[4px] ${open ? 'fx-panel-open' : ''}`}>
      <div className="p-[16px] flex flex-col gap-[20px] md:h-full">

        <h2 className="font-['Press_Start_2P',cursive] text-[11px] text-[#e0e8f8] tracking-[0.1em] pb-[10px] border-b border-[#1a2050]">
          EFFECTS
        </h2>

        {/* SENDS */}
        <p className={sectionCls}>SENDS</p>
        <Slider id="fx-reverb"   label="REVERB"   val={Math.round(reverb * 100)}      displayVal={String(Math.round(reverb * 100))}      min={0} max={100} cssVal={Math.round(reverb * 100)}      onChange={(v) => { onChange('reverb',      v / 100); setReverb(v / 100);      }} />
        <Slider id="fx-delay"    label="DELAY"    val={Math.round(delay * 100)}       displayVal={String(Math.round(delay * 100))}       min={0} max={100} cssVal={Math.round(delay * 100)}       onChange={(v) => { onChange('delay',       v / 100); setDelayAmount(v / 100); }} />
        <Slider id="fx-drywet"   label="DRY/WET"  val={Math.round(dryWet * 100)}      displayVal={String(Math.round(dryWet * 100))}      min={0} max={100} cssVal={Math.round(dryWet * 100)}      onChange={(v) => { onChange('dryWet',      v / 100); setDryWet(v / 100);      }} />
        <Slider id="fx-chorus"   label="CHORUS"   val={Math.round(chorus * 100)}      displayVal={String(Math.round(chorus * 100))}      min={0} max={100} cssVal={Math.round(chorus * 100)}      onChange={(v) => { onChange('chorus',      v / 100); setChorus(v / 100);      }} />
        <Slider id="fx-compress" label="COMPRESS" val={Math.round(compression * 100)} displayVal={String(Math.round(compression * 100))} min={0} max={100} cssVal={Math.round(compression * 100)} onChange={(v) => { onChange('compression', v / 100); setCompression(v / 100); }} />

        <div className={dividerCls} />

        {/* FILTER */}
        <p className={sectionCls}>FILTER</p>
        <Slider
          id="fx-cutoff" label="CUTOFF"
          val={cutoffPct} displayVal={cutoff >= 1000 ? `${(cutoff / 1000).toFixed(1)}k` : String(Math.round(cutoff))}
          min={0} max={100} cssVal={cutoffPct}
          onChange={(v) => { const hz = 200 * Math.pow(20000 / 200, v / 100); onChange('cutoff', hz); setFilterCutoff(hz); }}
        />
        <Slider
          id="fx-resonance" label="RES"
          val={resPct} displayVal={String(resPct)}
          min={0} max={100} cssVal={resPct}
          onChange={(v) => { const q = 0.1 + (v / 100) * (20 - 0.1); onChange('resonance', q); setFilterResonance(q); }}
        />

        <div className={dividerCls} />

        {/* GROOVE */}
        <p className={sectionCls}>GROOVE</p>
        <Slider
          id="fx-swing" label="SWING"
          val={swingPct} displayVal={String(swingPct)}
          min={0} max={50} cssVal={swingPct * 2}
          onChange={(v) => { const s = v / 100; onChange('swing', s); setSwing(s); }}
        />

        <button
          type="button"
          onClick={onReset}
          className="synth-btn-chrome mt-auto w-full flex items-center justify-center px-[12px] py-[10px] rounded-[4px] cursor-pointer font-['Press_Start_2P',cursive] text-[7px] tracking-[0.05em] text-[#8aa0d4] border border-[#2a3a6a]"
        >
          RESET DEFAULTS
        </button>
      </div>
    </div>
  );
});
