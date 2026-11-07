import React, { useState, useEffect, useRef } from 'react';
import {
  X, Download, Film, Image as ImageIcon, Layers, Copy, Check,
  ExternalLink, Sparkles, Play, Square, Share2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { FeedCard } from '../types';
import { soundEngine } from '../audioEngine';

interface ShareStudioModalProps {
  card: FeedCard;
  initialSlide?: number;
  isPlusMember: boolean;
  onClose: () => void;
  onOpenWebCompanionPreview: (slug: string) => void;
}

type ShareFormat = '9:16' | '4:5' | '1:1';
type ShareMediaMode = 'static' | 'audiogram' | 'carousel';
type BackdropStyle = 'obsidian' | 'linen' | 'dusk' | 'emerald' | 'starry';

const BACKDROP_THEMES: Record<BackdropStyle, {
  name: string;
  bgStart: string;
  bgEnd: string;
  glow: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  badgeBg: string;
}> = {
  obsidian: {
    name: 'Minimal Obsidian',
    bgStart: '#090A0F',
    bgEnd: '#141824',
    glow: 'rgba(212, 175, 55, 0.25)',
    textPrimary: '#F4F1EA',
    textSecondary: '#B8B4AA',
    accent: '#F5D061',
    badgeBg: 'rgba(212, 175, 55, 0.16)'
  },
  linen: {
    name: 'Warm Linen',
    bgStart: '#FAF6EE',
    bgEnd: '#EFE6D5',
    glow: 'rgba(180, 134, 30, 0.18)',
    textPrimary: '#18181B',
    textSecondary: '#57534E',
    accent: '#9A6F12',
    badgeBg: 'rgba(168, 125, 32, 0.14)'
  },
  dusk: {
    name: 'Desert Dusk',
    bgStart: '#170E1C',
    bgEnd: '#2B1623',
    glow: 'rgba(245, 158, 11, 0.28)',
    textPrimary: '#FDF8F3',
    textSecondary: '#D8C4BC',
    accent: '#FBBF24',
    badgeBg: 'rgba(245, 158, 11, 0.18)'
  },
  emerald: {
    name: 'Madinah Emerald',
    bgStart: '#071713',
    bgEnd: '#0D2922',
    glow: 'rgba(16, 185, 129, 0.26)',
    textPrimary: '#F2FBF7',
    textSecondary: '#A7D7C5',
    accent: '#34D399',
    badgeBg: 'rgba(16, 185, 129, 0.18)'
  },
  starry: {
    name: 'Starry Night',
    bgStart: '#0A0D1D',
    bgEnd: '#171C3A',
    glow: 'rgba(129, 140, 248, 0.26)',
    textPrimary: '#F5F7FF',
    textSecondary: '#BDC4E6',
    accent: '#F5D061',
    badgeBg: 'rgba(129, 140, 248, 0.2)'
  }
};

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const ShareStudioModal: React.FC<ShareStudioModalProps> = ({
  card,
  initialSlide = 0,
  isPlusMember,
  onClose,
  onOpenWebCompanionPreview
}) => {
  const [format, setFormat] = useState<ShareFormat>('9:16');
  const [mediaMode, setMediaMode] = useState<ShareMediaMode>(initialSlide > 0 ? 'carousel' : 'static');
  const [backdrop, setBackdrop] = useState<BackdropStyle>('obsidian');
  const [carouselSlide, setCarouselSlide] = useState<number>(initialSlide);

  // Content Toggles
  const [showArabic, setShowArabic] = useState(true);
  const [showTranslit, setShowTranslit] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTakeaway, setShowTakeaway] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);

  // Audiogram / Video Reel State
  const [isPlayingAudiogram, setIsPlayingAudiogram] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const basePath = window.location.pathname.replace(/\/c\/.*$/, '').replace(/\/$/, '');
  const canonicalUrl = window.location.hostname.includes('github.io')
    ? `${window.location.origin}${basePath}/#/c/${card.share_slug}`
    : `${window.location.origin}/c/${card.share_slug}`;
  const displayUrl = `halalscroll.app/c/${card.share_slug}`;

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopRecitation();
    };
  }, []);

  // Draw the High-DPI Share Canvas whenever state or animation frame updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = format === '9:16' ? 1920 : format === '4:5' ? 1350 : 1080;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const theme = BACKDROP_THEMES[backdrop];

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, theme.bgStart);
    grad.addColorStop(1, theme.bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient Radial Glow
    const glowY = height * (0.35 + Math.sin(audioProgress * Math.PI * 2) * 0.05);
    const rad = ctx.createRadialGradient(width * 0.5, glowY, 40, width * 0.5, glowY, width * 0.68);
    rad.addColorStop(0, theme.glow);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle Decorative Frame Border
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.26;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(56, 56, width - 112, height - 112, 36);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 4. Header Pill: Source Title & Authenticity Badge
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accent;
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
    ctx.fillText(card.source_title.toUpperCase(), width / 2, 138);

    if (showBadge) {
      ctx.fillStyle = theme.textSecondary;
      ctx.font = '600 23px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(card.authenticity_grade || card.revelation_place || 'Verified Canonical', width / 2, 178);
    }

    // 5. Render Slide Content based on Mode (Static / Audiogram / 4-Slide Carousel)
    const activeSlide = mediaMode === 'carousel' ? carouselSlide : 0;

    if (activeSlide === 0) {
      // SLIDE 1 (or Static / Audiogram): Sacred Arabic + Translation + Takeaway
      let cursorY = height * 0.28;

      if (showArabic) {
        ctx.font = '400 54px "Geeza Pro", "Amiri Quran", serif';
        const words = card.words && card.words.length > 0
          ? card.words.map(w => w.arabic_word)
          : card.arabic_text_uthmani.split(/\s+/);

        if (mediaMode === 'audiogram' && words.length > 0) {
          // Word-by-word gold illumination in Audiogram mode
          const fullArabic = card.arabic_text_uthmani;
          const arLines = wrapCanvasText(ctx, fullArabic, width - 210);
          arLines.forEach((line, lIdx) => {
            ctx.fillStyle = theme.textPrimary;
            ctx.fillText(line, width / 2, cursorY + lIdx * 86);
          });
          cursorY += arLines.length * 86 + 32;

          // Active Illuminated Word Pill in Audiogram Mode
          if (activeWordIdx >= 0 && card.words[activeWordIdx]) {
            const w = card.words[activeWordIdx];
            ctx.fillStyle = theme.badgeBg;
            ctx.beginPath();
            ctx.roundRect(width / 2 - 280, cursorY - 42, 560, 108, 24);
            ctx.fill();
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = theme.accent;
            ctx.font = '700 44px serif';
            ctx.fillText(`${w.arabic_word}  —  “${w.translation_en}”`, width / 2, cursorY + 24);
            cursorY += 116;
          }
        } else {
          ctx.fillStyle = theme.textPrimary;
          const arLines = wrapCanvasText(ctx, card.arabic_text_uthmani, width - 200);
          arLines.forEach((line) => {
            ctx.fillText(line, width / 2, cursorY);
            cursorY += 84;
          });
          cursorY += 24;
        }
      }

      if (showTranslit && card.transliteration) {
        ctx.fillStyle = theme.textSecondary;
        ctx.font = 'italic 400 28px -apple-system, sans-serif';
        const trLines = wrapCanvasText(ctx, card.transliteration, width - 220);
        trLines.slice(0, 3).forEach((line) => {
          ctx.fillText(line, width / 2, cursorY);
          cursorY += 42;
        });
        cursorY += 24;
      }

      if (showTranslation) {
        ctx.fillStyle = theme.textPrimary;
        ctx.font = 'italic 400 38px Georgia, "Newsreader", serif';
        const enLines = wrapCanvasText(ctx, `“${card.translation_en_clear}”`, width - 200);
        enLines.forEach((line) => {
          ctx.fillText(line, width / 2, cursorY);
          cursorY += 56;
        });
        cursorY += 32;
      }

      if (showTakeaway && card.deep_study && cursorY < height - 300) {
        ctx.fillStyle = theme.badgeBg;
        const takeawayLines = wrapCanvasText(ctx, `✦ ${card.deep_study.key_takeaway}`, width - 260);
        const boxH = takeawayLines.length * 42 + 44;
        ctx.beginPath();
        ctx.roundRect(100, cursorY, width - 200, boxH, 22);
        ctx.fill();

        ctx.fillStyle = theme.accent;
        ctx.font = '600 27px -apple-system, sans-serif';
        takeawayLines.forEach((line, idx) => {
          ctx.fillText(line, width / 2, cursorY + 46 + idx * 42);
        });
        cursorY += boxH + 30;
      }

      // Audiogram Waveform Visualizer Bars
      if (mediaMode === 'audiogram') {
        const barCount = 32;
        const barWidth = 10;
        const gap = 8;
        const totalW = barCount * (barWidth + gap);
        const startX = (width - totalW) / 2;
        const baseY = height - 210;

        for (let i = 0; i < barCount; i++) {
          const wave = isPlayingAudiogram
            ? Math.abs(Math.sin(audioProgress * 28 + i * 0.45)) * 64 + 14
            : 16 + Math.sin(i * 0.5) * 8;
          ctx.fillStyle = i / barCount <= audioProgress ? theme.accent : theme.textSecondary;
          ctx.globalAlpha = i / barCount <= audioProgress ? 0.95 : 0.35;
          ctx.beginPath();
          ctx.roundRect(startX + i * (barWidth + gap), baseY - wave / 2, barWidth, wave, 5);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else if (activeSlide === 1 && card.deep_study) {
      // SLIDE 2: "What It Means" (Plain-English Breakdown)
      let cursorY = height * 0.27;
      ctx.fillStyle = theme.accent;
      ctx.font = '800 32px -apple-system, sans-serif';
      ctx.fillText('SLIDE 2 OF 4 • WHAT IT MEANS (TADABBUR)', width / 2, cursorY);
      cursorY += 74;

      ctx.fillStyle = theme.textPrimary;
      ctx.font = '400 36px -apple-system, sans-serif';
      const sumLines = wrapCanvasText(ctx, card.deep_study.plain_summary, width - 200);
      sumLines.forEach((line) => {
        ctx.fillText(line, width / 2, cursorY);
        cursorY += 56;
      });
      cursorY += 40;

      ctx.fillStyle = theme.accent;
      ctx.font = 'italic 600 34px Georgia, serif';
      const ktLines = wrapCanvasText(ctx, `“${card.deep_study.key_takeaway}”`, width - 220);
      ktLines.forEach((line) => {
        ctx.fillText(line, width / 2, cursorY);
        cursorY += 50;
      });
    } else if (activeSlide === 2) {
      // SLIDE 3: "Arabic Root Gem"
      const rootWord = card.words.find(w => w.root_occurrences > 0) || card.words[0];
      let cursorY = height * 0.26;
      ctx.fillStyle = theme.accent;
      ctx.font = '800 32px -apple-system, sans-serif';
      ctx.fillText('SLIDE 3 OF 4 • ARABIC ROOT GEM', width / 2, cursorY);
      cursorY += 90;

      if (rootWord) {
        ctx.fillStyle = theme.textPrimary;
        ctx.font = '700 84px serif';
        ctx.fillText(rootWord.arabic_word, width / 2, cursorY);
        cursorY += 70;

        ctx.fillStyle = theme.accent;
        ctx.font = '700 40px -apple-system, sans-serif';
        ctx.fillText(`Root: ${rootWord.root_arabic} (${rootWord.root_translit})`, width / 2, cursorY);
        cursorY += 64;

        ctx.fillStyle = theme.textPrimary;
        ctx.font = '400 36px -apple-system, sans-serif';
        const rmLines = wrapCanvasText(ctx, `Core Meaning: ${rootWord.root_meaning}`, width - 220);
        rmLines.forEach((line) => {
          ctx.fillText(line, width / 2, cursorY);
          cursorY += 52;
        });
        cursorY += 28;

        ctx.fillStyle = theme.textSecondary;
        ctx.font = '600 30px -apple-system, sans-serif';
        ctx.fillText(`Appears ${rootWord.root_occurrences || 'multiple'} times in the Quran`, width / 2, cursorY);
      }
    } else if (activeSlide === 3 && card.deep_study) {
      // SLIDE 4: "How to Live It Today" (Actionable Sunnah)
      let cursorY = height * 0.28;
      ctx.fillStyle = theme.accent;
      ctx.font = '800 32px -apple-system, sans-serif';
      ctx.fillText('SLIDE 4 OF 4 • HOW TO LIVE IT TODAY', width / 2, cursorY);
      cursorY += 86;

      ctx.fillStyle = theme.textPrimary;
      ctx.font = '600 42px Georgia, serif';
      const actLines = wrapCanvasText(ctx, card.deep_study.actionable_sunnah, width - 200);
      actLines.forEach((line) => {
        ctx.fillText(line, width / 2, cursorY);
        cursorY += 64;
      });
      cursorY += 48;

      ctx.fillStyle = theme.textSecondary;
      ctx.font = '500 26px -apple-system, sans-serif';
      ctx.fillText(card.deep_study.source_citation, width / 2, cursorY);
    }

    // 6. Footer Watermark & Canonical Deep Link
    if (showWatermark) {
      ctx.fillStyle = theme.textSecondary;
      ctx.font = '600 24px -apple-system, sans-serif';
      ctx.fillText(`Halal Scroll: Quran & Sunnah  •  ${displayUrl}`, width / 2, height - 102);
    }
  }, [
    card, format, mediaMode, backdrop, carouselSlide,
    showArabic, showTranslit, showTranslation, showTakeaway, showBadge, showWatermark,
    isPlayingAudiogram, activeWordIdx, audioProgress
  ]);

  const handleToggleAudiogramPreview = () => {
    if (isPlayingAudiogram) {
      soundEngine.stopRecitation();
      setIsPlayingAudiogram(false);
      setActiveWordIdx(-1);
      setAudioProgress(0);
    } else {
      setMediaMode('audiogram');
      setIsPlayingAudiogram(true);
      soundEngine.startCardRecitation(
        card,
        (wordIdx, progress) => {
          setActiveWordIdx(wordIdx);
          setAudioProgress(progress);
        },
        () => {
          setIsPlayingAudiogram(false);
          setActiveWordIdx(-1);
          setAudioProgress(0);
        }
      );
    }
  };

  const handleDownloadPng = (slideOverride?: number) => {
    soundEngine.triggerHaptic('softSuccess');
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const suffix = mediaMode === 'carousel' ? `-slide-${(slideOverride ?? carouselSlide) + 1}` : `-${format.replace(':', 'x')}`;
    a.download = `halal-scroll-${card.share_slug}${suffix}.png`;
    a.href = dataUrl;
    a.click();
    setShareToast('Saved Ultra-HD PNG Card to your device!');
    setTimeout(() => setShareToast(null), 3200);
  };

  const handleRecordAndExportVideoReel = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      handleDownloadPng();
      return;
    }
    setMediaMode('audiogram');
    setIsRecordingVideo(true);
    setIsPlayingAudiogram(true);

    const stream = canvas.captureStream(30);
    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `halal-scroll-reel-${card.share_slug}.webm`;
      a.click();
      setIsRecordingVideo(false);
      setShareToast('Exported synced 9:16 Video Audiogram Reel!');
      setTimeout(() => setShareToast(null), 3500);
    };

    recorder.start();
    soundEngine.startCardRecitation(
      card,
      (wordIdx, progress) => {
        setActiveWordIdx(wordIdx);
        setAudioProgress(progress);
      },
      () => {
        setIsPlayingAudiogram(false);
        setActiveWordIdx(-1);
        setAudioProgress(0);
        if (recorder.state !== 'inactive') recorder.stop();
      }
    );
  };

  const handleNativePlatformShare = async (platform: 'instagram' | 'tiktok' | 'whatsapp' | 'x') => {
    soundEngine.triggerHaptic('lightImpact');
    const shareText = `“${card.translation_en_clear}” — ${card.source_title}\n\nRead with Word-by-Word Arabic Roots & Classical Tafsir on Halal Scroll:\n${canonicalUrl}`;

    if (platform === 'whatsapp') {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setShareToast('Opened WhatsApp share sheet with formatted Ayah & deep link!');
    } else if (platform === 'x') {
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(xUrl, '_blank', 'noopener,noreferrer');
      setShareToast('Opened X / Post composer with OpenGraph card preview!');
    } else if (platform === 'instagram' || platform === 'tiktok') {
      handleDownloadPng();
      setShareToast(
        platform === 'instagram'
          ? 'Exported 9:16 Story asset ready for Instagram Stories / Reels!'
          : 'Exported high-retention slide ready for TikTok Photo/Reel Mode!'
      );
    }
    setTimeout(() => setShareToast(null), 3500);
  };

  const handleCopyDeepLink = async () => {
    soundEngine.triggerHaptic('softSuccess');
    try {
      await navigator.clipboard.writeText(canonicalUrl);
    } catch {}
    setCopiedLink(true);
    setShareToast(`Copied canonical link: ${displayUrl}`);
    setTimeout(() => {
      setCopiedLink(false);
      setShareToast(null);
    }, 2800);
  };

  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}>
              <Sparkles size={13} /> Studio-Grade Social Sharing Engine
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              Share Studio • {card.source_title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-specular)',
              color: 'var(--text-secondary)',
              borderRadius: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-scroll" style={{ flex: 1, padding: '16px 20px 28px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {shareToast && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid var(--accent-emerald)',
              color: '#F4F1EA',
              fontSize: 12.5,
              fontWeight: 600,
              textAlign: 'center'
            }}>
              ✓ {shareToast}
            </div>
          )}

          {/* Step 1 & 2 Controls: Media Mode + Aspect Ratio */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
            {/* Media Mode Selector */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'static', label: 'Static HD (PNG)', icon: <ImageIcon size={13} /> },
                { id: 'audiogram', label: 'Video Reel (Audiogram)', icon: <Film size={13} /> },
                { id: 'carousel', label: '4-Slide Carousel', icon: <Layers size={13} /> }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    soundEngine.triggerHaptic('selectionTick');
                    setMediaMode(m.id as ShareMediaMode);
                  }}
                  style={{
                    padding: '7px 11px',
                    borderRadius: 10,
                    fontSize: 11.5,
                    fontWeight: mediaMode === m.id ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    border: mediaMode === m.id ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                    background: mediaMode === m.id ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                    color: mediaMode === m.id ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* Aspect Ratio Selector */}
            <div style={{ display: 'flex', gap: 5 }}>
              {(['9:16', '4:5', '1:1'] as ShareFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    soundEngine.triggerHaptic('selectionTick');
                    setFormat(fmt);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 9,
                    fontSize: 11,
                    fontWeight: format === fmt ? 700 : 500,
                    cursor: 'pointer',
                    border: format === fmt ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                    background: format === fmt ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
                    color: format === fmt ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Live Offscreen/Preview Canvas Stage */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
            borderRadius: 20,
            background: 'rgba(0, 0, 0, 0.32)',
            border: '1px solid var(--border-specular)',
            position: 'relative'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                width: format === '9:16' ? 210 : format === '4:5' ? 250 : 250,
                height: format === '9:16' ? 373 : format === '4:5' ? 312 : 250,
                borderRadius: 16,
                boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.12)'
              }}
            />

            {/* Carousel Slide Switcher Overlay */}
            {mediaMode === 'carousel' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 12
              }}>
                <button
                  onClick={() => setCarouselSlide((prev) => (prev + 3) % 4)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-specular)',
                    color: 'var(--text-primary)',
                    borderRadius: 99,
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['1. Ayah/Hadith', '2. Meaning', '3. Root Gem', '4. Action'].map((lbl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselSlide(idx)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: carouselSlide === idx ? 700 : 500,
                        cursor: 'pointer',
                        border: carouselSlide === idx ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                        background: carouselSlide === idx ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                        color: carouselSlide === idx ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCarouselSlide((prev) => (prev + 1) % 4)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-specular)',
                    color: 'var(--text-primary)',
                    borderRadius: 99,
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Audiogram Controls */}
            {mediaMode === 'audiogram' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  onClick={handleToggleAudiogramPreview}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 99,
                    background: isPlayingAudiogram ? 'rgba(225, 29, 72, 0.22)' : 'rgba(212, 175, 55, 0.2)',
                    border: '1px solid var(--border-gold)',
                    color: 'var(--accent-gold-bright)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  {isPlayingAudiogram ? <Square size={13} /> : <Play size={13} />}
                  {isPlayingAudiogram ? 'Stop Preview' : 'Preview Synced Word Glow'}
                </button>
                <button
                  disabled={isRecordingVideo}
                  onClick={handleRecordAndExportVideoReel}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #D4AF37, #B48A1E)',
                    border: 'none',
                    color: '#090A0F',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <Film size={14} />
                  {isRecordingVideo ? 'Recording Live Reel...' : 'Export Video Reel'}
                </button>
              </div>
            )}
          </div>

          {/* Backdrop Theme Picker */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7 }}>
              Backdrop Theme:
            </div>
            <div className="no-scrollbar" style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
              {(Object.keys(BACKDROP_THEMES) as BackdropStyle[]).map((key) => {
                const t = BACKDROP_THEMES[key];
                const active = backdrop === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setBackdrop(key);
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '7px 12px',
                      borderRadius: 10,
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      border: active ? '1.5px solid var(--accent-gold-bright)' : '1px solid var(--border-specular)',
                      background: `linear-gradient(135deg, ${t.bgStart}, ${t.bgEnd})`,
                      color: t.textPrimary,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 99, background: t.accent }} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layer Visibility Toggles */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 7 }}>
              Card Elements:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'Arabic Script', val: showArabic, set: setShowArabic },
                { label: 'Transliteration', val: showTranslit, set: setShowTranslit },
                { label: 'English Translation', val: showTranslation, set: setShowTranslation },
                { label: 'Key Takeaway', val: showTakeaway, set: setShowTakeaway },
                { label: 'Authenticity Badge', val: showBadge, set: setShowBadge },
                { label: `Watermark ${isPlusMember ? '(Plus Unlocked)' : ''}`, val: showWatermark, set: setShowWatermark }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    soundEngine.triggerHaptic('selectionTick');
                    item.set(!item.val);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: item.val ? 700 : 500,
                    cursor: 'pointer',
                    border: item.val ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                    background: item.val ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
                    color: item.val ? 'var(--accent-gold-bright)' : 'var(--text-muted)'
                  }}
                >
                  {item.val ? '✓ ' : '+ '} {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Download & Export CTA */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => handleDownloadPng()}
              style={{
                flex: 1,
                padding: '13px 16px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #D4AF37, #B48A1E)',
                border: 'none',
                color: '#090A0F',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Download size={16} />
              {mediaMode === 'carousel'
                ? `Download Slide ${carouselSlide + 1} (Ultra-HD PNG)`
                : `Download ${format} Ultra-HD Card (PNG)`}
            </button>

            <button
              onClick={handleCopyDeepLink}
              style={{
                padding: '13px 16px',
                borderRadius: 14,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-gold)',
                color: 'var(--accent-gold-bright)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {copiedLink ? <Check size={15} /> : <Copy size={15} />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* One-Tap Native Social Destinations */}
          <div style={{
            padding: 14,
            borderRadius: 16,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-specular)'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
              One-Tap Native Platform Destinations &amp; Smart Web Link
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <button
                onClick={() => handleNativePlatformShare('instagram')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(225, 48, 108, 0.14)',
                  border: '1px solid rgba(225, 48, 108, 0.35)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>Instagram Story / Reel</span>
                <Share2 size={13} />
              </button>

              <button
                onClick={() => handleNativePlatformShare('tiktok')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(45, 212, 191, 0.14)',
                  border: '1px solid rgba(45, 212, 191, 0.35)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>TikTok Photo / Reel</span>
                <Share2 size={13} />
              </button>

              <button
                onClick={() => handleNativePlatformShare('whatsapp')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>WhatsApp Status / Chat</span>
                <ExternalLink size={13} />
              </button>

              <button
                onClick={() => handleNativePlatformShare('x')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-specular)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>X / Threads / iMessage</span>
                <ExternalLink size={13} />
              </button>
            </div>

            {/* Interactive Web Companion Deep Link Preview Button */}
            <button
              onClick={() => onOpenWebCompanionPreview(card.share_slug)}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px dashed var(--border-gold)',
                color: 'var(--accent-gold-bright)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <ExternalLink size={13} /> Preview Shared Web Companion Link (/c/{card.share_slug}) &amp; OpenGraph Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

