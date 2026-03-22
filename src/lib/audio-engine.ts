// Web Audio API drum synthesizer with 80's effects chain
let audioCtx: AudioContext | null = null;
const noiseBufferCache = new Map<number, AudioBuffer>();

// ─── Effects chain nodes ─────────────────────────────────────────
let effectsBus: GainNode | null = null;
let dryGain: GainNode | null = null;
let reverbSend: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let delayNode: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delaySend: GainNode | null = null;
let delayOutGain: GainNode | null = null;
let chorusSend: GainNode | null = null;
let chorusDelay: DelayNode | null = null;
let chorusLFO: OscillatorNode | null = null;
let chorusDepth: GainNode | null = null;
let chorusOutGain: GainNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let masterGain: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let analyserNode: AnalyserNode | null = null;

// ─── Effects state ───────────────────────────────────────────────
let fxState = {
  reverb: 0.3,
  delayAmount: 0.2,
  delayTime: 0.3,
  delayFeedbackVal: 0.4,
  dryWet: 0.3,
  filterCutoff: 20000,
  filterResonance: 1,
  chorus: 0,
  compression: 0,
  swing: 0,
};

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function buildImpulseResponse(ctx: AudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * 2);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      // Gated reverb: sharp initial reflections, then exponential decay with a gate cutoff
      const envelope = t < 0.08
        ? 1.0
        : Math.exp(-t * 4) * (t < 1.2 ? 1 : Math.exp(-(t - 1.2) * 12));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return buffer;
}

function initEffectsChain(ctx: AudioContext): void {
  if (effectsBus) return;

  effectsBus = ctx.createGain();
  effectsBus.gain.value = 1;

  // Analyser for VU meter
  analyserNode = ctx.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.8;

  filterNode = ctx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.value = fxState.filterCutoff;
  filterNode.Q.value = fxState.filterResonance;
  filterNode.connect(analyserNode);
  analyserNode.connect(ctx.destination);

  // Compressor between masterGain and filterNode
  compressorNode = ctx.createDynamicsCompressor();
  compressorNode.threshold.value = -6;
  compressorNode.knee.value = 4;
  compressorNode.ratio.value = 1;
  compressorNode.attack.value = 0.003;
  compressorNode.release.value = 0.15;
  compressorNode.connect(filterNode);

  masterGain = ctx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(compressorNode);

  // Dry path
  dryGain = ctx.createGain();
  dryGain.gain.value = 1 - fxState.dryWet;
  dryGain.connect(masterGain);

  // Reverb path
  reverbSend = ctx.createGain();
  reverbSend.gain.value = fxState.reverb;
  reverbNode = ctx.createConvolver();
  reverbNode.buffer = buildImpulseResponse(ctx);
  reverbGain = ctx.createGain();
  reverbGain.gain.value = fxState.dryWet;
  reverbSend.connect(reverbNode);
  reverbNode.connect(reverbGain);
  reverbGain.connect(masterGain);

  // Delay path
  delaySend = ctx.createGain();
  delaySend.gain.value = fxState.delayAmount;
  delayNode = ctx.createDelay(2.0);
  delayNode.delayTime.value = fxState.delayTime;
  delayFeedback = ctx.createGain();
  delayFeedback.gain.value = fxState.delayFeedbackVal;
  delayOutGain = ctx.createGain();
  delayOutGain.gain.value = fxState.dryWet;

  delaySend.connect(delayNode);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(delayOutGain);
  delayOutGain.connect(masterGain);

  // Chorus path: LFO-modulated delay for 80s thickness
  chorusSend = ctx.createGain();
  chorusSend.gain.value = fxState.chorus;
  chorusDelay = ctx.createDelay(0.1);
  chorusDelay.delayTime.value = 0.02;
  chorusLFO = ctx.createOscillator();
  chorusLFO.type = 'sine';
  chorusLFO.frequency.value = 1.5;
  chorusDepth = ctx.createGain();
  chorusDepth.gain.value = 0.003;
  chorusLFO.connect(chorusDepth);
  chorusDepth.connect(chorusDelay.delayTime);
  chorusLFO.start();
  chorusOutGain = ctx.createGain();
  chorusOutGain.gain.value = 1;
  chorusSend.connect(chorusDelay);
  chorusDelay.connect(chorusOutGain);
  chorusOutGain.connect(masterGain);

  // Route bus to all paths
  effectsBus.connect(dryGain);
  effectsBus.connect(reverbSend);
  effectsBus.connect(delaySend);
  effectsBus.connect(chorusSend);
}

function getEffectsBus(): AudioNode {
  const ctx = getAudioContext();
  initEffectsChain(ctx);
  return effectsBus!;
}

export async function initAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  initEffectsChain(ctx);
}

// ─── Effects setters ─────────────────────────────────────────────

export function setReverb(amount: number): void {
  fxState.reverb = amount;
  if (reverbSend) reverbSend.gain.value = amount;
}

export function setDelayAmount(amount: number): void {
  fxState.delayAmount = amount;
  if (delaySend) delaySend.gain.value = amount;
}

export function setDelayTime(time: number): void {
  fxState.delayTime = time;
  if (delayNode) delayNode.delayTime.value = time;
}

export function setDelayFeedback(fb: number): void {
  fxState.delayFeedbackVal = fb;
  if (delayFeedback) delayFeedback.gain.value = fb;
}

export function setDryWet(mix: number): void {
  fxState.dryWet = mix;
  if (dryGain) dryGain.gain.value = 1 - mix;
  if (reverbGain) reverbGain.gain.value = mix;
  if (delayOutGain) delayOutGain.gain.value = mix;
}

export function setFilterCutoff(hz: number): void {
  fxState.filterCutoff = hz;
  if (filterNode) filterNode.frequency.value = hz;
}

export function setFilterResonance(q: number): void {
  fxState.filterResonance = q;
  if (filterNode) filterNode.Q.value = q;
}

export function setChorus(amount: number): void {
  fxState.chorus = amount;
  if (chorusSend) chorusSend.gain.value = amount;
}

export function setCompression(amount: number): void {
  fxState.compression = amount;
  if (compressorNode) {
    compressorNode.ratio.value = 1 + amount * 11;
    compressorNode.threshold.value = -6 - amount * 18;
  }
}

export function setSwing(amount: number): void {
  fxState.swing = amount;
}

/** Default values for all effect parameters (matches initial `fxState`). */
export const EFFECTS_DEFAULTS = {
  reverb: 0.3,
  delayAmount: 0.2,
  delayTime: 0.3,
  delayFeedbackVal: 0.4,
  dryWet: 0.3,
  filterCutoff: 20000,
  filterResonance: 1,
  chorus: 0,
  compression: 0,
  swing: 0,
} as const;

/** Reset audio engine effects to defaults and update all nodes. */
export function resetEffectsToDefaults(): void {
  const d = EFFECTS_DEFAULTS;
  setReverb(d.reverb);
  setDelayAmount(d.delayAmount);
  setDelayTime(d.delayTime);
  setDelayFeedback(d.delayFeedbackVal);
  setDryWet(d.dryWet);
  setFilterCutoff(d.filterCutoff);
  setFilterResonance(d.filterResonance);
  setChorus(d.chorus);
  setCompression(d.compression);
  setSwing(d.swing);
}

export function getEffectsState() {
  return { ...fxState };
}

export function getAnalyser(): AnalyserNode | null {
  return analyserNode;
}

// ─── Noise buffer ────────────────────────────────────────────────

function getNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const key = Math.round(duration * 1000);
  let buffer = noiseBufferCache.get(key);
  if (!buffer) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBufferCache.set(key, buffer);
  }
  return buffer;
}

// ─── Instruments ─────────────────────────────────────────────────

export function playKick(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(bus);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.setValueAtTime(1.0, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.error('Kick error:', e);
  }
}

export function playSnare(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 0.2);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.15);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.2);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(oscGain);
    oscGain.connect(bus);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.error('Snare error:', e);
  }
}

export function playOpenHiHat(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.3);
  } catch (e) {
    console.error('Open HH error:', e);
  }
}

export function playClosedHiHat(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.06);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.1);
  } catch (e) {
    console.error('Closed HH error:', e);
  }
}

export function playClap(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    for (let i = 0; i < 3; i++) {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer(ctx, 0.03);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500;
      filter.Q.value = 0.5;
      const gain = ctx.createGain();
      const t = now + i * 0.012;
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.02);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bus);
      noise.start(t);
      noise.stop(t + 0.03);
    }

    const tail = ctx.createBufferSource();
    tail.buffer = getNoiseBuffer(ctx, 0.2);
    const tailFilter = ctx.createBiquadFilter();
    tailFilter.type = 'bandpass';
    tailFilter.frequency.value = 2500;
    tailFilter.Q.value = 0.3;
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.5, now + 0.036);
    tailGain.gain.linearRampToValueAtTime(0, now + 0.2);
    tail.connect(tailFilter);
    tailFilter.connect(tailGain);
    tailGain.connect(bus);
    tail.start(now + 0.036);
    tail.stop(now + 0.25);
  } catch (e) {
    console.error('Clap error:', e);
  }
}

export function playTom(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    // Fundamental sine sweep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    gain1.gain.setValueAtTime(0.8, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(bus);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second harmonic for body
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(bus);
    osc2.start(now);
    osc2.stop(now + 0.25);

    // Short noise burst for stick attack
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 0.03);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 600;
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.4, now);
    ng.gain.linearRampToValueAtTime(0, now + 0.025);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(bus);
    noise.start(now);
    noise.stop(now + 0.03);
  } catch (e) {
    console.error('Tom error:', e);
  }
}

export function playRimshot(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 0.03);
    osc.connect(oscGain);
    oscGain.connect(bus);
    osc.start(now);
    osc.stop(now + 0.04);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 0.04);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.04);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.04);
  } catch (e) {
    console.error('Rimshot error:', e);
  }
}

export function playCowbell(when?: number) {
  try {
    const ctx = getAudioContext();
    const now = when ?? ctx.currentTime;
    const bus = getEffectsBus();

    // Lower pitched oscillators for a deeper, more percussive cowbell
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.value = 340;
    osc2.frequency.value = 590;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.4;

    // Noise layer for metallic attack transient
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 0.02);
    const noiseBp = ctx.createBiquadFilter();
    noiseBp.type = 'bandpass';
    noiseBp.frequency.value = 3000;
    noiseBp.Q.value = 1;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.015);
    noise.connect(noiseBp);
    noiseBp.connect(noiseGain);
    noiseGain.connect(bus);
    noise.start(now);
    noise.stop(now + 0.02);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(bp);
    osc2.connect(bp);
    bp.connect(gain);
    gain.connect(bus);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  } catch (e) {
    console.error('Cowbell error:', e);
  }
}

// ─── Exports ─────────────────────────────────────────────────────

export const INSTRUMENTS = ['kick', 'snare', 'openHiHat', 'closedHiHat', 'clap', 'tom', 'rimshot', 'cowbell'] as const;
export type InstrumentName = (typeof INSTRUMENTS)[number];

export const INSTRUMENT_LABELS: Record<InstrumentName, string> = {
  kick: 'Kick',
  snare: 'Snare',
  openHiHat: 'Open Hi-hat',
  closedHiHat: 'Closed Hi-hat',
  clap: 'Claps',
  tom: 'Tom',
  rimshot: 'Rimshot',
  cowbell: 'Cowbell',
};

const playFns: Record<InstrumentName, (when?: number) => void> = {
  kick: playKick,
  snare: playSnare,
  openHiHat: playOpenHiHat,
  closedHiHat: playClosedHiHat,
  clap: playClap,
  tom: playTom,
  rimshot: playRimshot,
  cowbell: playCowbell,
};

/** Play an instrument immediately (no `when`) or at a precise AudioContext time. */
export function playInstrument(name: InstrumentName, when?: number) {
  playFns[name](when);
}

/** Return the current AudioContext time for lookahead scheduling. */
export function getAudioCurrentTime(): number {
  return getAudioContext().currentTime;
}

export const STEPS = 16;
