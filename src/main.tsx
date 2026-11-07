import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles, Bookmark, Share2, Volume2, Pause, Flame, SlidersHorizontal,
  Crown, FolderPlus, Check, X, Compass, BookOpen, Heart, Sun, Moon,
  ChevronDown, ArrowUpRight, ShieldCheck, GraduationCap
} from 'lucide-react';
import { CardWord, DeepStudyTab, FeedCard, FeedMode, UserState } from './types';
import { soundEngine } from './audioEngine';
import { DeepStudyDrawer } from './components/DeepStudyDrawer';
import { ShareStudioModal } from './components/ShareStudioModal';
import {
  getOfflineBootstrap,
  offlineToggleBookmark,
  offlineMarkPracticed,
  offlineUpdateState
} from './clientSeedFallback';

const MOOD_FILTERS = [
  { id: 'all', label: 'All Moments', category: 'all' },
  { id: 'anxious', label: 'Anxious / Overwhelmed', category: 'emotion' },
  { id: 'tawbah', label: 'Seeking Forgiveness (Tawbah)', category: 'emotion' },
  { id: 'low_iman', label: 'Low Iman', category: 'emotion' },
  { id: 'grateful', label: 'Grateful (Shukr)', category: 'emotion' },
  { id: 'grieving', label: 'Grieving / Hardship', category: 'emotion' },
  { id: 'rizq', label: 'Seeking Provision (Rizq)', category: 'emotion' },
  { id: 'decision_making', label: 'Decision Making (Istikhara)', category: 'emotion' },
  { id: 'sabr', label: 'Patience (Sabr)', category: 'theme' },
  { id: 'tawakkul', label: 'Tawakkul (Trust in Allah)', category: 'theme' },
  { id: 'family', label: 'Parents & Family', category: 'theme' },
  { id: 'akhlaq', label: 'Character (Akhlaq)', category: 'theme' },
  { id: 'salah', label: 'Prayer (Salah)', category: 'theme' },
  { id: 'akhirah', label: 'Hereafter (Jannah)', category: 'theme' }
];

const SEQUENTIAL_COLLECTIONS = [
  { id: 'quran', label: 'Al-Quran (Khatmah Track)', subtitle: 'Grouped Semantic Passages' },
  { id: 'riyad_assalihin', label: 'Riyad as-Salihin', subtitle: 'Imam An-Nawawi' },
  { id: 'nawawi40', label: '40 Hadith Nawawi', subtitle: 'Foundations of Sacred Law' },
  { id: 'adab_mufrad', label: 'Al-Adab Al-Mufrad', subtitle: 'Imam Al-Bukhari • Prophetic Manners' },
  { id: 'hisn', label: 'Hisn al-Muslim', subtitle: 'Fortress of the Believer (Duas)' },
  { id: 'seerah', label: 'Seerah & Sahaba Gems', subtitle: 'Prophetic Biography Moments' }
];

const RECITERS = [
  { id: 'Mishary Rashid Alafasy', short: 'Alafasy', origin: 'Kuwait • Murattal' },
  { id: 'Abdul Basit Abdus Samad', short: 'Abdul Basit', origin: 'Egypt • Mujawwad' },
  { id: 'Mahmoud Khalil Al-Husary', short: 'Al-Husary', origin: 'Egypt • Tajweed Master' },
  { id: 'Omar Hisham Al Arabi', short: 'Omar Hisham', origin: 'Beirut • Serenity Tone' }
];

const App: React.FC = () => {
  const [cards, setCards] = useState<FeedCard[]>([]);
  const [userState, setUserState] = useState<UserState>({
    streak_count: '12',
    theme: 'andalusian_parchment',
    arabic_script: 'uthmani',
    translation_edition: 'clear',
    show_transliteration: 'true',
    reciter: 'Mishary Rashid Alafasy',
    plus_member: 'false',
    sequential_quran_card: 'card-quran-94-5',
    sequential_book_card: 'card-hadith-nawawi-19'
  });
  const [folders, setFolders] = useState<string[]>(['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization']);
  const [loading, setLoading] = useState(true);

  // Navigation & Feed Mode State
  const [feedMode, setFeedMode] = useState<FeedMode>('for_you');
  const [selectedMood, setSelectedMood] = useState<string>('anxious');
  const [selectedCollection, setSelectedCollection] = useState<string>('quran');
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Audio Recitation & Word Highlighting State
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);

  // Interactive Popovers, Drawers & Modals
  const [popoverWord, setPopoverWord] = useState<{ word: CardWord; card: FeedCard } | null>(null);
  const [deepStudyModal, setDeepStudyModal] = useState<{
    card: FeedCard;
    initialTab?: DeepStudyTab;
    initialWord?: CardWord | null;
  } | null>(null);
  const [shareStudioModal, setShareStudioModal] = useState<{
    card: FeedCard;
    initialSlide?: number;
  } | null>(null);
  const [bookmarkFolderModalCard, setBookmarkFolderModalCard] = useState<FeedCard | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showBookmarksVault, setShowBookmarksVault] = useState<boolean>(false);
  const [vaultFilterFolder, setVaultFilterFolder] = useState<string>('All');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showPlusModal, setShowPlusModal] = useState<boolean>(false);
  const [showReciterMenuForCard, setShowReciterMenuForCard] = useState<string | null>(null);
  const [webCompanionSlug, setWebCompanionSlug] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/c/')) {
      return decodeURIComponent(path.replace('/c/', ''));
    }
    return null;
  });

  const feedContainerRef = useRef<HTMLDivElement | null>(null);

  // Load initial data from SQLite backend (with automatic 0ms offline/static fallback for GitHub Pages)
  useEffect(() => {
    const applyBootData = (data: { cards?: FeedCard[]; state?: Partial<UserState>; folders?: string[] }) => {
      if (data.cards) setCards(data.cards);
      if (data.state) setUserState(prev => ({ ...prev, ...data.state }));
      if (data.folders) setFolders(data.folders);
      setLoading(false);

      const path = window.location.pathname;
      const hashSlug = window.location.hash.startsWith('#/c/')
        ? decodeURIComponent(window.location.hash.replace('#/c/', ''))
        : null;
      const slug = path.includes('/c/')
        ? decodeURIComponent(path.split('/c/')[1])
        : hashSlug;
      if (slug) {
        const idx = (data.cards || []).findIndex((c: FeedCard) => c.share_slug === slug || c.id === slug);
        if (idx >= 0) {
          setTimeout(() => scrollToCardIndex(idx), 120);
        }
      }
    };

    fetch('/api/bootstrap')
      .then(r => {
        if (!r.ok) throw new Error('Static mode');
        return r.json();
      })
      .then((data) => applyBootData(data))
      .catch(() => {
        const fallback = getOfflineBootstrap();
        applyBootData(fallback);
      });
  }, []);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', userState.theme || 'andalusian_parchment');
  }, [userState.theme]);

  // Filtered Cards based on active Feed Mode
  const displayedCards = useMemo(() => {
    if (feedMode === 'for_you') {
      return cards;
    }
    if (feedMode === 'sequential') {
      return cards
        .filter(c => c.collection_slug === selectedCollection)
        .sort((a, b) => a.sequence_order - b.sequence_order);
    }
    if (feedMode === 'moods') {
      if (selectedMood === 'all') return cards;
      return cards.filter(
        c => c.mood_tags.includes(selectedMood) || c.topic_tags.includes(selectedMood)
      );
    }
    return cards;
  }, [cards, feedMode, selectedCollection, selectedMood]);

  const activeCard = displayedCards[activeCardIndex] || displayedCards[0] || null;

  const updateServerState = async (patch: Partial<UserState>) => {
    setUserState(prev => ({ ...prev, ...patch }));
    offlineUpdateState(patch);
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setUserState(prev => ({ ...prev, ...data.state }));
      }
    } catch {}
  };

  const scrollToCardIndex = (idx: number) => {
    const container = feedContainerRef.current;
    if (!container) return;
    const target = Math.max(0, Math.min(idx, displayedCards.length - 1));
    setActiveCardIndex(target);
    container.scrollTo({
      top: target * container.clientHeight,
      behavior: 'smooth'
    });
  };

  const handleJumpToCardByIdOrSlug = (idOrSlug: string) => {
    setDeepStudyModal(null);
    setShowBookmarksVault(false);
    // Ensure mode shows all cards if not in current filter
    const inCurrent = displayedCards.findIndex(c => c.id === idOrSlug || c.share_slug === idOrSlug);
    if (inCurrent >= 0) {
      scrollToCardIndex(inCurrent);
    } else {
      setFeedMode('for_you');
      setTimeout(() => {
        const allIdx = cards.findIndex(c => c.id === idOrSlug || c.share_slug === idOrSlug);
        if (allIdx >= 0) scrollToCardIndex(allIdx);
      }, 60);
    }
  };

  const handleFeedScroll = () => {
    const container = feedContainerRef.current;
    if (!container || container.clientHeight === 0) return;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== activeCardIndex && newIndex >= 0 && newIndex < displayedCards.length) {
      setActiveCardIndex(newIndex);
      soundEngine.triggerHaptic('lightImpact');
      setPopoverWord(null);
      if (playingCardId) {
        soundEngine.stopRecitation();
        setPlayingCardId(null);
        setActiveWordIdx(-1);
      }
      // Save reading progress in Sequential mode
      const current = displayedCards[newIndex];
      if (current && feedMode === 'sequential') {
        if (selectedCollection === 'quran') {
          updateServerState({ sequential_quran_card: current.id });
        } else {
          updateServerState({ sequential_book_card: current.id });
        }
      }
    }
  };

  const handleToggleRecitation = (card: FeedCard) => {
    soundEngine.triggerHaptic('lightImpact');
    if (playingCardId === card.id) {
      soundEngine.stopRecitation();
      setPlayingCardId(null);
      setActiveWordIdx(-1);
    } else {
      setPlayingCardId(card.id);
      soundEngine.startCardRecitation(
        card,
        (wordIdx) => {
          setActiveWordIdx(wordIdx);
        },
        () => {
          setPlayingCardId(null);
          setActiveWordIdx(-1);
        }
      );
    }
  };

  const handleToggleBookmark = async (card: FeedCard, folderName = 'Favorites', action: 'toggle' | 'add' | 'remove' = 'toggle') => {
    soundEngine.triggerHaptic('softSuccess');
    const applyBookmarkData = (data: { cards?: FeedCard[]; folders?: string[] }) => {
      if (data.cards) {
        setCards(data.cards);
        if (bookmarkFolderModalCard) {
          const updated = data.cards.find((c: FeedCard) => c.id === bookmarkFolderModalCard.id);
          if (updated) setBookmarkFolderModalCard(updated);
        }
      }
      if (data.folders) setFolders(data.folders);
    };

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id, folder_name: folderName, action })
      });
      if (!res.ok) throw new Error('Static fallback');
      const data = await res.json();
      applyBookmarkData(data);
    } catch {
      const fallback = offlineToggleBookmark(card.id, folderName, action);
      applyBookmarkData(fallback);
    }
  };

  const handleMarkPracticed = async (cardId: string, practiced: boolean, reflectionNote: string) => {
    const applyPracticeData = (data: { cards?: FeedCard[]; state?: Partial<UserState> }) => {
      if (data.cards) {
        setCards(data.cards);
        const updated = data.cards.find((c: FeedCard) => c.id === cardId);
        if (updated && deepStudyModal) {
          setDeepStudyModal({ ...deepStudyModal, card: updated });
        }
      }
      if (data.state) setUserState(prev => ({ ...prev, ...data.state }));
    };

    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, practiced, reflection_note: reflectionNote })
      });
      if (!res.ok) throw new Error('Static fallback');
      const data = await res.json();
      applyPracticeData(data);
    } catch {
      const fallback = offlineMarkPracticed(cardId, practiced, reflectionNote);
      applyPracticeData(fallback);
    }
  };

  const bookmarkedCards = useMemo(() => {
    return cards.filter(c => {
      if (!c.is_bookmarked) return false;
      if (vaultFilterFolder === 'All') return true;
      return c.bookmark_folders.includes(vaultFilterFolder);
    });
  }, [cards, vaultFilterFolder]);

  if (loading) {
    return (
      <div className="app-shell">
        <div style={{ textAlign: 'center', color: 'var(--accent-gold)' }}>
          <Sparkles size={28} />
          <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>Opening Halal Scroll Sanctuary…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="film-grain" />

      {/* Main Mobile-First Sanctuary Viewport */}
      <div className="sanctuary-stage">
        <div className="ambient-mesh" />

        {/* Optional Web Companion Shared Link Banner (/c/[slug]) */}
        {webCompanionSlug && activeCard && (
          <div style={{
            position: 'relative',
            zIndex: 30,
            padding: '8px 14px',
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.22), rgba(16, 185, 129, 0.18))',
            borderBottom: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>
              <strong>Shared Web Companion:</strong> <code>halalscroll.app/c/{webCompanionSlug}</code>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a
                href={`/api/og/${webCompanionSlug}.svg`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11,
                  color: 'var(--accent-gold-bright)',
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                View OG Card
              </a>
              <button
                onClick={() => {
                  setWebCompanionSlug(null);
                  window.history.pushState({}, '', '/');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 1. TOP FLOATING BAR (Mode Switcher + Streak + Vault + Settings) */}
        <div style={{
          position: 'absolute',
          top: webCompanionSlug ? 42 : 14,
          left: 14,
          right: 14,
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            {/* Floating Frosted-Glass Segmented Mode Switcher */}
            <div
              className="glass-pill"
              style={{
                display: 'inline-flex',
                padding: 4,
                borderRadius: 999,
                gap: 2
              }}
            >
              {[
                { id: 'for_you', label: 'For You' },
                { id: 'sequential', label: 'Sequential' },
                { id: 'moods', label: 'Moods' }
              ].map((m) => {
                const active = feedMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setFeedMode(m.id as FeedMode);
                      setActiveCardIndex(0);
                      if (feedContainerRef.current) feedContainerRef.current.scrollTop = 0;
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      background: active ? 'rgba(212, 175, 55, 0.22)' : 'transparent',
                      color: active ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                      transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Right Top Controls: Daily Streak Pill + Bookmarks Vault + Theme Settings + Plus */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setDeepStudyModal({ card: activeCard, initialTab: 'action' });
                }}
                className="glass-pill"
                title="Daily Tadabbur & Sunnah Streak"
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  color: 'var(--accent-gold-bright)',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <Flame size={14} fill="currentColor" />
                <span>{userState.streak_count}</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setShowBookmarksVault(true);
                }}
                className="glass-pill"
                title="Saved Bookmarks & Custom Collections"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <Bookmark size={15} />
                {cards.filter(c => c.is_bookmarked).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 15,
                    height: 15,
                    borderRadius: 99,
                    background: 'var(--accent-gold)',
                    color: '#090A0F',
                    fontSize: 9.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {cards.filter(c => c.is_bookmarked).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setShowSettingsDrawer(true);
                }}
                className="glass-pill"
                title="Theme, Script & Typography Settings"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <SlidersHorizontal size={15} />
              </button>

              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setShowPlusModal(true);
                }}
                className="glass-pill"
                title="Halal Scroll Plus & Student Scholarship"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  color: userState.plus_member === 'true' ? 'var(--accent-emerald)' : 'var(--accent-gold-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Crown size={15} />
              </button>
            </div>
          </div>

          {/* SUB-BAR FOR MODE B: SEQUENTIAL (Khatmah & Book Reader) */}
          {feedMode === 'sequential' && (
            <div
              className="glass-pill no-scrollbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 16,
                overflowX: 'auto'
              }}
            >
              {SEQUENTIAL_COLLECTIONS.map((col) => {
                const isSel = selectedCollection === col.id;
                const colCards = cards.filter(c => c.collection_slug === col.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setSelectedCollection(col.id);
                      setActiveCardIndex(0);
                      if (feedContainerRef.current) feedContainerRef.current.scrollTop = 0;
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '5px 11px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      border: isSel ? '1px solid var(--border-gold)' : '1px solid transparent',
                      background: isSel ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.04)',
                      color: isSel ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>{col.label}</span>
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: 'rgba(0,0,0,0.25)',
                      color: 'var(--accent-emerald)'
                    }}>
                      {colCards.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SUB-BAR FOR MODE C: "I'M FEELING..." (Mood & Topic Selector) */}
          {feedMode === 'moods' && (
            <div
              className="glass-pill no-scrollbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 16,
                overflowX: 'auto'
              }}
            >
              {MOOD_FILTERS.map((m) => {
                const isSel = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setSelectedMood(m.id);
                      setActiveCardIndex(0);
                      if (feedContainerRef.current) feedContainerRef.current.scrollTop = 0;
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '5px 11px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      border: isSel ? '1px solid var(--border-gold)' : '1px solid transparent',
                      background: isSel ? 'rgba(212, 175, 55, 0.22)' : 'rgba(255,255,255,0.04)',
                      color: isSel ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. FULL-SCREEN VERTICAL SNAP FEED */}
        <div
          ref={feedContainerRef}
          onScroll={handleFeedScroll}
          className="vertical-feed"
        >
          {displayedCards.map((card, cardIdx) => {
            const isCardPlaying = playingCardId === card.id;
            const translationText = userState.translation_edition === 'sahih'
              ? (card.translation_en_sahih || card.translation_en_clear)
              : card.translation_en_clear;

            return (
              <div
                key={card.id}
                className="feed-card-snap"
                style={{
                  paddingTop: feedMode === 'for_you' ? 64 : 108
                }}
              >
                {/* UNIFIED CARD CONTENT CLUSTER: Metadata Header + Sacred Text Canvas */}
                <div className="card-content-cluster" style={{ zIndex: 2 }}>
                  {/* TOP CARD METADATA HEADER */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {/* Card Type Pill */}
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '3px 9px',
                        borderRadius: 99,
                        background: card.card_type === 'quran'
                          ? 'rgba(212, 175, 55, 0.18)'
                          : card.card_type === 'hadith'
                          ? 'rgba(16, 185, 129, 0.18)'
                          : card.card_type === 'dua'
                          ? 'rgba(129, 140, 248, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                        color: card.card_type === 'quran'
                          ? 'var(--accent-gold-bright)'
                          : card.card_type === 'hadith'
                          ? 'var(--accent-emerald)'
                          : 'var(--text-primary)'
                      }}>
                        {card.card_type === 'quran' ? 'Quran Passage' : card.card_type === 'hadith' ? 'Sahih Hadith' : card.card_type === 'dua' ? 'Prophetic Dua' : 'Seerah Gem'}
                      </span>

                      {/* Source Pill */}
                      <span
                        className="glass-pill"
                        style={{
                          padding: '4px 12px',
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--text-primary)'
                        }}
                      >
                        {card.source_title}
                      </span>

                      {/* Authenticity / Revelation Badge */}
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 99,
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.28)',
                        color: 'var(--accent-emerald)'
                      }}>
                        {card.revelation_place ? `${card.revelation_place} • ${card.authenticity_grade}` : card.authenticity_grade}
                      </span>
                    </div>

                    {card.narrator_chain && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {card.narrator_chain}
                      </div>
                    )}
                  </div>

                  {/* Interactive Word-by-Word Arabic Script */}
                  <div
                    className="arabic-sacred-text"
                    style={{
                      fontSize: card.arabic_text_uthmani.length > 140 ? '1.55rem' : '1.85rem'
                    }}
                  >
                    {userState.arabic_script === 'indopak' && card.arabic_text_indopak ? (
                      <span>{card.arabic_text_indopak}</span>
                    ) : card.words && card.words.length > 0 ? (
                      <>
                        {card.words.map((w, wIdx) => {
                          const isWordActive = isCardPlaying && activeWordIdx === wIdx;
                          const isPopoverOpen = popoverWord?.word.word_position === w.word_position && popoverWord?.card.id === card.id;
                          return (
                            <span
                              key={w.word_position}
                              onClick={(e) => {
                                e.stopPropagation();
                                soundEngine.speakArabicWord(w);
                                setPopoverWord({ word: w, card });
                              }}
                              className={`arabic-word-token ${isWordActive || isPopoverOpen ? 'active-word-glow' : ''}`}
                              title={`Tap for root (${w.root_arabic}) & meaning: "${w.translation_en}"`}
                            >
                              {w.arabic_word}
                            </span>
                          );
                        })}
                      </>
                    ) : (
                      <span>{card.arabic_text_uthmani}</span>
                    )}
                  </div>

                  {/* Subtle Interactive Hint Pill */}
                  <div style={{
                    fontSize: 10.5,
                    color: 'var(--text-muted)',
                    marginBottom: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>✦ Tap any highlighted Arabic word for Trilateral Root &amp; Audio</span>
                  </div>

                  {/* Optional Learner Transliteration */}
                  {userState.show_transliteration === 'true' && card.transliteration && (
                    <p className="transliteration-text" style={{ marginBottom: 6, maxWidth: 420 }}>
                      {card.transliteration}
                    </p>
                  )}

                  {/* Editorial Serif English Translation */}
                  <p
                    className="editorial-translation"
                    style={{
                      fontSize: translationText.length > 210 ? '1.05rem' : '1.18rem',
                      maxWidth: 430
                    }}
                  >
                    “{translationText}”
                  </p>
                </div>

                {/* RIGHT VERTICAL ACTION RAIL (Thumb-Zone Optimized) */}
                <div style={{
                  position: 'absolute',
                  right: 14,
                  bottom: 92,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                  zIndex: 15
                }}>
                  {/* 1. Audio Play / Reciter Switcher */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                    <button
                      onClick={() => handleToggleRecitation(card)}
                      className={`glass-pill ${isCardPlaying ? 'audio-playing-ring' : ''}`}
                      title="Play Synchronized Word-by-Word Recitation"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 999,
                        color: isCardPlaying ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {isCardPlaying ? <Pause size={19} /> : <Volume2 size={19} />}
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.triggerHaptic('selectionTick');
                        setShowReciterMenuForCard(showReciterMenuForCard === card.id ? null : card.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <span>{RECITERS.find(r => r.id === userState.reciter)?.short || 'Reciter'}</span>
                      <ChevronDown size={10} />
                    </button>

                    {/* Reciter Quick-Switcher Popover */}
                    {showReciterMenuForCard === card.id && (
                      <div
                        className="glass-pill"
                        style={{
                          position: 'absolute',
                          right: 54,
                          top: 0,
                          width: 215,
                          padding: 8,
                          borderRadius: 16,
                          boxShadow: '0 14px 36px rgba(0,0,0,0.65)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          zIndex: 30
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', padding: '2px 6px' }}>
                          Select Qari / Reciter
                        </div>
                        {RECITERS.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              soundEngine.triggerHaptic('selectionTick');
                              updateServerState({ reciter: r.id });
                              setShowReciterMenuForCard(null);
                            }}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 10,
                              border: 'none',
                              textAlign: 'left',
                              cursor: 'pointer',
                              background: userState.reciter === r.id ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                              color: userState.reciter === r.id ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                              fontSize: 11.5,
                              fontWeight: userState.reciter === r.id ? 700 : 500
                            }}
                          >
                            <div>{r.id}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.origin}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Bookmark / Custom Collection Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <button
                      onClick={() => handleToggleBookmark(card, 'Favorites', 'toggle')}
                      className="glass-pill"
                      title="Tap to Bookmark; tap Folder label below to organize into Collections"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 999,
                        color: card.is_bookmarked ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                        borderColor: card.is_bookmarked ? 'var(--border-gold)' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Bookmark size={19} fill={card.is_bookmarked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.triggerHaptic('selectionTick');
                        setBookmarkFolderModalCard(card);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: card.is_bookmarked ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {card.bookmark_folders[0] || 'Folder'}
                    </button>
                  </div>

                  {/* 3. Social Share Studio Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <button
                      onClick={() => {
                        soundEngine.triggerHaptic('lightImpact');
                        setShareStudioModal({ card, initialSlide: 0 });
                      }}
                      className="glass-pill"
                      title="Open Studio-Grade Social Share & Video Reel Exporter"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 999,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Share2 size={18} />
                    </button>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Share</span>
                  </div>
                </div>

                {/* BOTTOM FLOATING DOCK: Primary "Deep Study & Tafsir" Pill + Position Indicator */}
                <div style={{
                  position: 'absolute',
                  bottom: 22,
                  left: 20,
                  right: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  zIndex: 15
                }}>
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('lightImpact');
                      setDeepStudyModal({ card, initialTab: 'summary' });
                    }}
                    className="glass-pill deep-study-cta"
                    style={{
                      flex: 1,
                      padding: '13px 18px',
                      borderRadius: 999,
                      border: '1px solid var(--border-gold)',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={16} style={{ color: 'var(--accent-gold-bright)' }} />
                      <span>Deep Study &amp; Tafsir</span>
                    </span>
                    <span style={{
                      fontSize: 11,
                      padding: '3px 9px',
                      borderRadius: 99,
                      background: 'rgba(212, 175, 55, 0.16)',
                      color: 'var(--accent-gold-bright)',
                      fontWeight: 600
                    }}>
                      5 Layers ↑
                    </span>
                  </button>

                  {/* Card Progress Pill */}
                  <div
                    className="glass-pill"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {cardIdx + 1} / {displayedCards.length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FLOATING GLASS WORD MORPHOLOGY & ROOT POPOVER (When user taps an Arabic word on card) */}
        {popoverWord && (
          <div
            className="glass-pill"
            style={{
              position: 'absolute',
              left: 18,
              right: 76,
              bottom: 84,
              zIndex: 32,
              padding: '14px 16px',
              borderRadius: 20,
              border: '1px solid var(--border-gold)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.65)',
              animation: 'fadeIn 0.18s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 24,
                  fontFamily: 'serif',
                  color: 'var(--accent-gold-bright)',
                  padding: '2px 10px',
                  borderRadius: 10,
                  background: 'rgba(212, 175, 55, 0.16)'
                }}>
                  {popoverWord.word.arabic_word}
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    “{popoverWord.word.translation_en}”
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {popoverWord.word.transliteration} • {popoverWord.word.grammar_pos}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPopoverWord(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--border-specular)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--accent-gold-bright)', fontWeight: 700 }}>
                  Root: {popoverWord.word.root_arabic} ({popoverWord.word.root_translit})
                </span>{' '}
                — {popoverWord.word.root_meaning}
              </div>
              <button
                onClick={() => {
                  const target = popoverWord;
                  setPopoverWord(null);
                  setDeepStudyModal({
                    card: target.card,
                    initialTab: 'words',
                    initialWord: target.word
                  });
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 99,
                  background: 'rgba(212, 175, 55, 0.2)',
                  border: '1px solid var(--border-gold)',
                  color: 'var(--accent-gold-bright)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Full Root Explorer <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* 3. 5-TAB DEEP STUDY BOTTOM SHEET DRAWER */}
        {deepStudyModal && (
          <DeepStudyDrawer
            card={deepStudyModal.card}
            initialTab={deepStudyModal.initialTab}
            initialSelectedWord={deepStudyModal.initialWord}
            onClose={() => setDeepStudyModal(null)}
            onJumpToCard={handleJumpToCardByIdOrSlug}
            onMarkPracticed={handleMarkPracticed}
            onOpenShareWithSlide={(slideIdx) => {
              const targetCard = deepStudyModal.card;
              setDeepStudyModal(null);
              setShareStudioModal({ card: targetCard, initialSlide: slideIdx });
            }}
          />
        )}

        {/* 4. SOCIAL SHARE STUDIO MODAL */}
        {shareStudioModal && (
          <ShareStudioModal
            card={shareStudioModal.card}
            initialSlide={shareStudioModal.initialSlide}
            isPlusMember={userState.plus_member === 'true'}
            onClose={() => setShareStudioModal(null)}
            onOpenWebCompanionPreview={(slug) => {
              setShareStudioModal(null);
              setWebCompanionSlug(slug);
              if (window.location.hostname.includes('github.io')) {
                window.location.hash = `#/c/${slug}`;
              } else {
                window.history.pushState({}, '', `/c/${slug}`);
              }
            }}
          />
        )}

        {/* 5. BOOKMARK TO CUSTOM COLLECTION MODAL */}
        {bookmarkFolderModalCard && (
          <div className="spring-sheet-backdrop" onClick={() => setBookmarkFolderModalCard(null)}>
            <div
              className="spring-sheet-panel"
              style={{ height: '54%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-specular)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                    Save to Collection
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {bookmarkFolderModalCard.source_title}
                  </h3>
                </div>
                <button
                  onClick={() => setBookmarkFolderModalCard(null)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-specular)',
                    color: 'var(--text-secondary)',
                    borderRadius: 10,
                    width: 30,
                    height: 30,
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="drawer-scroll" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {folders.map((folder) => {
                  const savedInFolder = bookmarkFolderModalCard.bookmark_folders.includes(folder);
                  return (
                    <button
                      key={folder}
                      onClick={() => handleToggleBookmark(bookmarkFolderModalCard, folder, 'toggle')}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: savedInFolder ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
                        border: savedInFolder ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                        color: 'var(--text-primary)',
                        fontSize: 13.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{folder}</span>
                      {savedInFolder ? (
                        <span style={{ color: 'var(--accent-gold-bright)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={14} /> Saved
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>+ Add</span>
                      )}
                    </button>
                  );
                })}

                {/* Create Custom Collection */}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New custom folder (e.g. Ramadan Gems)..."
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-specular)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => {
                      const trimmed = newFolderName.trim();
                      if (!trimmed) return;
                      handleToggleBookmark(bookmarkFolderModalCard, trimmed, 'add');
                      setNewFolderName('');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #D4AF37, #B48A1E)',
                      border: 'none',
                      color: '#090A0F',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <FolderPlus size={14} /> Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. SAVED BOOKMARKS VAULT DRAWER */}
        {showBookmarksVault && (
          <div className="spring-sheet-backdrop" onClick={() => setShowBookmarksVault(false)}>
            <div
              className="spring-sheet-panel"
              style={{ height: '78%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-specular)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                      Personal Sanctuary Vault
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Saved Bookmarks &amp; Collections ({bookmarkedCards.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowBookmarksVault(false)}
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-specular)',
                      color: 'var(--text-secondary)',
                      borderRadius: 10,
                      width: 30,
                      height: 30,
                      cursor: 'pointer'
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Folder Filter Pills */}
                <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 10 }}>
                  {['All', ...folders].map((f) => (
                    <button
                      key={f}
                      onClick={() => setVaultFilterFolder(f)}
                      style={{
                        flexShrink: 0,
                        padding: '5px 11px',
                        borderRadius: 99,
                        fontSize: 11.5,
                        fontWeight: vaultFilterFolder === f ? 700 : 500,
                        cursor: 'pointer',
                        border: vaultFilterFolder === f ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                        background: vaultFilterFolder === f ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                        color: vaultFilterFolder === f ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="drawer-scroll" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bookmarkedCards.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No cards saved in “{vaultFilterFolder}” yet. Tap the Bookmark icon on any card to save it here.
                  </div>
                ) : (
                  bookmarkedCards.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleJumpToCardByIdOrSlug(c.id)}
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border-specular)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold-bright)' }}>
                          {c.source_title}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.bookmark_folders.map(fl => (
                            <span
                              key={fl}
                              style={{
                                fontSize: 10,
                                padding: '2px 7px',
                                borderRadius: 99,
                                background: 'rgba(212, 175, 55, 0.14)',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              {fl}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="arabic-sacred-text" style={{ fontSize: 19, textAlign: 'right', margin: '4px 0' }}>
                        {c.arabic_text_uthmani}
                      </div>
                      <p className="editorial-translation" style={{ fontSize: 13.5, textAlign: 'left', color: 'var(--text-primary)' }}>
                        “{c.translation_en_clear}”
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. THEME, SCRIPT & TYPOGRAPHY SETTINGS DRAWER */}
        {showSettingsDrawer && (
          <div className="spring-sheet-backdrop" onClick={() => setShowSettingsDrawer(false)}>
            <div
              className="spring-sheet-panel"
              style={{ height: '72%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-specular)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                    Design System &amp; Reading Preferences
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Ambient Themes &amp; Editorial Typography
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsDrawer(false)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-specular)',
                    color: 'var(--text-secondary)',
                    borderRadius: 10,
                    width: 30,
                    height: 30,
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="drawer-scroll" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Ambient Color Palette */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    1. Ambient Sanctuary Theme (Spec Section 2.1):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { id: 'midnight_sanctuary', label: 'Midnight Sanctuary', sub: 'Deep Obsidian & Burnished Gold', icon: <Moon size={14} /> },
                      { id: 'andalusian_parchment', label: 'Andalusian Parchment', sub: 'Warm Linen & Deep Ink', icon: <Sun size={14} /> },
                      { id: 'fajr_dawn', label: 'Fajr Dawn', sub: 'Indigo-Rose Morning Glow', icon: <Compass size={14} /> },
                      { id: 'maghrib_dusk', label: 'Maghrib Dusk', sub: 'Amber-Violet Horizon', icon: <Heart size={14} /> }
                    ].map((th) => {
                      const active = userState.theme === th.id;
                      return (
                        <button
                          key={th.id}
                          onClick={() => {
                            soundEngine.triggerHaptic('selectionTick');
                            updateServerState({ theme: th.id as UserState['theme'] });
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 14,
                            textAlign: 'left',
                            cursor: 'pointer',
                            border: active ? '1.5px solid var(--accent-gold-bright)' : '1px solid var(--border-specular)',
                            background: active ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
                            {th.icon} {th.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                            {th.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Arabic Script Toggle */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    2. Quranic Arabic Script Style (Spec Section 2.2):
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'uthmani', label: 'Uthmani Script (KFGQPC / Madinah)' },
                      { id: 'indopak', label: 'IndoPak Nastaleeq Script' }
                    ].map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => {
                          soundEngine.triggerHaptic('selectionTick');
                          updateServerState({ arabic_script: sc.id as 'uthmani' | 'indopak' });
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: userState.arabic_script === sc.id ? 700 : 500,
                          cursor: 'pointer',
                          border: userState.arabic_script === sc.id ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                          background: userState.arabic_script === sc.id ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                          color: userState.arabic_script === sc.id ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                        }}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* English Translation Edition */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    3. Primary Editorial Translation:
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'clear', label: 'The Clear Quran (Dr. Mustafa Khattab)' },
                      { id: 'sahih', label: 'Sahih International' }
                    ].map((tr) => (
                      <button
                        key={tr.id}
                        onClick={() => {
                          soundEngine.triggerHaptic('selectionTick');
                          updateServerState({ translation_edition: tr.id as 'clear' | 'sahih' });
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: userState.translation_edition === tr.id ? 700 : 500,
                          cursor: 'pointer',
                          border: userState.translation_edition === tr.id ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                          background: userState.translation_edition === tr.id ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                          color: userState.translation_edition === tr.id ? 'var(--accent-gold-bright)' : 'var(--text-secondary)'
                        }}
                      >
                        {tr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transliteration Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, background: 'var(--surface-card)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Show Phonetic Transliteration
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Helpful for learners reciting Arabic passages aloud
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = userState.show_transliteration === 'true' ? 'false' : 'true';
                      updateServerState({ show_transliteration: next });
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 99,
                      border: '1px solid var(--border-gold)',
                      background: userState.show_transliteration === 'true' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: userState.show_transliteration === 'true' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {userState.show_transliteration === 'true' ? 'Enabled ✓' : 'Hidden'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. ETHICAL MONETIZATION MODAL: HALAL SCROLL PLUS & SPONSOR-A-STUDENT */}
        {showPlusModal && (
          <div className="spring-sheet-backdrop" onClick={() => setShowPlusModal(false)}>
            <div
              className="spring-sheet-panel"
              style={{ height: '78%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-specular)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Crown size={18} style={{ color: 'var(--accent-gold-bright)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Halal Scroll Plus • Ethical Sadaqah Jariyah Model
                  </h3>
                </div>
                <button
                  onClick={() => setShowPlusModal(false)}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-specular)',
                    color: 'var(--text-secondary)',
                    borderRadius: 10,
                    width: 30,
                    height: 30,
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="drawer-scroll" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: 14,
                  borderRadius: 16,
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: 'var(--text-primary)'
                }}>
                  <strong style={{ color: 'var(--accent-emerald)' }}>Always Free (Sadaqah Jariyah Core):</strong> 100% of the Sequential Quran &amp; Hadith reader, the For You feed, standard audio recitation, and unlimited sharing of Static &amp; Video Cards—with <strong>zero third-party ads</strong> over sacred text.
                </div>

                <div style={{
                  padding: 16,
                  borderRadius: 18,
                  background: 'linear-gradient(145deg, rgba(212, 175, 55, 0.16), rgba(22, 26, 36, 0.7))',
                  border: '1px solid var(--border-gold)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-gold-bright)' }}>
                    Halal Scroll Plus ($4.99/mo • $29.99/yr • $79.99 Lifetime)
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>✓ <strong>Unlimited 5-Tab Deep Study Breakdowns</strong> (Tadabbur, Roots, Classical Tafsir &amp; Cross-References)</div>
                    <div>✓ <strong>Full Trilateral Arabic Root Word Explorer</strong> with Quranic occurrences</div>
                    <div>✓ <strong>Pro Share Studio:</strong> Multi-Slide Deep Study Carousels &amp; watermark toggle</div>
                    <div>✓ <strong>Mood &amp; Topic Custom Feeds + Offline Reciter Packs</strong></div>
                  </div>

                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('softSuccess');
                      updateServerState({ plus_member: userState.plus_member === 'true' ? 'false' : 'true' });
                    }}
                    style={{
                      marginTop: 6,
                      padding: '12px 16px',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #D4AF37, #B48A1E)',
                      border: 'none',
                      color: '#090A0F',
                      fontWeight: 800,
                      fontSize: 13.5,
                      cursor: 'pointer'
                    }}
                  >
                    {userState.plus_member === 'true' ? 'Plus Active ✓ (Tap to Toggle)' : 'Activate Halal Scroll Plus'}
                  </button>
                </div>

                {/* Sponsor-a-Student Scholarship */}
                <div style={{
                  padding: 16,
                  borderRadius: 16,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-specular)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GraduationCap size={16} style={{ color: 'var(--accent-emerald)' }} />
                      Sponsor-a-Student Scholarship
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Free, no-questions-asked Plus access for students or anyone who cannot afford a subscription.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('softSuccess');
                      updateServerState({ plus_member: 'true' });
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(16, 185, 129, 0.18)',
                      border: '1px solid var(--accent-emerald)',
                      color: 'var(--accent-emerald)',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Claim Free Scholarship
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

