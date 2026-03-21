// Web Audio API drum synthesizer
let audioCtx: AudioContext | null = null;
const noiseBufferCache = new Map<number, AudioBuffer>();

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export async function initAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

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

export function playKick() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

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

export function playSnare() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Noise burst
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
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.2);

    // Body tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.error('Snare error:', e);
  }
}

export function playOpenHiHat() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

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
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.3);
  } catch (e) {
    console.error('Open HH error:', e);
  }
}

export function playClosedHiHat() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

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
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.1);
  } catch (e) {
    console.error('Closed HH error:', e);
  }
}

export function playClap() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Three short bursts
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
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.03);
    }

    // Reverb tail
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
    tailGain.connect(ctx.destination);
    tail.start(now + 0.036);
    tail.stop(now + 0.25);
  } catch (e) {
    console.error('Clap error:', e);
  }
}

export const INSTRUMENTS = ['kick', 'snare', 'openHiHat', 'closedHiHat', 'clap'] as const;
export type InstrumentName = (typeof INSTRUMENTS)[number];

export const INSTRUMENT_LABELS: Record<InstrumentName, string> = {
  kick: 'Kick',
  snare: 'Snare',
  openHiHat: 'Open Hi-hat',
  closedHiHat: 'Closed Hi-hat',
  clap: 'Claps',
};

const playFns: Record<InstrumentName, () => void> = {
  kick: playKick,
  snare: playSnare,
  openHiHat: playOpenHiHat,
  closedHiHat: playClosedHiHat,
  clap: playClap,
};

export function playInstrument(name: InstrumentName) {
  playFns[name]();
}

export const STEPS = 16;