import React, { useState } from 'react';
import { Sparkles, Check, X, Plus, BookOpen, Volume2, Compass, Heart } from 'lucide-react';
import { soundEngine } from '../audioEngine';

export interface HighlightGroup {
  id: string;
  label: string;
  subtitle: string;
  bg: string;
  border: string;
  color: string;
  enPatterns: string[];
  arPatterns: string[];
}

export const SACRED_HIGHLIGHT_GROUPS: HighlightGroup[] = [
  {
    id: 'allah',
    label: 'Allah & Divine Names',
    subtitle: 'Allah, Lord, Most Merciful (اللَّه • رَبّ • الرَّحْمَٰن)',
    bg: 'rgba(232, 201, 104, 0.24)',
    border: 'rgba(232, 201, 104, 0.58)',
    color: '#F7DF8B',
    enPatterns: ['allah', 'lord', 'almighty', 'compassionate', 'all-merciful', 'creator', 'most high'],
    arPatterns: ['الله', 'لله', 'بالله', 'تالله', 'والله', 'رب', 'ربك', 'ربنا', 'ربكم', 'ربهم', 'الرحمن', 'الرحيم', 'الغفور', 'العزيز', 'العليم', 'الحكيم']
  },
  {
    id: 'prophet',
    label: 'Prophet & Messenger ﷺ',
    subtitle: 'Prophet, Messenger, Muhammad (مُحَمَّد • رَسُول • نَبِيّ)',
    bg: 'rgba(16, 185, 129, 0.22)',
    border: 'rgba(16, 185, 129, 0.55)',
    color: '#6EE7B7',
    enPatterns: ['prophet', 'messenger', 'muhammad', 'apostle'],
    arPatterns: ['محمد', 'رسول', 'الرسول', 'رسوله', 'نبي', 'النبي', 'النبيين', 'المرسلين']
  },
  {
    id: 'mercy',
    label: 'Mercy & Forgiveness',
    subtitle: 'Mercy, Forgive, Repentance (رَحْمَة • مَغْفِرَة • تَوْبَة)',
    bg: 'rgba(244, 114, 182, 0.22)',
    border: 'rgba(244, 114, 182, 0.52)',
    color: '#F9A8D4',
    enPatterns: ['mercy', 'merciful', 'forgive', 'forgiveness', 'forgiving', 'repent', 'repentance', 'grace'],
    arPatterns: ['رحمة', 'رحمتي', 'رحمتك', 'مغفرة', 'يغفر', 'غفر', 'توبة', 'تاب', 'عفو']
  },
  {
    id: 'sabr',
    label: 'Patience, Relief & Peace',
    subtitle: 'Patience, Ease, Peace, Trust (صَبْر • يُسْر • سَلَام)',
    bg: 'rgba(96, 165, 250, 0.22)',
    border: 'rgba(96, 165, 250, 0.52)',
    color: '#93C5FD',
    enPatterns: ['patience', 'patient', 'steadfast', 'ease', 'relief', 'peace', 'tranquility', 'trust'],
    arPatterns: ['صبر', 'صبرا', 'الصبر', 'الصابرين', 'يسر', 'يسرا', 'اليسر', 'سكينة', 'سلام', 'توكل', 'يتوكل']
  },
  {
    id: 'akhirah',
    label: 'Paradise & Hereafter',
    subtitle: 'Paradise, Jannah, Hereafter (جَنَّة • الْآخِرَة)',
    bg: 'rgba(167, 139, 250, 0.22)',
    border: 'rgba(167, 139, 250, 0.52)',
    color: '#C4B5FD',
    enPatterns: ['paradise', 'jannah', 'garden', 'gardens', 'hereafter', 'eternal'],
    arPatterns: ['جنة', 'الجنة', 'جنات', 'الآخرة', 'الفردوس']
  }
];

function normalizeArabicForMatch(input: string): string {
  return (input || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED،؟:؛.!۝ۚۗۖۙۘ"“”'’()\[\]]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function normalizeEnglishForMatch(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, '')
    .replace(/'s$/g, '')
    .replace(/’s$/g, '')
    .trim();
}

export function matchWordHighlight(
  word: string,
  lang: 'ar' | 'en',
  activeGroupIds: string[],
  customWords: string[]
): { bg: string; border: string; color: string; label: string } | null {
  if (!word) return null;
  if (activeGroupIds.length === 0 && customWords.length === 0) return null;

  if (lang === 'ar') {
    const normAr = normalizeArabicForMatch(word);
    if (!normAr) return null;
    for (const grp of SACRED_HIGHLIGHT_GROUPS) {
      if (!activeGroupIds.includes(grp.id)) continue;
      for (const pat of grp.arPatterns) {
        const normPat = normalizeArabicForMatch(pat);
        if (normAr === normPat || (normPat.length >= 3 && (normAr === 'و' + normPat || normAr === 'ف' + normPat || normAr === 'ب' + normPat || normAr === 'ل' + normPat))) {
          return { bg: grp.bg, border: grp.border, color: grp.color, label: grp.label };
        }
      }
    }
    for (const cw of customWords) {
      const normCw = normalizeArabicForMatch(cw);
      if (normCw && normCw.length >= 2 && (normAr === normCw || normAr.includes(normCw))) {
        return {
          bg: 'rgba(251, 191, 36, 0.24)',
          border: 'rgba(251, 191, 36, 0.58)',
          color: '#FDE68A',
          label: `Custom: ${cw}`
        };
      }
    }
  } else {
    const normEn = normalizeEnglishForMatch(word);
    if (!normEn) return null;
    for (const grp of SACRED_HIGHLIGHT_GROUPS) {
      if (!activeGroupIds.includes(grp.id)) continue;
      for (const pat of grp.enPatterns) {
        if (normEn === pat) {
          return { bg: grp.bg, border: grp.border, color: grp.color, label: grp.label };
        }
      }
    }
    for (const cw of customWords) {
      const normCw = normalizeEnglishForMatch(cw);
      if (normCw && normCw.length >= 2 && normEn === normCw) {
        return {
          bg: 'rgba(251, 191, 36, 0.24)',
          border: 'rgba(251, 191, 36, 0.58)',
          color: '#FDE68A',
          label: `Custom: ${cw}`
        };
      }
    }
  }

  return null;
}

export const WordHighlighterModal: React.FC<{
  activeGroupIds: string[];
  customWords: string[];
  onToggleGroup: (id: string) => void;
  onAddCustomWord: (word: string) => void;
  onRemoveCustomWord: (word: string) => void;
  onClose: () => void;
}> = ({
  activeGroupIds,
  customWords,
  onToggleGroup,
  onAddCustomWord,
  onRemoveCustomWord,
  onClose
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    soundEngine.triggerHaptic('softSuccess');
    onAddCustomWord(trimmed);
    setInputVal('');
  };

  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '72%', maxHeight: 580 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab-handle" />
        <div style={{
          padding: '6px 20px 14px',
          borderBottom: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.06em' }}>
              Sacred Word Highlighter
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              Illuminate Key Names &amp; Themes
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-specular)',
              color: 'var(--text-secondary)',
              borderRadius: 99,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="drawer-scroll" style={{ flex: 1, padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Automatically highlight sacred names and concepts across both Arabic verses and English translations while you scroll.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SACRED_HIGHLIGHT_GROUPS.map((grp) => {
              const isOn = activeGroupIds.includes(grp.id);
              return (
                <button
                  key={grp.id}
                  onClick={() => {
                    soundEngine.triggerHaptic('selectionTick');
                    onToggleGroup(grp.id);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: isOn ? `1.5px solid ${grp.border}` : '1px solid var(--border-specular)',
                    background: isOn ? grp.bg : 'var(--surface-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: isOn ? grp.color : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: grp.color,
                        display: 'inline-block'
                      }} />
                      {grp.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>
                      {grp.subtitle}
                    </div>
                  </div>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    background: isOn ? grp.color : 'rgba(255,255,255,0.06)',
                    color: isOn ? '#090A0F' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isOn && <Check size={14} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Word Highlighter Input */}
          <div style={{
            marginTop: 6,
            padding: 14,
            borderRadius: 14,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-specular)'
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Highlight Custom Word (English or Arabic)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                placeholder="e.g., heart, prayer, قلب, نور..."
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-specular)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAdd}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-gold)',
                  background: 'rgba(212, 175, 55, 0.2)',
                  color: 'var(--accent-gold-bright)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {customWords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {customWords.map((cw) => (
                  <span
                    key={cw}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: 'rgba(251, 191, 36, 0.22)',
                      border: '1px solid rgba(251, 191, 36, 0.55)',
                      color: '#FDE68A',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {cw}
                    <button
                      onClick={() => onRemoveCustomWord(cw)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const OnboardingTutorialModal: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      badge: 'Welcome to Halal Scroll',
      title: 'Replace Doom-Scrolling with Sacred Stillness',
      desc: 'Swipe vertically just like Reels or TikTok through 14,600+ authentic passages from the Noble Quran, Sahih Hadith, and Prophetic Duas.',
      icon: <Sparkles size={28} style={{ color: '#F7DF8B' }} />,
      preview: (
        <div style={{
          padding: '16px 18px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(232, 201, 104, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 22, color: '#F4F1EA', fontFamily: 'var(--font-arabic)', marginBottom: 8 }}>
            فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            “So, surely with hardship comes ease.”
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--accent-gold-bright)', fontWeight: 700 }}>
            ↑ Swipe Up for Endless Inspiration • Double-Tap to Like ♥
          </div>
        </div>
      )
    },
    {
      badge: 'Read Your Way',
      title: 'For You, Sequential Khatmah & Moods',
      desc: 'Use the top bar to switch between a personalized For You stream, Sequential mode (starting from Surah Al-Fatihah 1:1 or Hadith #1), or Moods when you need comfort.',
      icon: <Compass size={28} style={{ color: '#6EE7B7' }} />,
      preview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <span style={{ padding: '6px 12px', borderRadius: 99, background: 'rgba(212,175,55,0.22)', border: '1px solid var(--border-gold)', fontSize: 12, fontWeight: 700, color: 'var(--accent-gold-bright)' }}>
              For You
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.45)', fontSize: 12, fontWeight: 700, color: '#6EE7B7' }}>
              Sequential (1:1 → 114)
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Moods
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
            Your reading position and bookmarks are automatically saved on your device.
          </div>
        </div>
      )
    },
    {
      badge: 'Synchronized Audio & Roots',
      title: 'Word-by-Word Recitation & Deep Study',
      desc: 'Tap the Speaker icon to hear Qari recitation with synchronized word highlighting, or tap any Arabic word to reveal its Trilateral Root and 5-layer Tafsir.',
      icon: <Volume2 size={28} style={{ color: '#93C5FD' }} />,
      preview: (
        <div style={{
          padding: 14,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-specular)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 8, direction: 'rtl', fontSize: 20 }}>
            <span style={{ padding: '2px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>بِسْمِ</span>
            <span style={{ padding: '2px 10px', borderRadius: 8, background: 'rgba(232,201,104,0.28)', border: '1px solid #E8C968', color: '#F7DF8B', fontWeight: 700 }}>ٱللَّهِ</span>
            <span style={{ padding: '2px 8px', borderRadius: 8, color: 'var(--text-secondary)' }}>ٱلرَّحْمَٰنِ</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--accent-emerald)', fontWeight: 600 }}>
            ✦ Active word glows in sync with the Qari’s voice
          </div>
        </div>
      )
    },
    {
      badge: 'Sacred Word Highlighter',
      title: 'Highlight “Allah”, “Prophet” & Custom Words',
      desc: 'Tap the Highlight icon on any card to color-code sacred words like Allah, Prophet ﷺ, Mercy, and Patience—or add your own custom words in Arabic or English.',
      icon: <BookOpen size={28} style={{ color: '#F9A8D4' }} />,
      preview: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          <span style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(232, 201, 104, 0.24)', border: '1px solid rgba(232, 201, 104, 0.58)', color: '#F7DF8B', fontSize: 12.5, fontWeight: 700 }}>
            Allah • اللَّه
          </span>
          <span style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(16, 185, 129, 0.22)', border: '1px solid rgba(16, 185, 129, 0.55)', color: '#6EE7B7', fontSize: 12.5, fontWeight: 700 }}>
            Prophet ﷺ • رَسُول
          </span>
          <span style={{ padding: '5px 12px', borderRadius: 99, background: 'rgba(244, 114, 182, 0.22)', border: '1px solid rgba(244, 114, 182, 0.52)', color: '#F9A8D4', fontSize: 12.5, fontWeight: 700 }}>
            Mercy • رَحْمَة
          </span>
        </div>
      )
    }
  ];

  const cur = slides[step];

  return (
    <div
      className="spring-sheet-backdrop"
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 26,
          padding: '26px 22px 22px',
          background: 'var(--bg-elevated, #10141f)',
          border: '1px solid var(--border-gold)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '4px 10px',
            borderRadius: 99,
            background: 'rgba(212, 175, 55, 0.16)',
            color: 'var(--accent-gold-bright)'
          }}>
            {cur.badge} ({step + 1}/{slides.length})
          </span>
          <button
            onClick={() => {
              soundEngine.triggerHaptic('selectionTick');
              onComplete();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Skip
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-specular)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {cur.icon}
          </div>
          <h2 style={{ fontSize: 18.5, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, margin: 0 }}>
            {cur.title}
          </h2>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
          {cur.desc}
        </p>

        {cur.preview}

        {/* Progress Dots + Next/Start CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setStep(idx)}
                style={{
                  width: idx === step ? 22 : 7,
                  height: 7,
                  borderRadius: 99,
                  background: idx === step ? 'var(--accent-gold-bright)' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setStep(step - 1);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 99,
                  border: '1px solid var(--border-specular)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                soundEngine.triggerHaptic('softSuccess');
                if (step < slides.length - 1) {
                  setStep(step + 1);
                } else {
                  onComplete();
                }
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 99,
                border: 'none',
                background: 'linear-gradient(135deg, #E8C968, #C99E32)',
                color: '#090A0F',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {step < slides.length - 1 ? 'Next →' : 'Start Scrolling'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
