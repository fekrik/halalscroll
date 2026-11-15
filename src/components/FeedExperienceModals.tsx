import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Plus,
  BookOpen,
  Volume2,
  Compass,
  Heart,
  MessageCircle,
  Send,
  Search,
  Lock,
  Trash2,
  ChevronRight,
  Layers,
  Smartphone
} from 'lucide-react';
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
    bg: 'rgba(248, 113, 113, 0.22)',
    border: 'rgba(248, 113, 113, 0.55)',
    color: '#FCA5A5',
    enPatterns: ['prophet', 'messenger', 'muhammad', 'apostle'],
    arPatterns: ['محمد', 'رسول', 'الرسول', 'رسوله', 'نبي', 'النبي', 'النبيين', 'المرسلين']
  },
  {
    id: 'mercy',
    label: 'Mercy & Forgiveness',
    subtitle: 'Mercy, Forgive, Repentance (رَحْمَة • مَغْفِرَة • تَوْبَة)',
    bg: 'rgba(16, 185, 129, 0.22)',
    border: 'rgba(16, 185, 129, 0.52)',
    color: '#6EE7B7',
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

/**
 * Source-Aware Color-Coding (Partner Brief Section 2):
 * - Quran: Emerald Green (clearly marks Quranic verses as the word of Allah; Quranic Duas starting with Rabbana/Rabbi get a gold supplication badge)
 * - Hadith: Deep Red / Crimson (distinguishes Prophet Muhammad's ﷺ reported words from narrator text)
 * - Duas: Gold (makes supplications immediately recognizable)
 */
export function getSacredContentIdentity(card: {
  card_type: string;
  arabic_text_uthmani?: string;
  translation_clear_quran?: string;
}) {
  const isQuranicDua =
    card.card_type === 'quran' &&
    (/^(رَبَّنَا|رَبِّ|قَالَ رَبِّ|قَالَا رَبَّنَا)/.test((card.arabic_text_uthmani || '').trim()) ||
      /^(Our Lord|My Lord)/i.test((card.translation_clear_quran || '').trim()));

  if (card.card_type === 'quran') {
    return {
      id: isQuranicDua ? 'quran_dua' : 'quran',
      badgeLabel: isQuranicDua ? 'Quran • Quranic Dua' : 'Quran • Word of Allah',
      accentColor: isQuranicDua ? '#F7DF8B' : '#34D399',
      textTint: isQuranicDua ? 'var(--sacred-dua-color, #FDE68A)' : 'var(--sacred-quran-color, #6EE7B7)',
      pillBg: isQuranicDua ? 'rgba(232, 201, 104, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      pillBorder: isQuranicDua ? 'rgba(232, 201, 104, 0.5)' : 'rgba(16, 185, 129, 0.5)',
      quoteBg: isQuranicDua ? 'rgba(232, 201, 104, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      quoteBorder: isQuranicDua ? 'rgba(232, 201, 104, 0.35)' : 'rgba(16, 185, 129, 0.35)'
    };
  }

  if (card.card_type === 'hadith') {
    return {
      id: 'hadith',
      badgeLabel: 'Hadith • Words of the Prophet ﷺ',
      accentColor: '#F87171',
      textTint: 'var(--sacred-hadith-color, #FCA5A5)',
      pillBg: 'rgba(239, 68, 68, 0.18)',
      pillBorder: 'rgba(248, 113, 113, 0.48)',
      quoteBg: 'rgba(239, 68, 68, 0.09)',
      quoteBorder: 'rgba(248, 113, 113, 0.38)'
    };
  }

  return {
    id: 'dua',
    badgeLabel: card.card_type === 'dua' ? 'Dua • Sacred Supplication' : 'Seerah • Prophetic Biography',
    accentColor: '#F7DF8B',
    textTint: 'var(--sacred-dua-color, #FDE68A)',
    pillBg: 'rgba(232, 201, 104, 0.2)',
    pillBorder: 'rgba(232, 201, 104, 0.5)',
    quoteBg: 'rgba(232, 201, 104, 0.09)',
    quoteBorder: 'rgba(232, 201, 104, 0.38)'
  };
}

/**
 * Separates a Hadith's narrator intro (isnad) from the Prophet Muhammad's ﷺ reported words (matn)
 * so only the Prophetic quote is styled in Deep Red / Crimson, preserving accurate attribution.
 */
export function splitHadithNarratorAndQuote(text: string): {
  narratorIntro: string;
  propheticQuote: string;
  closingText: string;
} {
  if (!text) return { narratorIntro: '', propheticQuote: '', closingText: '' };

  // Check if there is an explicit colon after "said:" / "says:" / "قَالَ:"
  const enSaidMatch = text.match(/^(.*?\b(?:Messenger of Allah|Prophet|he)\b[^:"]*?\bsaid\s*:\s*)(.+)$/is);
  if (enSaidMatch) {
    return {
      narratorIntro: enSaidMatch[1].trim(),
      propheticQuote: enSaidMatch[2].trim().replace(/^["“”']+|["“”']+$/g, ''),
      closingText: ''
    };
  }

  // Check if there is a quoted statement inside "..." or “...”
  const quoteMatch = text.match(/^(.*?)["“]([^"”]{12,})["”](.*)$/s);
  if (quoteMatch && quoteMatch[1].trim().length > 5) {
    return {
      narratorIntro: quoteMatch[1].trim(),
      propheticQuote: quoteMatch[2].trim(),
      closingText: quoteMatch[3].trim()
    };
  }

  // Arabic narrator split (e.g. قال رسول الله صلى الله عليه وسلم : ...)
  const arSaidMatch = text.match(/^(.*?(?:قَالَ رَسُولُ اللَّهِ|قَالَ النَّبِيُّ|عَنِ النَّبِيِّ)[^:«"]*?[:«"]\s*)(.+)$/s);
  if (arSaidMatch) {
    return {
      narratorIntro: arSaidMatch[1].trim(),
      propheticQuote: arSaidMatch[2].trim().replace(/[»"]$/g, ''),
      closingText: ''
    };
  }

  // If the entire text is already the direct statement (because narrator_chain is stored in metadata)
  return {
    narratorIntro: '',
    propheticQuote: text,
    closingText: ''
  };
}

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
  sacredColorCodingEnabled: boolean;
  onToggleSacredColorCoding: () => void;
  activeGroupIds: string[];
  customWords: string[];
  onToggleGroup: (id: string) => void;
  onAddCustomWord: (word: string) => void;
  onRemoveCustomWord: (word: string) => void;
  onClose: () => void;
}> = ({
  sacredColorCodingEnabled,
  onToggleSacredColorCoding,
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
        style={{ height: '82%', maxHeight: 680 }}
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
              Color-Coded Islamic Content
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              Source Colors &amp; Sacred Word Highlights
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
          {/* Section 1: Source-Level Color Coding (Quran Green, Hadith Red, Dua Gold) */}
          <div style={{
            padding: 14,
            borderRadius: 16,
            background: sacredColorCodingEnabled ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-card)',
            border: sacredColorCodingEnabled ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-specular)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Color-Coded Sacred Sources
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Visually distinguish Allah’s words, the Prophet’s ﷺ spoken quotes, and Duas
                </div>
              </div>
              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  onToggleSacredColorCoding();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 99,
                  border: sacredColorCodingEnabled ? '1px solid #34D399' : '1px solid var(--border-specular)',
                  background: sacredColorCodingEnabled ? '#10B981' : 'rgba(255,255,255,0.08)',
                  color: sacredColorCodingEnabled ? '#06130E' : 'var(--text-secondary)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {sacredColorCodingEnabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#6EE7B7', background: 'rgba(16, 185, 129, 0.14)', padding: '6px 10px', borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#10B981', flexShrink: 0 }} />
                <span><strong>Quran — Emerald Green:</strong> Marks Quranic verses as the direct Word of Allah.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#FCA5A5', background: 'rgba(239, 68, 68, 0.14)', padding: '6px 10px', borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#EF4444', flexShrink: 0 }} />
                <span><strong>Hadith — Deep Red:</strong> Distinguishes Prophet Muhammad’s ﷺ spoken words from narrator text.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#FDE68A', background: 'rgba(232, 201, 104, 0.14)', padding: '6px 10px', borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#E8C968', flexShrink: 0 }} />
                <span><strong>Duas — Warm Gold:</strong> Makes prophetic &amp; Quranic supplications immediately recognizable.</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>
            Individual Sacred Word Highlights (Arabic &amp; English)
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
                    padding: '11px 14px',
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: isOn ? grp.color : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: grp.color,
                        display: 'inline-block'
                      }} />
                      {grp.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {grp.subtitle}
                    </div>
                  </div>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 99,
                    background: isOn ? grp.color : 'rgba(255,255,255,0.06)',
                    color: isOn ? '#090A0F' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isOn && <Check size={13} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Word Highlighter Input */}
          <div style={{
            marginTop: 4,
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

/**
 * PRIVATE PERSONAL NOTES MODAL (Partner Brief Section 3):
 * Speech-bubble button opens PRIVATE PERSONAL NOTES (never public comments).
 * Users can write, update, and browse their private reflections tied to specific verses, Hadiths, or Duas.
 */
export const PersonalNoteModal: React.FC<{
  card: {
    id: string;
    source_title: string;
    card_type: string;
    arabic_text_uthmani: string;
    translation_clear_quran: string;
  };
  existingNote: string;
  allNotes: Record<string, { text: string; source_title: string; card_type: string; updatedAt: string }>;
  onSaveNote: (cardId: string, text: string, sourceTitle: string, cardType: string) => void;
  onDeleteNote: (cardId: string) => void;
  onJumpToCardId?: (cardId: string) => void;
  onClose: () => void;
}> = ({
  card,
  existingNote,
  allNotes,
  onSaveNote,
  onDeleteNote,
  onJumpToCardId,
  onClose
}) => {
  const [noteText, setNoteText] = useState(existingNote || '');
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [savedToast, setSavedToast] = useState(false);

  const savedEntries = Object.entries(allNotes)
    .filter(([, val]) => val && val.text && val.text.trim().length > 0)
    .sort((a, b) => (b[1].updatedAt || '').localeCompare(a[1].updatedAt || ''));

  const handleSave = () => {
    soundEngine.triggerHaptic('softSuccess');
    onSaveNote(card.id, noteText.trim(), card.source_title, card.card_type);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '76%', maxHeight: 620 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab-handle" />
        <div style={{
          padding: '6px 20px 12px',
          borderBottom: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-emerald)', letterSpacing: '0.06em' }}>
              <Lock size={11} /> Private Personal Reflection
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {card.source_title}
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

        {/* Sub-navigation between Current Passage Note & All Saved Reflections */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 20px 0' }}>
          <button
            onClick={() => setActiveTab('current')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: activeTab === 'current' ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
              background: activeTab === 'current' ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
              color: activeTab === 'current' ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            This Passage
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: activeTab === 'all' ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
              background: activeTab === 'all' ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
              color: activeTab === 'all' ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            My Notes ({savedEntries.length})
          </button>
        </div>

        <div className="drawer-scroll" style={{ flex: 1, padding: '14px 20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeTab === 'current' ? (
            <>
              <div style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-specular)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                “{card.translation_clear_quran.slice(0, 160)}{card.translation_clear_quran.length > 160 ? '…' : ''}”
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={12} style={{ color: 'var(--accent-emerald)' }} />
                <span>Only visible to you on your device — never shared publicly.</span>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your personal reflection, dua, or takeaway from this passage..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--border-specular)',
                  background: 'rgba(0,0,0,0.18)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(232, 201, 104, 0.55)',
                    background: 'linear-gradient(135deg, #D4AF37, #AA8219)',
                    color: '#090A0F',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Check size={16} strokeWidth={2.5} />
                  {savedToast ? 'Saved to Private Notes!' : 'Save Personal Note'}
                </button>
                {existingNote && (
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setNoteText('');
                      onDeleteNote(card.id);
                    }}
                    title="Delete Note"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.14)',
                      color: '#FCA5A5',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedEntries.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  You haven’t saved any private notes yet. Tap the speech bubble on any verse, Hadith, or Dua to record a reflection.
                </div>
              ) : (
                savedEntries.map(([cardId, item]) => (
                  <div
                    key={cardId}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-specular)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-gold-bright)' }}>
                        {item.source_title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {onJumpToCardId && (
                          <button
                            onClick={() => {
                              onJumpToCardId(cardId);
                              onClose();
                            }}
                            style={{
                              background: 'rgba(16, 185, 129, 0.16)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#6EE7B7',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 99,
                              cursor: 'pointer'
                            }}
                          >
                            Open Card
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteNote(cardId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 2
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {item.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * FIRST-TIME ONBOARDING SCREENS (Partner Brief Section 1):
 * 5-Screen introductory sequence before entering the app with concise headlines,
 * an iPhone preview frame, and a prominent Continue button.
 */
export const OnboardingTutorialModal: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      badge: '1 of 5 • Mindful Scrolling',
      title: 'Transform Daily Scrolling Into Sacred Remembrance',
      desc: 'Replace unproductive social-media feeds with a peaceful, verse-by-verse journey through the Quran, authentic Hadith, and Prophetic Duas.',
      phonePreview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center', padding: '10px 6px' }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 99, background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7', border: '1px solid rgba(16, 185, 129, 0.45)' }}>
            Quran • Surah Ash-Sharh 94:5–6
          </span>
          <div style={{ fontSize: 22, color: '#6EE7B7', fontFamily: 'var(--font-arabic)', lineHeight: 1.65 }}>
            فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝
          </div>
          <div style={{ fontSize: 13, color: '#F4F1EA', fontStyle: 'italic', lineHeight: 1.45 }}>
            “So, surely with hardship comes ease. Surely with that hardship comes more ease.”
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--accent-gold-bright)', fontWeight: 700, marginTop: 2 }}>
            ↑ Swipe Vertically • 14,678 Authentic Passages
          </div>
        </div>
      )
    },
    {
      badge: '2 of 5 • Color-Coded Sacred Text',
      title: 'Instantly Recognize Quran, Hadith & Duas',
      desc: 'Sacred sources are color-coded for clarity in both Dark and Light modes—distinguishing Allah’s words, the Prophet’s ﷺ spoken quotes, and supplications.',
      phonePreview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', textAlign: 'left' }}>
          <div style={{ padding: '8px 11px', borderRadius: 12, background: 'rgba(16, 185, 129, 0.14)', borderLeft: '3px solid #10B981' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6EE7B7', textTransform: 'uppercase' }}>Quran • Emerald Green</div>
            <div style={{ fontSize: 12, color: '#E2F8EE', marginTop: 2 }}>“Indeed, Allah is with the patient.” (2:153)</div>
          </div>
          <div style={{ padding: '8px 11px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.14)', borderLeft: '3px solid #EF4444' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#FCA5A5', textTransform: 'uppercase' }}>Hadith • Deep Red Prophetic Quote</div>
            <div style={{ fontSize: 11, color: 'rgba(244,241,234,0.65)', marginTop: 2 }}>Umar ibn al-Khattab reported that the Prophet ﷺ said:</div>
            <div style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 600 }}>“Actions are judged only by intentions…”</div>
          </div>
          <div style={{ padding: '8px 11px', borderRadius: 12, background: 'rgba(232, 201, 104, 0.14)', borderLeft: '3px solid #E8C968' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#FDE68A', textTransform: 'uppercase' }}>Dua • Warm Gold Supplication</div>
            <div style={{ fontSize: 12, color: '#FEF08A', marginTop: 2 }}>“Our Lord, grant us good in this world and the Hereafter.”</div>
          </div>
        </div>
      )
    },
    {
      badge: '3 of 5 • Sequential Reading & Streaks',
      title: 'Complete the Quran & Hadith at Your Own Pace',
      desc: 'Switch to Sequential Mode anytime to read in exact canonical order starting from Surah Al-Fatihah 1:1 or Hadith #1, while building your daily streak.',
      phonePreview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 12, background: 'rgba(212, 175, 55, 0.14)', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-gold-bright)', textTransform: 'uppercase' }}>Sequential Khatmah</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F4F1EA', marginTop: 2 }}>Surah Al-Fatihah • 1:1 → 114</div>
            </div>
            <span style={{ padding: '4px 9px', borderRadius: 99, background: '#10B981', color: '#04130D', fontSize: 10.5, fontWeight: 800 }}>
              Auto-Saved
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
              <div key={idx} style={{ flex: 1, padding: '6px 0', borderRadius: 10, background: idx < 5 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255,255,255,0.05)', border: idx < 5 ? '1px solid #34D399' : '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: idx < 5 ? '#6EE7B7' : 'var(--text-muted)' }}>
                {d} {idx < 5 ? '✓' : ''}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      badge: '4 of 5 • Tafsir, Roots & Private Notes',
      title: 'Deep Study, Word-by-Word Audio & Private Reflections',
      desc: 'Listen to Qari recitation with synchronized word highlighting, inspect Arabic roots and 5-layer Tafsir, and save private personal notes on any card.',
      phonePreview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, direction: 'rtl', fontSize: 19, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'rgba(244,241,234,0.65)' }}>بِسْمِ</span>
            <span style={{ padding: '1px 8px', borderRadius: 7, background: 'rgba(232,201,104,0.28)', border: '1px solid #E8C968', color: '#F7DF8B', fontWeight: 700 }}>ٱللَّهِ</span>
            <span style={{ color: 'rgba(244,241,234,0.65)' }}>ٱلرَّحْمَٰنِ</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, background: 'rgba(255,59,92,0.16)', color: '#FF6B84', fontSize: 11, fontWeight: 700 }}>
              <Heart size={12} fill="currentColor" /> Favorite
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.16)', color: '#6EE7B7', fontSize: 11, fontWeight: 700 }}>
              <MessageCircle size={12} /> Private Note
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, background: 'rgba(212,175,55,0.18)', color: '#F7DF8B', fontSize: 11, fontWeight: 700 }}>
              <BookOpen size={12} /> Deep Tafsir
            </span>
          </div>
        </div>
      )
    },
    {
      badge: '5 of 5 • Search by Surah, Ayah & Mood',
      title: 'Find Any Verse or Spiritual Remedy in Seconds',
      desc: 'Jump directly to any of the 114 Surahs, search by Ayah or English/Arabic keyword, or filter by how your heart feels right now.',
      phonePreview: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,201,104,0.4)', fontSize: 12, color: '#F4F1EA' }}>
            <Search size={14} style={{ color: 'var(--accent-gold-bright)' }} />
            <span>Search “Surah Ya-Sin”, “2:255”, or “mercy”…</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {['Anxious', 'Grateful', 'Seeking Forgiveness', 'Patience', 'Morning & Evening'].map((m) => (
              <span key={m} style={{ padding: '4px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10.5, color: '#F4F1EA', fontWeight: 600 }}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )
    }
  ];

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div
      className="spring-sheet-backdrop"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(5, 7, 12, 0.92)',
        backdropFilter: 'blur(20px)',
        zIndex: 999
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          borderRadius: 28,
          background: 'linear-gradient(165deg, rgba(20, 26, 38, 0.98), rgba(9, 12, 18, 0.99))',
          border: '1px solid rgba(232, 201, 104, 0.38)',
          boxShadow: '0 28px 68px rgba(0, 0, 0, 0.85)',
          padding: '22px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Row: Step Badge & Skip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: 99,
            background: 'rgba(212, 175, 55, 0.16)',
            border: '1px solid rgba(212, 175, 55, 0.38)',
            color: 'var(--accent-gold-bright)',
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {current.badge}
          </span>
          <button
            onClick={() => {
              soundEngine.triggerHaptic('selectionTick');
              onComplete();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Skip
          </button>
        </div>

        {/* Headline & Subtitle */}
        <div style={{ textAlign: 'center', padding: '0 4px' }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: '#F4F1EA', lineHeight: 1.25, marginBottom: 6 }}>
            {current.title}
          </h2>
          <p style={{ fontSize: 12.5, color: 'rgba(244, 241, 234, 0.76)', lineHeight: 1.48, margin: 0 }}>
            {current.desc}
          </p>
        </div>

        {/* Mock iPhone Preview Frame */}
        <div style={{
          borderRadius: 22,
          padding: '14px 14px',
          background: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.12), rgba(7, 10, 15, 0.95) 75%)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
          minHeight: 170,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Mini Dynamic Island Notch */}
          <div style={{
            width: 54,
            height: 6,
            borderRadius: 99,
            background: 'rgba(255,255,255,0.14)',
            marginBottom: 12
          }} />
          {current.phonePreview}
        </div>

        {/* Progress Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              style={{
                width: idx === step ? 24 : 7,
                height: 7,
                borderRadius: 99,
                border: 'none',
                padding: 0,
                background: idx === step ? 'var(--accent-gold-bright)' : 'rgba(255,255,255,0.18)',
                transition: 'all 0.25s ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        {/* Prominent Continue Button */}
        <div style={{ display: 'flex', gap: 8 }}>
          {step > 0 && (
            <button
              onClick={() => {
                soundEngine.triggerHaptic('selectionTick');
                setStep(step - 1);
              }}
              style={{
                padding: '13px 16px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.05)',
                color: '#F4F1EA',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              soundEngine.triggerHaptic('softSuccess');
              if (isLast) {
                onComplete();
              } else {
                setStep(step + 1);
              }
            }}
            style={{
              flex: 1,
              padding: '13px 18px',
              borderRadius: 14,
              border: '1px solid rgba(232, 201, 104, 0.65)',
              background: 'linear-gradient(135deg, #E8C968, #B88B28)',
              color: '#090A0F',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.3)'
            }}
          >
            <span>{isLast ? 'Continue to Halal Scroll' : 'Continue'}</span>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * FIRST-USE INTERACTIVE TUTORIALS / COACH MARKS (Partner Brief Section 4):
 * Contextual coach-mark overlay inside the live feed teaching:
 * - Swipe to advance between items
 * - Tap or slide the progress rail to jump to a verse
 * - Favorite content with the Heart (right-side stack)
 * - Add private personal notes with the Speech Bubble (right-side stack)
 * - Share content with the Paper Airplane (right-side stack)
 * - Open Deep Study / Tafsir and explanations
 */
export const InteractiveCoachMarksOverlay: React.FC<{
  onDismiss: () => void;
}> = ({ onDismiss }) => {
  return (
    <div
      onClick={() => {
        soundEngine.triggerHaptic('selectionTick');
        onDismiss();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 85,
        background: 'rgba(6, 9, 15, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '68px 18px 26px',
        color: '#F4F1EA',
        cursor: 'pointer',
        animation: 'fadeIn 0.22s ease-out'
      }}
    >
      {/* Top Coach Mark: Swipe & Color-Coded Badges */}
      <div style={{
        alignSelf: 'center',
        padding: '10px 16px',
        borderRadius: 16,
        background: 'rgba(20, 27, 39, 0.95)',
        border: '1px solid rgba(232, 201, 104, 0.45)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
        textAlign: 'center',
        maxWidth: 310
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-gold-bright)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Interactive Feed Guide
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>
          ↕ Swipe Up or Down to Scroll Passages
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(244,241,234,0.75)', marginTop: 2 }}>
          Tap any Arabic word to hear pronunciation &amp; inspect its 3-letter root.
        </div>
      </div>

      {/* Middle Coach Mark: Progress Rail Callout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        paddingRight: 18
      }}>
        <div style={{
          padding: '9px 14px',
          borderRadius: 14,
          background: 'rgba(16, 185, 129, 0.18)',
          border: '1px solid rgba(16, 185, 129, 0.55)',
          fontSize: 12,
          fontWeight: 700,
          color: '#6EE7B7',
          maxWidth: 255,
          textAlign: 'right'
        }}>
          Tap or slide the right rail to jump to any verse →
        </div>
      </div>

      {/* Bottom Coach Marks: Horizontal Instagram Action Bar + Deep Study + Dismiss Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center'
        }}>
          <div style={{
            padding: '7px 11px',
            borderRadius: 12,
            background: 'rgba(255, 59, 92, 0.18)',
            border: '1px solid rgba(255, 59, 92, 0.5)',
            fontSize: 11.5,
            fontWeight: 700,
            color: '#FF8DA1'
          }}>
            ♥ Like &amp; Save ↓
          </div>
          <div style={{
            padding: '7px 11px',
            borderRadius: 12,
            background: 'rgba(232, 201, 104, 0.18)',
            border: '1px solid rgba(232, 201, 104, 0.55)',
            fontSize: 11.5,
            fontWeight: 700,
            color: '#F7DF8B'
          }}>
            💬 Private Personal Note ↓
          </div>
          <div style={{
            padding: '7px 11px',
            borderRadius: 12,
            background: 'rgba(96, 165, 250, 0.18)',
            border: '1px solid rgba(96, 165, 250, 0.5)',
            fontSize: 11.5,
            fontWeight: 700,
            color: '#93C5FD'
          }}>
            ✈️ Share ↓
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '9px 14px',
          borderRadius: 14,
          background: 'rgba(20, 27, 39, 0.95)',
          border: '1px solid rgba(232, 201, 104, 0.45)',
          fontSize: 12,
          color: '#F4F1EA'
        }}>
          <span>🔊 <strong>Recite &amp; Colors</strong> ↓</span>
          <span style={{ color: 'var(--accent-gold-bright)', fontWeight: 700 }}>📖 Deep Study / Tafsir ↓</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.triggerHaptic('softSuccess');
            onDismiss();
          }}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: 99,
            border: '1px solid rgba(232, 201, 104, 0.7)',
            background: 'linear-gradient(135deg, #E8C968, #B88B28)',
            color: '#090A0F',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 28px rgba(0,0,0,0.5)'
          }}
        >
          Got It — Start Scrolling
        </button>
      </div>
    </div>
  );
};

/**
 * HOME SCREEN & LOCK SCREEN WIDGETS PREVIEW MODAL (Partner Brief Section 5):
 * Lets users preview and configure their Daily Quran Verse, Daily Authentic Hadith,
 * Daily Dua, and Reading Streak widgets for iOS Home Screen & Lock Screen.
 */
export const WidgetsPreviewModal: React.FC<{
  streakDays: number;
  onClose: () => void;
}> = ({ streakDays, onClose }) => {
  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '80%', maxHeight: 650 }}
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
              iPhone Home &amp; Lock Screen
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              Islamic Widgets Gallery &amp; Setup
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
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.48 }}>
            Keep sacred remembrance on your iPhone Home Screen and Lock Screen throughout the day without opening the app.
          </div>

          {/* Widget 1: Daily Quran Verse (Medium Home Screen Widget) */}
          <div style={{
            padding: 16,
            borderRadius: 20,
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.16), rgba(9, 13, 22, 0.96))',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#6EE7B7', letterSpacing: '0.06em' }}>
                ✦ Daily Quran Widget • Surah Ash-Sharh 94:5
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Home Screen (Medium)</span>
            </div>
            <div style={{ fontSize: 19, fontFamily: 'var(--font-arabic)', color: '#6EE7B7', textAlign: 'right', marginBottom: 6 }}>
              فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝
            </div>
            <div style={{ fontSize: 12.5, color: '#F4F1EA', fontStyle: 'italic' }}>
              “So, surely with hardship comes ease.”
            </div>
          </div>

          {/* Widget 2: Daily Authentic Hadith & Daily Dua (Small Widgets Row) */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              flex: 1,
              padding: 14,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(9, 13, 22, 0.96))',
              border: '1px solid rgba(248, 113, 113, 0.4)'
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', color: '#FCA5A5', marginBottom: 6 }}>
                Daily Sahih Hadith
              </div>
              <div style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 600, lineHeight: 1.4 }}>
                “Actions are judged only by intentions…”
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Nawawi #1 • Bukhari
              </div>
            </div>

            <div style={{
              flex: 1,
              padding: 14,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(232, 201, 104, 0.16), rgba(9, 13, 22, 0.96))',
              border: '1px solid rgba(232, 201, 104, 0.45)'
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', color: '#FDE68A', marginBottom: 6 }}>
                Streak &amp; Daily Dua
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold-bright)' }}>
                {streakDays} Day{streakDays === 1 ? '' : 's'} 🔥
              </div>
              <div style={{ fontSize: 11, color: '#FEF08A', marginTop: 4, lineHeight: 1.35 }}>
                Morning &amp; Evening Adhkar Ready
              </div>
            </div>
          </div>

          {/* Guided Setup Instructions */}
          <div style={{
            padding: 14,
            borderRadius: 16,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-specular)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={14} style={{ color: 'var(--accent-gold-bright)' }} />
              <span>How to Add Halal Scroll to Your iPhone Home Screen</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              1. Long-press an empty area on your iPhone Home Screen or Lock Screen until apps jiggle.<br />
              2. Tap <strong>Edit (+)</strong> in the top-left corner and search for <strong>Halal Scroll</strong>.<br />
              3. Choose your preferred size (Small Streak/Dua, Medium Daily Verse, or Lock Screen Verse) and tap <strong>Add Widget</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
