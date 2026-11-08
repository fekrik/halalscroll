import { CardWord, FeedCard } from './types';

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function getEveryAyahReciterFolder(reciterName = 'Mishary Rashid Alafasy'): string {
  if (reciterName.includes('Husary')) return 'Husary_128kbps';
  if (reciterName.includes('AbdulBaset')) return 'Abdul_Basit_Murattal_192kbps';
  return 'Alafasy_128kbps';
}

class SoundAndHapticsEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private rafId: number | null = null;
  private startTime = 0;
  private activeNodes: AudioNode[] = [];
  private activeHtmlAudio: HTMLAudioElement | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Tactile Haptic Choreography (Spec Section 2.3)
  public triggerHaptic(type: 'lightImpact' | 'selectionTick' | 'softSuccess') {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'lightImpact') navigator.vibrate(10);
        else if (type === 'selectionTick') navigator.vibrate(5);
        else if (type === 'softSuccess') navigator.vibrate([12, 40, 20]);
      }
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'selectionTick' || type === 'lightImpact') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'selectionTick' ? 240 : 155, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.028);
        gain.gain.setValueAtTime(type === 'selectionTick' ? 0.035 : 0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'softSuccess') {
        const freqs = [440, 554.37, 659.25];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.055);
          gain.gain.setValueAtTime(0.06, now + idx * 0.055);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.055 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.055);
          osc.stop(now + idx * 0.055 + 0.46);
        });
      }
    } catch {
      // Ignore audio permissions error prior to interaction
    }
  }

  // Isolated Arabic Word Pronunciation (Tab 2 & Word Popover)
  public speakArabicWord(word: CardWord) {
    this.triggerHaptic('selectionTick');
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word.arabic_word);
        utter.lang = 'ar-SA';
        utter.rate = 0.82;
        window.speechSynthesis.speak(utter);
      }
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const scale = [293.66, 329.63, 349.23, 392.00, 440.00, 466.16];
      const freq = scale[(word.word_position - 1) % scale.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.44);
    } catch {}
  }

  // Full Card Synchronized Word-by-Word Recitation (Streams Real Studio Qari MP3 for Quran Passages)
  public startCardRecitation(
    card: FeedCard,
    onTick: (activeWordIndex: number, progressRatio: number) => void,
    onComplete: () => void,
    reciterOverride?: string
  ) {
    this.stopRecitation();
    this.isPlaying = true;
    const words = card.words && card.words.length > 0 ? card.words : [];

    // If Quran card with surah/ayah numbers, stream real Qari MP3 queue from EveryAyah CDN
    if (typeof window !== 'undefined' && card.card_type === 'quran' && card.surah_or_book_num && card.ayah_start) {
      const folder = getEveryAyahReciterFolder(reciterOverride || card.reciter_name);
      const sNum = card.surah_or_book_num;
      const aStart = card.ayah_start;
      const aEnd = card.ayah_end && card.ayah_end >= aStart ? card.ayah_end : aStart;

      const urls: string[] = [];
      for (let a = aStart; a <= aEnd; a++) {
        urls.push(`https://everyayah.com/data/${folder}/${pad3(sNum)}${pad3(a)}.mp3`);
      }

      let currentTrack = 0;
      const playNextTrack = () => {
        if (!this.isPlaying || currentTrack >= urls.length) {
          this.isPlaying = false;
          onTick(-1, 1);
          onComplete();
          return;
        }
        const audio = new Audio(urls[currentTrack]);
        this.activeHtmlAudio = audio;

        const updateProgress = () => {
          if (!this.isPlaying || this.activeHtmlAudio !== audio) return;
          const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 6;
          const trackRatio = Math.min(1, audio.currentTime / dur);
          const overallRatio = (currentTrack + trackRatio) / urls.length;
          if (words.length > 0) {
            const wIdx = Math.min(words.length - 1, Math.floor(overallRatio * words.length));
            onTick(wIdx, overallRatio);
          } else {
            onTick(-1, overallRatio);
          }
          this.rafId = requestAnimationFrame(updateProgress);
        };

        audio.onplay = () => {
          this.rafId = requestAnimationFrame(updateProgress);
        };
        audio.onended = () => {
          currentTrack++;
          playNextTrack();
        };
        audio.onerror = () => {
          // Fallback to synthesized recitation if offline or CDN blocked
          this.startSynthesizedRecitation(card, onTick, onComplete);
        };
        audio.play().catch(() => {
          this.startSynthesizedRecitation(card, onTick, onComplete);
        });
      };

      playNextTrack();
      return;
    }

    this.startSynthesizedRecitation(card, onTick, onComplete);
  }

  private startSynthesizedRecitation(
    card: FeedCard,
    onTick: (activeWordIndex: number, progressRatio: number) => void,
    onComplete: () => void
  ) {
    const words = card.words && card.words.length > 0 ? card.words : [];
    const totalDurationMs = words.length > 0
      ? Math.max(...words.map(w => w.end_ms), words.length * 900)
      : 5500;

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(card.arabic_text_uthmani.replace(/۝/g, ' '));
        utter.lang = 'ar-SA';
        utter.rate = 0.78;
        window.speechSynthesis.speak(utter);
      }
    } catch {}

    const ctx = this.getContext();
    if (ctx) {
      const now = ctx.currentTime;
      const maqamNotes = [220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 293.66, 261.63];
      words.forEach((w, idx) => {
        const startSec = now + w.start_ms / 1000;
        const durSec = Math.max(0.35, (w.end_ms - w.start_ms) / 1000);
        const freq = maqamNotes[idx % maqamNotes.length];

        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        sub.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startSec);
        sub.frequency.setValueAtTime(freq * 0.5, startSec);

        gain.gain.setValueAtTime(0.0001, startSec);
        gain.gain.linearRampToValueAtTime(0.045, startSec + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0008, startSec + durSec);

        osc.connect(gain);
        sub.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startSec);
        sub.start(startSec);
        osc.stop(startSec + durSec + 0.02);
        sub.stop(startSec + durSec + 0.02);
        this.activeNodes.push(osc, sub, gain);
      });
    }

    this.startTime = performance.now();
    const loop = (nowMs: number) => {
      if (!this.isPlaying) return;
      const elapsed = nowMs - this.startTime;
      if (elapsed >= totalDurationMs) {
        this.isPlaying = false;
        onTick(-1, 1);
        onComplete();
        return;
      }

      let currentWordIdx = -1;
      for (let i = 0; i < words.length; i++) {
        if (elapsed >= words[i].start_ms && elapsed <= words[i].end_ms) {
          currentWordIdx = i;
          break;
        }
      }
      if (currentWordIdx === -1 && words.length > 0) {
        currentWordIdx = Math.min(
          words.length - 1,
          Math.floor((elapsed / totalDurationMs) * words.length)
        );
      }

      onTick(currentWordIdx, elapsed / totalDurationMs);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public stopRecitation() {
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.src = '';
      } catch {}
      this.activeHtmlAudio = null;
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {}
    }
    this.activeNodes = [];
  }
}

export const soundEngine = new SoundAndHapticsEngine();
