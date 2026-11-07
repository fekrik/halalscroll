import React, { useState, useEffect } from 'react';
import {
  Sparkles, BookOpen, Languages, Compass, Link2, CheckCircle2,
  Volume2, Maximize2, Minimize2, X, ShieldCheck, ArrowUpRight, Flame
} from 'lucide-react';
import { CardWord, DeepStudyTab, FeedCard } from '../types';
import { soundEngine } from '../audioEngine';

interface DeepStudyDrawerProps {
  card: FeedCard;
  initialTab?: DeepStudyTab;
  initialSelectedWord?: CardWord | null;
  onClose: () => void;
  onJumpToCard: (cardIdOrSlug: string) => void;
  onMarkPracticed: (cardId: string, practiced: boolean, reflectionNote: string) => Promise<void>;
  onOpenShareWithSlide: (slideIndex: number) => void;
}

export const DeepStudyDrawer: React.FC<DeepStudyDrawerProps> = ({
  card,
  initialTab = 'summary',
  initialSelectedWord = null,
  onClose,
  onJumpToCard,
  onMarkPracticed,
  onOpenShareWithSlide
}) => {
  const [activeTab, setActiveTab] = useState<DeepStudyTab>(initialSelectedWord ? 'words' : initialTab);
  const [snapExpanded, setSnapExpanded] = useState<boolean>(false);
  const [selectedWord, setSelectedWord] = useState<CardWord | null>(
    initialSelectedWord || (card.words && card.words[0]) || null
  );
  const [tafsirSource, setTafsirSource] = useState<'saadi' | 'kathir' | 'maariful'>('saadi');
  const [reflectionText, setReflectionText] = useState<string>(card.practiced?.reflection_note || '');
  const [isSavingPractice, setIsSavingPractice] = useState<boolean>(false);

  useEffect(() => {
    setReflectionText(card.practiced?.reflection_note || '');
    if (initialSelectedWord) {
      setSelectedWord(initialSelectedWord);
      setActiveTab('words');
    } else if (card.words && card.words.length > 0) {
      setSelectedWord(card.words[0]);
    }
  }, [card, initialSelectedWord]);

  const ds = card.deep_study;
  if (!ds) return null;

  const tabs: { id: DeepStudyTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: '1. Explain It Easier', shortLabel: 'Explain', icon: <Sparkles size={14} /> },
    { id: 'words', label: '2. Word & Root', shortLabel: 'Roots', icon: <Languages size={14} /> },
    { id: 'tafsir', label: '3. Context & Tafsir', shortLabel: 'Tafsir', icon: <BookOpen size={14} /> },
    { id: 'sunnah', label: '4. Connected Sunnah', shortLabel: 'Bridge', icon: <Link2 size={14} /> },
    { id: 'action', label: '5. Act On It Today', shortLabel: 'Action', icon: <Compass size={14} /> }
  ];

  const handlePracticeSubmit = async (nextPracticed: boolean) => {
    setIsSavingPractice(true);
    soundEngine.triggerHaptic(nextPracticed ? 'softSuccess' : 'lightImpact');
    await onMarkPracticed(card.id, nextPracticed, reflectionText);
    setIsSavingPractice(false);
  };

  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: snapExpanded ? '92%' : '66%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle & Header */}
        <div style={{ padding: '12px 20px 10px 20px', borderBottom: '1px solid var(--border-specular)' }}>
          <div
            onClick={() => {
              soundEngine.triggerHaptic('selectionTick');
              setSnapExpanded(!snapExpanded);
            }}
            style={{
              width: 42,
              height: 5,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.22)',
              margin: '0 auto 12px auto',
              cursor: 'pointer'
            }}
            title="Tap to toggle 60% / 92% snap point"
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-gold)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Sparkles size={12} /> 5-Layer Deep Study &amp; Tadabbur
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 99,
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: 'var(--accent-emerald)',
                  fontWeight: 600
                }}>
                  RAG-Grounded • Zero Live Hallucination
                </span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color: 'var(--text-primary)' }}>
                {card.source_title} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 13 }}>• {card.surah_subtitle}</span>
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setSnapExpanded(!snapExpanded);
                }}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-specular)',
                  color: 'var(--text-secondary)',
                  borderRadius: 10,
                  padding: '6px 9px',
                  fontSize: 11,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
                title="Switch between 60% and 92% bottom-sheet height"
              >
                {snapExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {snapExpanded ? '60%' : '92%'}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-specular)',
                  color: 'var(--text-secondary)',
                  borderRadius: 10,
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 5-Tab Segmented Switcher */}
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              marginTop: 12,
              paddingBottom: 2
            }}
          >
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    soundEngine.triggerHaptic('selectionTick');
                    setActiveTab(t.id);
                  }}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    border: isActive ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                    background: isActive ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
                    color: isActive ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="drawer-scroll" style={{ flex: 1, padding: '18px 20px 28px 20px' }}>
          {/* TAB 1: EXPLAIN IT EASIER */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: 16,
                borderRadius: 18,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-specular)'
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--text-muted)',
                  marginBottom: 8
                }}>
                  Plain-English Breakdown (Tadabbur Summary)
                </div>
                <p style={{
                  fontSize: 14.5,
                  lineHeight: 1.65,
                  color: 'var(--text-primary)'
                }}>
                  {ds.plain_summary}
                </p>
              </div>

              {/* Key Takeaway Callout */}
              <div style={{
                padding: '16px 18px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.14), rgba(16, 185, 129, 0.08))',
                border: '1px solid var(--border-gold)',
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6
                }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--accent-gold-bright)'
                  }}>
                    ✦ Key Spiritual Takeaway
                  </span>
                  <button
                    onClick={() => onOpenShareWithSlide(1)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid var(--border-specular)',
                      borderRadius: 99,
                      padding: '3px 9px',
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Share Slide <ArrowUpRight size={11} />
                  </button>
                </div>
                <p className="editorial-translation" style={{
                  fontSize: 16,
                  textAlign: 'left',
                  fontStyle: 'italic',
                  color: 'var(--text-primary)'
                }}>
                  “{ds.key_takeaway}”
                </p>
              </div>

              {/* Source Citation Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 14,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    Verified Classical Source Attribution
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {ds.source_citation}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORD-BY-WORD & ROOT EXPLORER */}
          {activeTab === 'words' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Tap any Arabic word below to hear isolated pronunciation and inspect its <strong>Trilateral Quranic Root</strong>:
              </div>

              {/* Horizontal Word Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
                  gap: 8,
                  direction: 'rtl'
                }}
              >
                {card.words.map((w) => {
                  const isSel = selectedWord?.word_position === w.word_position;
                  return (
                    <button
                      key={w.word_position}
                      onClick={() => {
                        setSelectedWord(w);
                        soundEngine.speakArabicWord(w);
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 14,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isSel ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                        border: isSel ? '1.5px solid var(--accent-gold-bright)' : '1px solid var(--border-specular)',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div className="arabic-sacred-text" style={{ fontSize: 22, margin: 0, lineHeight: 1.4, color: isSel ? 'var(--accent-gold-bright)' : 'var(--text-primary)' }}>
                        {w.arabic_word}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, direction: 'ltr' }}>
                        {w.transliteration}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, direction: 'ltr' }}>
                        {w.translation_en}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Word Trilateral Root Spotlight Card */}
              {selectedWord && (
                <div style={{
                  padding: 18,
                  borderRadius: 20,
                  background: 'linear-gradient(155deg, rgba(212, 175, 55, 0.13), rgba(22, 26, 36, 0.6))',
                  border: '1px solid var(--border-gold)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        padding: '8px 16px',
                        borderRadius: 14,
                        background: 'rgba(212, 175, 55, 0.2)',
                        border: '1px solid var(--border-gold)',
                        fontSize: 26,
                        fontFamily: 'serif',
                        color: 'var(--accent-gold-bright)'
                      }}>
                        {selectedWord.arabic_word}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          “{selectedWord.translation_en}”
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {selectedWord.transliteration} • <span style={{ color: 'var(--accent-emerald)' }}>{selectedWord.grammar_pos}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => soundEngine.speakArabicWord(selectedWord)}
                      style={{
                        padding: '7px 13px',
                        borderRadius: 99,
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-gold)',
                        color: 'var(--accent-gold-bright)',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer'
                      }}
                    >
                      <Volume2 size={14} /> Hear Word
                    </button>
                  </div>

                  {/* Trilateral Root Badge & Occurrences */}
                  <div style={{
                    padding: 14,
                    borderRadius: 14,
                    background: 'rgba(0, 0, 0, 0.22)',
                    border: '1px solid var(--border-specular)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: 'rgba(212, 175, 55, 0.22)',
                          color: 'var(--accent-gold-bright)',
                          fontWeight: 700,
                          fontSize: 14,
                          direction: 'rtl'
                        }}>
                          {selectedWord.root_arabic}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Trilateral Root ({selectedWord.root_translit})
                        </span>
                      </div>
                      {selectedWord.root_occurrences > 0 && (
                        <span style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 99,
                          background: 'rgba(16, 185, 129, 0.16)',
                          color: 'var(--accent-emerald)',
                          fontWeight: 700
                        }}>
                          {selectedWord.root_occurrences} occurrences in Quran
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: 13.5, color: 'var(--text-primary)', marginTop: 8, lineHeight: 1.5 }}>
                      <strong>Core Root Field:</strong> {selectedWord.root_meaning}
                    </p>

                    {selectedWord.root_examples && selectedWord.root_examples.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                          Famous Passages Sharing This Root:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {selectedWord.root_examples.map((ex, idx) => (
                            <div
                              key={idx}
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'var(--surface-card)'
                              }}
                            >
                              • {ex}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTEXT & CLASSICAL TAFSIR */}
          {activeTab === 'tafsir' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Asbab al-Nuzul / Historical Backdrop */}
              <div style={{
                padding: 16,
                borderRadius: 18,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-specular)'
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--accent-gold)',
                  marginBottom: 6
                }}>
                  Asbab al-Nuzul • Historical Context of Revelation
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)' }}>
                  {ds.asbab_al_nuzul}
                </p>
              </div>

              {/* Classical Tafsir Switcher */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Classical Commentary Switcher:
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { id: 'saadi', label: "Tafsir As-Sa'di" },
                      { id: 'kathir', label: 'Ibn Kathir (Abridged)' },
                      { id: 'maariful', label: "Ma'ariful Quran" }
                    ].map((src) => (
                      <button
                        key={src.id}
                        onClick={() => {
                          soundEngine.triggerHaptic('selectionTick');
                          setTafsirSource(src.id as 'saadi' | 'kathir' | 'maariful');
                        }}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 99,
                          fontSize: 11.5,
                          fontWeight: tafsirSource === src.id ? 700 : 500,
                          cursor: 'pointer',
                          border: tafsirSource === src.id ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                          background: tafsirSource === src.id ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                          color: tafsirSource === src.id ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                        }}
                      >
                        {src.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{
                  padding: 18,
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  border: '1px solid var(--border-specular)'
                }}>
                  <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                    {tafsirSource === 'saadi' && ds.tafsir_saadi}
                    {tafsirSource === 'kathir' && ds.tafsir_ibn_kathir}
                    {tafsirSource === 'maariful' && ds.tafsir_maariful}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONNECTED SUNNAH (CROSS-REFERENCES) */}
          {activeTab === 'sunnah' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong>The Ayah ↔ Hadith Bridge:</strong> Explore how the Quran and the Prophetic Sunnah illuminate one another. Tap any connected card below to jump directly to it:
              </div>

              {card.cross_references && card.cross_references.length > 0 ? (
                card.cross_references.map((ref) => (
                  <div
                    key={ref.id}
                    onClick={() => {
                      soundEngine.triggerHaptic('lightImpact');
                      onJumpToCard(ref.target_card_id);
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-gold)',
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 99,
                        background: 'rgba(212, 175, 55, 0.18)',
                        color: 'var(--accent-gold-bright)',
                        textTransform: 'uppercase'
                      }}>
                        {ref.card_type} • {ref.source_title}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--accent-emerald)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        Open Card <ArrowUpRight size={13} />
                      </span>
                    </div>

                    <div className="arabic-sacred-text" style={{ fontSize: 20, textAlign: 'right', margin: '6px 0' }}>
                      {ref.arabic_text_uthmani}
                    </div>

                    <p className="editorial-translation" style={{ fontSize: 14, textAlign: 'left', color: 'var(--text-primary)', marginBottom: 10 }}>
                      “{ref.translation_en_clear}”
                    </p>

                    <div style={{
                      padding: '8px 11px',
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.09)',
                      borderLeft: '3px solid var(--accent-emerald)',
                      fontSize: 12,
                      color: 'var(--text-secondary)'
                    }}>
                      <strong>Connection:</strong> {ref.relationship_note}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No cross-references linked to this card yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACT ON IT TODAY (PRACTICAL SUNNAH) */}
          {activeTab === 'action' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: 18,
                borderRadius: 20,
                background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.14), rgba(212, 175, 55, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.35)'
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--accent-emerald)',
                  marginBottom: 6
                }}>
                  1-Minute Practical Sunnah Action
                </div>
                <p style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {ds.actionable_sunnah}
                </p>
              </div>

              {/* Private Tadabbur Reflection Note */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Private Tadabbur Reflection Note (Saved to your local vault):
                </label>
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="Write a 1-sentence personal dua or reflection on this passage..."
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: 14,
                    padding: 12,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-specular)',
                    color: 'var(--text-primary)',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Mark Practiced Today Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  disabled={isSavingPractice}
                  onClick={() => handlePracticeSubmit(!card.practiced)}
                  style={{
                    flex: 1,
                    padding: '13px 18px',
                    borderRadius: 16,
                    border: card.practiced ? '1px solid var(--accent-emerald)' : '1px solid var(--border-gold)',
                    background: card.practiced
                      ? 'linear-gradient(135deg, #10B981, #059669)'
                      : 'linear-gradient(135deg, #D4AF37, #B48A1E)',
                    color: '#090A0F',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                  }}
                >
                  <CheckCircle2 size={18} />
                  {card.practiced ? 'Practiced Today ✓ (Tap to Update / Undo)' : 'Mark Practiced Today (+1 Streak 🔥)'}
                </button>

                {card.practiced && reflectionText !== (card.practiced.reflection_note || '') && (
                  <button
                    onClick={() => handlePracticeSubmit(true)}
                    style={{
                      padding: '13px 16px',
                      borderRadius: 16,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-gold)',
                      color: 'var(--accent-gold-bright)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Save Note
                  </button>
                )}
              </div>

              {card.practiced && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  justifyContent: 'center'
                }}>
                  <Flame size={14} /> Masha’Allah! Recorded in your Sunnah Action Log.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

