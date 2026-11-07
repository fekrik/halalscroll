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

  const [doubleTapBurst, setDoubleTapBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const lastTapRef = useRef<{ time: number; cardId: string }>({ time: 0, cardId: '' });
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

        {/* 1. TOP HEADER BAR (In-Flow, No-Wrap Mobile Layout) */}
        <div style={{
          position: 'relative',
          flexShrink: 0,
          padding: '8px 10px 6px 10px',
          borderBottom: '1px solid var(--border-specular)',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'nowrap' }}>
            {/* Floating Frosted-Glass Segmented Mode Switcher */}
            <div
              className="glass-pill"
              style={{
                display: 'inline-flex',
                flexShrink: 0,
                padding: 3,
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
                      padding: '5px 9px',
                      borderRadius: 999,
                      border: 'none',
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      whiteSpace: 'nowrap',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setDeepStudyModal({ card: activeCard, initialTab: 'action' });
                }}
                className="glass-pill"
                title="Daily Tadabbur & Sunnah Streak"
                style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  color: 'var(--accent-gold-bright)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer'
                }}
              >
                <Flame size={13} fill="currentColor" />
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
                  width: 31,
                  height: 31,
                  borderRadius: 999,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                <Bookmark size={14} />
                {cards.filter(c => c.is_bookmarked).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 14,
                    height: 14,
                    borderRadius: 99,
                    background: 'var(--accent-gold)',
                    color: '#090A0F',
                    fontSize: 9,
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
                  width: 31,
                  height: 31,
                  borderRadius: 999,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <SlidersHorizontal size={14} />
              </button>

              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  setShowPlusModal(true);
                }}
                className="glass-pill"
                title="Halal Scroll Plus & Student Scholarship"
                style={{
                  width: 31,
                  height: 31,
                  borderRadius: 999,
                  color: userState.plus_member === 'true' ? 'var(--accent-emerald)' : 'var(--accent-gold-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Crown size={14} />
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
                className={`feed-card-snap ${cardIdx === activeCardIndex ? 'card-active' : 'card-inactive'}`}
                onClick={(e) => {
                  const now = Date.now();
                  if (lastTapRef.current.cardId === card.id && now - lastTapRef.current.time < 320) {
                    const burstId = now;
                    setDoubleTapBurst({ x: e.clientX, y: e.clientY, id: burstId });
                    if (!card.is_bookmarked) {
                      handleToggleBookmark(card, 'Favorites', 'add');
                    } else {
                      soundEngine.triggerHaptic('softSuccess');
                    }
                    setTimeout(() => {
                      setDoubleTapBurst(prev => (prev?.id === burstId ? null : prev));
                    }, 820);
                    lastTapRef.current = { time: 0, cardId: '' };
                  } else {
                    lastTapRef.current = { time: now, cardId: card.id };
                  }
                }}
              >
                {/* UNIFIED CARD CONTENT CLUSTER: Metadata Header + Sacred Text Canvas */}
                <div className="card-content-cluster" style={{ zIndex: 2 }}>
                  {/* TOP CARD METADATA HEADER (Clean 2-Line Mobile-Friendly Stack) */}
                  <div
                    className="reel-anim-meta"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', justifyContent: 'center', maxWidth: '100%' }}>
                      {/* Card Type Pill */}
                      <span style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '3px 8px',
                        borderRadius: 99,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
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
                        {card.card_type === 'quran' ? 'Quran' : card.card_type === 'hadith' ? 'Hadith' : card.card_type === 'dua' ? 'Dua' : 'Seerah'}
                      </span>

                      {/* Source Pill */}
                      <span
                        className="glass-pill"
                        style={{
                          padding: '3px 10px',
                          borderRadius: 99,
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {card.source_title}
                      </span>
                    </div>

                    {/* Authenticity / Revelation Subtitle */}
                    <div style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'var(--accent-emerald)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }}>
                      {card.revelation_place ? `${card.revelation_place} • ${card.authenticity_grade}` : card.authenticity_grade}
                      {card.narrator_chain ? ` • ${card.narrator_chain}` : ''}
                    </div>
                  </div>

                  {/* Complete Canonical Arabic Script (with Interactive Root Word Matching) */}
                  <div
                    className="arabic-sacred-text reel-anim-arabic"
                    style={{
                      fontSize: card.arabic_text_uthmani.length > 160 ? '1.45rem' : card.arabic_text_uthmani.length > 100 ? '1.62rem' : '1.88rem'
                    }}
                  >
                    {(() => {
                      const fullArabic = userState.arabic_script === 'indopak' && card.arabic_text_indopak
                        ? card.arabic_text_indopak
                        : card.arabic_text_uthmani;
                      const tokens = fullArabic.split(/\s+/);
                      const cleanToken = (s: string) => s.replace(/[،؟:؛.!۝ۚۗۖۙۘ]/g, '').trim();

                      return tokens.map((tok, tIdx) => {
                        if (tok.includes('۝')) {
                          return (
                            <React.Fragment key={tIdx}>
                              <span style={{ color: 'var(--accent-gold)', margin: '0 4px', fontSize: '0.9em' }}>{tok}</span>{' '}
                            </React.Fragment>
                          );
                        }

                        const cleaned = cleanToken(tok);
                        const matchedIdx = (card.words || []).findIndex((w) => {
                          const cw = cleanToken(w.arabic_word);
                          return cw === cleaned || (cleaned.length >= 3 && cw.includes(cleaned));
                        });
                        const matchedWord = matchedIdx >= 0 ? card.words[matchedIdx] : null;
                        const isWordActive = isCardPlaying && matchedIdx >= 0 && activeWordIdx === matchedIdx;
                        const isPopoverOpen = matchedWord && popoverWord?.word.word_position === matchedWord.word_position && popoverWord?.card.id === card.id;

                        return (
                          <React.Fragment key={tIdx}>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (matchedWord) {
                                  soundEngine.speakArabicWord(matchedWord);
                                  setPopoverWord({ word: matchedWord, card });
                                } else if (card.words && card.words.length > 0) {
                                  soundEngine.speakArabicWord({
                                    ...card.words[0],
                                    arabic_word: tok
                                  });
                                  setDeepStudyModal({ card, initialTab: 'words' });
                                }
                              }}
                              className={`arabic-word-token ${isWordActive || isPopoverOpen ? 'active-word-glow' : ''}`}
                              style={{
                                borderBottom: matchedWord ? '1px dotted rgba(168, 125, 32, 0.35)' : undefined
                              }}
                              title={
                                matchedWord
                                  ? `Tap for root (${matchedWord.root_arabic}) & meaning: "${matchedWord.translation_en}"`
                                  : 'Tap to hear pronunciation & open Word Explorer'
                              }
                            >
                              {tok}
                            </span>{' '}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>

                  {/* Subtle Interactive Hint Pill */}
                  <div
                    className="reel-anim-translation"
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>✦ Tap any highlighted Arabic word for Trilateral Root &amp; Audio</span>
                  </div>

                  {/* Optional Learner Transliteration */}
                  {userState.show_transliteration === 'true' && card.transliteration && (
                    <p className="transliteration-text reel-anim-translation" style={{ marginBottom: 6, maxWidth: 420 }}>
                      {card.transliteration}
                    </p>
                  )}

                  {/* Editorial Serif English Translation */}
                  <p
                    className="editorial-translation reel-anim-translation"
                    style={{
                      fontSize: translationText.length > 210 ? '1.05rem' : '1.18rem',
                      maxWidth: 430
                    }}
                  >
                    “{translationText}”
                  </p>
                </div>

                {/* BOTTOM THUMB-ZONE ACTION DOCK (No-Wrap Mobile-First 2-Row Layout) */}
                <div
                  className="reel-anim-dock"
                  style={{
                    width: '100%',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    zIndex: 15
                  }}
                >
                  {/* Row 1: Single-Line No-Wrap Action Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 5,
                    flexWrap: 'nowrap',
                    width: '100%'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap', minWidth: 0 }}>
                      {/* 1. Audio Play / Reciter Switcher */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={() => handleToggleRecitation(card)}
                          className={`glass-pill ${isCardPlaying ? 'audio-playing-ring' : ''}`}
                          title="Play Synchronized Word-by-Word Recitation"
                          style={{
                            padding: '7px 10px',
                            borderTopLeftRadius: 999,
                            borderBottomLeftRadius: 999,
                            color: isCardPlaying ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          {isCardPlaying ? <Pause size={13} /> : <Volume2 size={13} />}
                          <span>{isCardPlaying ? 'Pause' : 'Recite'}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.triggerHaptic('selectionTick');
                            setShowReciterMenuForCard(showReciterMenuForCard === card.id ? null : card.id);
                          }}
                          className="glass-pill"
                          title="Change Reciter"
                          style={{
                            padding: '7px 7px',
                            borderTopRightRadius: 999,
                            borderBottomRightRadius: 999,
                            borderLeft: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronDown size={12} />
                        </button>

                        {/* Reciter Quick-Switcher Popover */}
                        {showReciterMenuForCard === card.id && (
                          <div
                            className="glass-pill"
                            style={{
                              position: 'absolute',
                              left: 0,
                              bottom: 38,
                              width: 215,
                              padding: 8,
                              borderRadius: 16,
                              boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
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

                      {/* 2. Bookmark / Custom Collection Pill */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          onClick={() => handleToggleBookmark(card, 'Favorites', 'toggle')}
                          className="glass-pill"
                          title="Tap to Bookmark"
                          style={{
                            padding: '7px 10px',
                            borderTopLeftRadius: 999,
                            borderBottomLeftRadius: 999,
                            color: card.is_bookmarked ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                            borderColor: card.is_bookmarked ? 'var(--border-gold)' : undefined,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                        >
                          <Bookmark size={13} fill={card.is_bookmarked ? 'currentColor' : 'none'} />
                          <span>{card.is_bookmarked ? 'Saved' : 'Save'}</span>
                        </button>
                        <button
                          onClick={() => {
                            soundEngine.triggerHaptic('selectionTick');
                            setBookmarkFolderModalCard(card);
                          }}
                          className="glass-pill"
                          title="Choose Collection Folder"
                          style={{
                            padding: '7px 7px',
                            borderTopRightRadius: 999,
                            borderBottomRightRadius: 999,
                            borderLeft: 'none',
                            color: card.is_bookmarked ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>

                      {/* 3. Social Share Studio Pill */}
                      <button
                        onClick={() => {
                          soundEngine.triggerHaptic('lightImpact');
                          setShareStudioModal({ card, initialSlide: 0 });
                        }}
                        className="glass-pill"
                        title="Open Studio-Grade Social Share & Video Reel Exporter"
                        style={{
                          padding: '7px 11px',
                          borderRadius: 999,
                          color: 'var(--text-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          cursor: 'pointer'
                        }}
                      >
                        <Share2 size={13} />
                        <span>Share</span>
                      </button>
                    </div>

                    {/* Card Progress Pill */}
                    <div
                      className="glass-pill"
                      style={{
                        padding: '6px 9px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {cardIdx + 1}/{displayedCards.length}
                    </div>
                  </div>

                  {/* Row 2: Primary Full-Width "Deep Study & Tafsir" Pill */}
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('lightImpact');
                      setDeepStudyModal({ card, initialTab: 'summary' });
                    }}
                    className="glass-pill deep-study-cta"
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      borderRadius: 999,
                      border: '1px solid var(--border-gold)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                      <Sparkles size={15} style={{ color: 'var(--accent-gold-bright)' }} />
                      <span>Deep Study &amp; Tafsir</span>
                    </span>
                    <span style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: 'rgba(212, 175, 55, 0.16)',
                      color: 'var(--accent-gold-bright)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      5 Layers ↑
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* TIKTOK / REELS VERTICAL SCROLL PROGRESS DOTS (Right Edge) */}
        <div
          style={{
            position: 'absolute',
            right: 6,
            top: '48%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            zIndex: 20,
            pointerEvents: 'auto'
          }}
        >
          {displayedCards.map((c, idx) => {
            const isActive = idx === activeCardIndex;
            return (
              <button
                key={c.id}
                onClick={() => scrollToCardIndex(idx)}
                title={`Jump to ${c.source_title}`}
                style={{
                  width: 5,
                  height: isActive ? 18 : 5,
                  borderRadius: 99,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-gold-bright)' : 'var(--border-specular)',
                  boxShadow: isActive ? '0 0 8px rgba(212, 175, 55, 0.55)' : 'none',
                  transition: 'all 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              />
            );
          })}
        </div>

        {/* DOUBLE-TAP BOOKMARK BURST ANIMATION (TikTok / Instagram Reels Style) */}
        {doubleTapBurst && (
          <div
            key={doubleTapBurst.id}
            className="double-tap-burst"
            style={{
              left: doubleTapBurst.x,
              top: doubleTapBurst.y
            }}
          >
            <Bookmark size={64} fill="currentColor" />
          </div>
        )}

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

