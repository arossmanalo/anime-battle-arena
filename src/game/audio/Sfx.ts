import Phaser from 'phaser';
import { sfxKey, type SfxName } from '../assets';

export interface SfxOptions {
  /** Seconds, for sustained sounds (beam, charge, domain). */
  duration?: number;
  /** Volume multiplier. */
  volume?: number;
}

/** Minimum gap between two plays of the same sound, so rapid beam ticks don't stack into noise. */
const MIN_GAP: Partial<Record<SfxName, number>> = { hit: 0.05, hitHeavy: 0.08, shoot: 0.03 };
const MASTER_VOLUME = 0.5;
const MUTE_STORAGE_KEY = 'aba.muted';

/**
 * Sound effects. Every sound is synthesized with Web Audio, so the game has audio with zero files.
 * Dropping public/assets/sfx/<name>.ogg (or .mp3/.wav) replaces the synthesized version.
 */
export class Sfx {
  private readonly ctx: AudioContext | null;
  private readonly out: AudioNode | null;
  private readonly noiseBuffer: AudioBuffer | null;
  private readonly lastPlayed = new Map<SfxName, number>();
  /** Tracked here because Phaser's mute getter reads an audio-node value that updates asynchronously. */
  private isMuted = false;

  constructor(private readonly game: Phaser.Game) {
    const sm = game.sound;
    if (sm instanceof Phaser.Sound.WebAudioSoundManager) {
      this.ctx = sm.context;
      // Route through Phaser's mute node so game.sound.mute silences synthesized sounds too.
      const master = this.ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(sm.masterMuteNode);
      this.out = master;
      this.noiseBuffer = this.makeNoise();
    } else {
      this.ctx = null;
      this.out = null;
      this.noiseBuffer = null;
    }
    try {
      this.isMuted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
      // Storage blocked: start unmuted.
    }
    game.sound.mute = this.isMuted;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.game.sound.mute = this.isMuted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, this.isMuted ? '1' : '0');
    } catch {
      // Not persisted; fine.
    }
    return this.isMuted;
  }

  play(name: SfxName, opts: SfxOptions = {}): void {
    const now = this.ctx?.currentTime ?? performance.now() / 1000;
    const gap = MIN_GAP[name] ?? 0;
    if (gap && now - (this.lastPlayed.get(name) ?? -1) < gap) return;
    this.lastPlayed.set(name, now);

    const key = sfxKey(name);
    if (this.game.cache.audio.exists(key)) {
      this.game.sound.play(key, { volume: opts.volume ?? 1 });
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.synth(name, opts.duration ?? 1, opts.volume ?? 1);
  }

  // ---- synthesis ------------------------------------------------------------------------------

  private synth(name: SfxName, dur: number, vol: number): void {
    const jitter = 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'hit':
        this.noise(0.08, 0.35 * vol, 'bandpass', 2200, 700);
        this.tone('square', 220 * jitter, 80, 0.08, 0.14 * vol);
        break;
      case 'hitHeavy':
        this.noise(0.25, 0.5 * vol, 'lowpass', 3000, 300);
        this.tone('sine', 130 * jitter, 40, 0.3, 0.6 * vol);
        break;
      case 'shoot':
        this.tone('square', 900 * jitter, 280, 0.1, 0.08 * vol);
        this.noise(0.05, 0.12 * vol, 'highpass', 3000, 3000);
        break;
      case 'beam':
        this.tone('sawtooth', 110, 90, dur, 0.12 * vol, 0.08);
        this.tone('sine', 220, 180, dur, 0.18 * vol, 0.08);
        this.noise(dur, 0.18 * vol, 'bandpass', 1200, 900, 0.08);
        break;
      case 'dash':
        this.noise(0.22, 0.3 * vol, 'bandpass', 400, 3200);
        break;
      case 'explosion':
        this.noise(0.7, 0.6 * vol, 'lowpass', 2500, 90);
        this.tone('sine', 85, 30, 0.6, 0.7 * vol);
        break;
      case 'buff':
        this.tone('sine', 400, 800, 0.35, 0.14 * vol);
        this.tone('sine', 600, 1200, 0.35, 0.1 * vol, 0.01, 0.06);
        break;
      case 'charge':
        this.tone('sawtooth', 140, 900, dur, 0.07 * vol, dur * 0.8);
        this.noise(dur, 0.1 * vol, 'bandpass', 300, 4000, dur * 0.8);
        break;
      case 'transform':
        for (const [i, f] of [262, 330, 392, 523].entries()) this.tone('triangle', f, f * 1.01, 1.3, 0.1 * vol, 0.4, i * 0.05);
        this.noise(1.2, 0.12 * vol, 'highpass', 4000, 8000, 0.5);
        this.tone('sine', 60, 40, 0.8, 0.5 * vol);
        break;
      case 'domain':
        this.tone('sine', 55, 52, 2.4, 0.4 * vol, 0.8);
        this.tone('sine', 82.5, 80, 2.4, 0.25 * vol, 0.8);
        this.tone('triangle', 660, 640, 2, 0.04 * vol, 1);
        this.noise(1.6, 0.15 * vol, 'lowpass', 200, 2000, 1.4);
        break;
      case 'ko':
        this.noise(1, 0.7 * vol, 'lowpass', 3000, 60);
        this.tone('sine', 200, 35, 1, 0.6 * vol);
        break;
      case 'fail':
        this.tone('square', 150, 140, 0.07, 0.08 * vol);
        this.tone('square', 120, 110, 0.07, 0.08 * vol, 0.01, 0.09);
        break;
      case 'click':
        this.tone('sine', 1200, 900, 0.05, 0.12 * vol);
        break;
      case 'fight':
        this.tone('square', 523, 523, 0.12, 0.08 * vol);
        this.tone('square', 1046, 1046, 0.3, 0.08 * vol, 0.01, 0.12);
        this.noise(0.4, 0.2 * vol, 'lowpass', 2000, 200, 0.01, 0.12);
        break;
    }
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Gain envelope: linear attack, exponential decay to silence at `dur`. */
  private envelope(peak: number, dur: number, attack: number, delay: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
    g.connect(this.out!);
    return g;
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, attack = 0.005, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    osc.connect(this.envelope(peak, dur, attack, delay));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, peak: number, filter: BiquadFilterType, f0: number, f1: number, attack = 0.005, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    src.connect(bq).connect(this.envelope(peak, dur, attack, delay));
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}

/** One Sfx per game, created on first use. */
export function sfx(scene: Phaser.Scene): Sfx {
  let s = scene.registry.get('sfx') as Sfx | undefined;
  if (!s) {
    s = new Sfx(scene.game);
    scene.registry.set('sfx', s);
  }
  return s;
}
