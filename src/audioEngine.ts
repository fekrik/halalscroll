import { CardWord, FeedCard } from './types';
import { triggerNativeHaptic } from './nativeBridge';

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
      triggerNativeHaptic(type);
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

  private getSpokenAyahTokenGroups(card: FeedCard, arabicScript: 'uthmani' | 'indopak' = 'uthmani'): {
    allTokens: { text: string; weight: number; globalIdx: number }[];
    ayahGroups: { text: string; weight: number; globalIdx: number }[][];
  } {
    const fullArabic = arabicScript === 'indopak' && card.arabic_text_indopak
      ? card.arabic_text_indopak
      : card.arabic_text_uthmani;
    const rawTokens = fullArabic.split(/\s+/).filter(Boolean);
    const allTokens: { text: string; weight: number; globalIdx: number }[] = [];
    const ayahGroups: { text: string; weight: number; globalIdx: number }[][] = [[]];

    const calcPhoneticWeight = (tok: string): number => {
      const baseLetters = tok.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED،؟:؛.!۝]/g, '');
      const longVowels = (tok.match(/[اويآىٰٓ]/g) || []).length;
      const maddah = (tok.match(/[ٓ]/g) || []).length;
      return Math.max(1.2, 1.0 + baseLetters.length * 0.48 + longVowels * 0.85 + maddah * 1.4);
    };

    let globalIdx = 0;
    for (const tok of rawTokens) {
      if (tok.includes('۝')) {
        const curGroup = ayahGroups[ayahGroups.length - 1];
        if (curGroup.length > 0) {
          // Qari elongates (madd/waqf) the final word before verse end
          curGroup[curGroup.length - 1].weight += 1.65;
          ayahGroups.push([]);
        }
        continue;
      }
      const item = { text: tok, weight: calcPhoneticWeight(tok), globalIdx };
      allTokens.push(item);
      ayahGroups[ayahGroups.length - 1].push(item);
      globalIdx++;
    }

    const nonEmptyGroups = ayahGroups.filter(g => g.length > 0);
    if (nonEmptyGroups.length > 0) {
      const lastGroup = nonEmptyGroups[nonEmptyGroups.length - 1];
      lastGroup[lastGroup.length - 1].weight += 1.65;
    }
    return {
      allTokens,
      ayahGroups: nonEmptyGroups.length > 0 ? nonEmptyGroups : [allTokens]
    };
  }

  private pickTokenByWeight(
    group: { text: string; weight: number; globalIdx: number }[],
    ratio: number
  ): number {
    if (!group || group.length === 0) return -1;
    const clamped = Math.max(0, Math.min(0.9999, ratio));
    const totalWeight = group.reduce((acc, t) => acc + t.weight, 0);
    let target = clamped * totalWeight;
    for (let i = 0; i < group.length; i++) {
      target -= group[i].weight;
      if (target <= 0) return group[i].globalIdx;
    }
    return group[group.length - 1].globalIdx;
  }

  // Full Card Synchronized Word-by-Word Recitation (Streams Real Studio Qari MP3 for Quran Passages)
  public startCardRecitation(
    card: FeedCard,
    onTick: (activeWordIndex: number, progressRatio: number) => void,
    onComplete: () => void,
    reciterOverride?: string,
    arabicScript: 'uthmani' | 'indopak' = 'uthmani'
  ) {
    this.stopRecitation();
    this.isPlaying = true;
    const { allTokens, ayahGroups } = this.getSpokenAyahTokenGroups(card, arabicScript);

    // Ensure any browser speechSynthesis (word TTS) is completely silenced so only Qari recitation plays
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}

    // Resolve Surah & Ayah range (from numeric fields or canonical_ref fallback like "quran:94:5-6")
    let sNum = Number(card.surah_or_book_num) || 0;
    let aStart = Number(card.ayah_start) || 0;
    let aEnd = Number(card.ayah_end) || aStart;
    if (card.card_type === 'quran' && (!sNum || !aStart) && card.canonical_ref) {
      const m = card.canonical_ref.match(/^quran:(\d+):(\d+)(?:-(\d+))?/i);
      if (m) {
        sNum = Number(m[1]);
        aStart = Number(m[2]);
        aEnd = m[3] ? Number(m[3]) : aStart;
      }
    }

    // If Quran card with surah/ayah numbers, stream real Qari MP3 queue from EveryAyah CDN
    // Reuse a single HTMLAudioElement unlocked by the user's tap gesture so iOS WKWebView plays all ayahs seamlessly
    if (typeof window !== 'undefined' && card.card_type === 'quran' && sNum > 0 && aStart > 0) {
      const folder = getEveryAyahReciterFolder(reciterOverride || card.reciter_name);
      const finalEnd = aEnd >= aStart ? aEnd : aStart;

      const urls: string[] = [];
      for (let a = aStart; a <= finalEnd; a++) {
        urls.push(`https://everyayah.com/data/${folder}/${pad3(sNum)}${pad3(a)}.mp3`);
      }

      const sharedAudio = new Audio();
      sharedAudio.preload = 'auto';
      this.activeHtmlAudio = sharedAudio;
      let currentTrack = 0;

      const playNextTrack = () => {
        if (!this.isPlaying || this.activeHtmlAudio !== sharedAudio || currentTrack >= urls.length) {
          this.isPlaying = false;
          onTick(-1, 1);
          onComplete();
          return;
        }

        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }

        // Match this audio track to its corresponding ayah token group (or distribute across all tokens)
        const activeGroup = ayahGroups.length === urls.length
          ? ayahGroups[currentTrack]
          : allTokens.slice(
              Math.floor((currentTrack / urls.length) * allTokens.length),
              Math.max(1, Math.floor(((currentTrack + 1) / urls.length) * allTokens.length))
            );

        const updateProgress = () => {
          if (!this.isPlaying || this.activeHtmlAudio !== sharedAudio) return;
          const dur = sharedAudio.duration && isFinite(sharedAudio.duration) && sharedAudio.duration > 0.5 ? sharedAudio.duration : 6;
          // Trim leading (~0.24s) and trailing (~0.38s) breath/silence in EveryAyah studio recordings
          const leadIn = Math.min(0.24, dur * 0.06);
          const trailOut = Math.min(0.38, dur * 0.09);
          const effectiveDur = Math.max(0.4, dur - leadIn - trailOut);
          const effectiveTime = Math.max(0, sharedAudio.currentTime - leadIn);
          const trackRatio = Math.min(1, effectiveTime / effectiveDur);
          const overallRatio = (currentTrack + Math.min(1, sharedAudio.currentTime / dur)) / urls.length;

          const activeGlobalIdx = this.pickTokenByWeight(activeGroup, trackRatio);
          onTick(activeGlobalIdx, overallRatio);
          this.rafId = requestAnimationFrame(updateProgress);
        };

        sharedAudio.onplay = () => {
          if (!this.isPlaying || this.activeHtmlAudio !== sharedAudio) return;
          this.rafId = requestAnimationFrame(updateProgress);
        };
        sharedAudio.onended = () => {
          if (!this.isPlaying || this.activeHtmlAudio !== sharedAudio) return;
          currentTrack++;
          playNextTrack();
        };
        sharedAudio.onerror = () => {
          if (!this.isPlaying || this.activeHtmlAudio !== sharedAudio) return;
          // Advance to next track or silent visual pacing without triggering synthetic TTS voice
          currentTrack++;
          if (currentTrack < urls.length) {
            playNextTrack();
          } else {
            this.startSynthesizedRecitation(card, onTick, onComplete, arabicScript);
          }
        };

        sharedAudio.src = urls[currentTrack];
        sharedAudio.play().catch(() => {
          if (!this.isPlaying || this.activeHtmlAudio !== sharedAudio) return;
          this.startSynthesizedRecitation(card, onTick, onComplete, arabicScript);
        });
      };

      playNextTrack();
      return;
    }

    // For non-Quran cards (Hadith / Dua), pace word highlights smoothly without synthetic TTS voice
    this.startSynthesizedRecitation(card, onTick, onComplete, arabicScript);
  }

  private startSynthesizedRecitation(
    card: FeedCard,
    onTick: (activeWordIndex: number, progressRatio: number) => void,
    onComplete: () => void,
    arabicScript: 'uthmani' | 'indopak' = 'uthmani'
  ) {
    const { allTokens } = this.getSpokenAyahTokenGroups(card, arabicScript);
    const totalWeight = allTokens.reduce((acc, t) => acc + t.weight, 0);
    const totalDurationMs = Math.max(3200, Math.round(totalWeight * 360));

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

      const ratio = elapsed / totalDurationMs;
      const activeIdx = this.pickTokenByWeight(allTokens, ratio);
      onTick(activeIdx, ratio);
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
      const audioToStop = this.activeHtmlAudio;
      this.activeHtmlAudio = null;
      try {
        audioToStop.onplay = null;
        audioToStop.onended = null;
        audioToStop.onerror = null;
        audioToStop.pause();
        audioToStop.removeAttribute('src');
        audioToStop.load();
      } catch {}
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
