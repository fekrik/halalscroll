import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles, Bookmark, Share2, Volume2, Pause, Flame, SlidersHorizontal,
  Crown, FolderPlus, Check, X, Compass, BookOpen, Heart, Sun, Moon,
  ChevronDown, ArrowUpRight, ShieldCheck, GraduationCap, Smartphone, Minus, Plus,
  Send, Highlighter, MessageCircle
} from 'lucide-react';
import { CardWord, DeepStudyTab, FeedCard, FeedMode, SurahInfo, UserState } from './types';
import { soundEngine, isNonSpokenArabicMarker } from './audioEngine';
import { DeepStudyDrawer } from './components/DeepStudyDrawer';
import { ShareStudioModal } from './components/ShareStudioModal';
import { InstallAppModal } from './components/InstallAppModal';
import {
  matchWordHighlight,
  getSacredContentIdentity,
  splitHadithNarratorAndQuote,
  splitDuaIntroAndSupplication,
  getArabicSacredQuoteTokenMask,
  resolveTappedArabicWord,
  WordHighlighterModal,
  PersonalNoteModal,
  OnboardingTutorialModal,
  InteractiveCoachMarksOverlay,
  WidgetsPreviewModal
} from './components/FeedExperienceModals';
import {
  getOfflineBootstrap,
  offlineToggleBookmark,
  offlineMarkPracticed,
  offlineUpdateState,
  applyLocalUserOverlays,
  getLocalFolders
} from './clientSeedFallback';
import { isNativeApp, apiUrl, initNativeShell } from './nativeBridge';

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
  const initialBoot = useMemo(() => {
    const winBoot = typeof window !== 'undefined' ? (window as any).__HALAL_BOOTSTRAP__ : null;
    if (winBoot && Array.isArray(winBoot.cards) && winBoot.cards.length > 0) {
      return { data: winBoot, fromServer: true };
    }
    return { data: getOfflineBootstrap(), fromServer: false };
  }, []);

  const [cards, setCards] = useState<FeedCard[]>(() => initialBoot.data.cards || []);
  const [userState, setUserState] = useState<UserState>(() => {
    let localState: Partial<UserState> = {};
    try {
      const raw = localStorage.getItem('halalscroll_state_v2');
      if (raw) {
        localState = JSON.parse(raw);
        if (localState.theme === 'andalusian_parchment') {
          localState.theme = 'fajr_dawn';
        }
      }
    } catch { }
    return {
      streak_count: '12',
      theme: 'system',
      arabic_script: 'uthmani',
      translation_edition: 'clear',
      show_transliteration: 'true',
      reciter: 'Mishary Rashid Alafasy',
      plus_member: 'false',
      sequential_quran_card: 'card-quran-1-1',
      sequential_book_card: 'card-nawawi-1',
      font_scale: '1',
      ...(initialBoot.data.state || {}),
      ...localState
    };
  });
  const [folders, setFolders] = useState<string[]>(() => {
    let localFolders: string[] = [];
    try {
      const raw = localStorage.getItem('halalscroll_folders_v1');
      if (raw) localFolders = JSON.parse(raw);
    } catch { }
    return Array.from(new Set([
      'Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization',
      ...(initialBoot.data.folders || []),
      ...localFolders
    ]));
  });
  const [loading, setLoading] = useState(false);

  // Navigation & Feed Mode State with persistent memory across app reloads
  const [feedMode, setFeedMode] = useState<FeedMode>(() => {
    try {
      const saved = localStorage.getItem('hs_last_feed_mode') as FeedMode;
      if (saved === 'for_you' || saved === 'sequential' || saved === 'moods') return saved;
    } catch { }
    return 'for_you';
  });
  const [selectedMood, setSelectedMood] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hs_last_mood');
      if (saved) return saved;
    } catch { }
    return 'anxious';
  });
  const [selectedCollection, setSelectedCollection] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('hs_last_collection');
      if (saved) return saved;
    } catch { }
    return 'quran';
  });
  const [selectedSurah, setSelectedSurah] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('hs_last_surah');
      if (saved) return Number(saved);
    } catch { }
    return null;
  });
  const [surahs, setSurahs] = useState<SurahInfo[]>(() => initialBoot.data.surahs || []);
  const [collectionCounts, setCollectionCounts] = useState<Record<string, number>>(
    () => initialBoot.data.collection_counts || {}
  );
  const [totalFeedCount, setTotalFeedCount] = useState<number>(
    () => initialBoot.data.total_corpus_count || (initialBoot.data.cards?.length || 16)
  );
  const [hasMoreFeed, setHasMoreFeed] = useState<boolean>(
    () => (initialBoot.data.cards?.length || 0) < (initialBoot.data.total_corpus_count || 0)
  );
  const [savedVaultCards, setSavedVaultCards] = useState<FeedCard[]>(
    () => initialBoot.data.bookmarked_cards || []
  );
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const isFetchingMoreRef = useRef<boolean>(false);
  const hasBackendApiRef = useRef<boolean>(initialBoot.fromServer);
  const isFirstFilterEffectRef = useRef<boolean>(true);
  // One stable browse seed per page load: fresh order on every refresh, consistent across pagination.
  // Prefer the seed the server used to rank the inlined first page so page 2+ continue the same ordering.
  const sessionIdRef = useRef<string>(
    (initialBoot.data as any).feed_seed ||
    'sess_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36)
  );

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

  // Likes, Sacred Word Highlighting & Onboarding Tutorial State
  const [likedCards, setLikedCards] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('hs_liked_cards_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [activeHighlightGroups, setActiveHighlightGroups] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('hs_highlight_groups_v1');
      return raw ? JSON.parse(raw) : ['allah', 'prophet'];
    } catch {
      return ['allah', 'prophet'];
    }
  });
  const [customHighlightWords, setCustomHighlightWords] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('hs_custom_highlights_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showHighlighterModal, setShowHighlighterModal] = useState<boolean>(false);
  const [sacredColorCodingEnabled, setSacredColorCodingEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hs_sacred_color_coding_v1') !== 'false';
    } catch {
      return true;
    }
  });
  const [personalNotes, setPersonalNotes] = useState<
    Record<string, { text: string; source_title: string; card_type: string; updatedAt: string }>
  >(() => {
    try {
      const raw = localStorage.getItem('hs_personal_notes_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [personalNoteModalCard, setPersonalNoteModalCard] = useState<FeedCard | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hs_onboarding_done_v1') !== 'true';
    } catch {
      return false;
    }
  });
  const [showCoachMarks, setShowCoachMarks] = useState<boolean>(false);
  const [showWidgetsModal, setShowWidgetsModal] = useState<boolean>(false);
  const [railScrubLabel, setRailScrubLabel] = useState<string | null>(null);

  const handleToggleSacredColorCoding = () => {
    setSacredColorCodingEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('hs_sacred_color_coding_v1', next ? 'true' : 'false');
      } catch { }
      return next;
    });
  };

  const handleSavePersonalNote = (cardId: string, text: string, sourceTitle: string, cardType: string) => {
    setPersonalNotes(prev => {
      const next = { ...prev };
      if (!text) {
        delete next[cardId];
      } else {
        next[cardId] = {
          text,
          source_title: sourceTitle,
          card_type: cardType,
          updatedAt: new Date().toISOString()
        };
      }
      try {
        localStorage.setItem('hs_personal_notes_v1', JSON.stringify(next));
      } catch { }
      return next;
    });
    // Also persist to SQLite practice/reflection endpoint when online
    if (hasBackendApiRef.current) {
      fetch(apiUrl('/api/practice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, reflection: text })
      }).catch(() => { });
    }
  };

  const handleDeletePersonalNote = (cardId: string) => {
    setPersonalNotes(prev => {
      const next = { ...prev };
      delete next[cardId];
      try {
        localStorage.setItem('hs_personal_notes_v1', JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const handleToggleLikeCard = (cardId: string, cardObj?: FeedCard) => {
    soundEngine.triggerHaptic('softSuccess');
    setLikedCards(prev => {
      const isNowLiked = !prev[cardId];
      const next = { ...prev, [cardId]: isNowLiked };
      try {
        localStorage.setItem('hs_liked_cards_v1', JSON.stringify(next));
      } catch { }
      if (cardObj && isNowLiked && !cardObj.is_bookmarked) {
        handleToggleBookmark(cardObj, 'Favorites', 'add');
      }
      return next;
    });
  };

  const handleToggleHighlightGroup = (groupId: string) => {
    setActiveHighlightGroups(prev => {
      const next = prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId];
      try {
        localStorage.setItem('hs_highlight_groups_v1', JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const handleAddCustomHighlightWord = (word: string) => {
    setCustomHighlightWords(prev => {
      if (prev.includes(word)) return prev;
      const next = [...prev, word];
      try {
        localStorage.setItem('hs_custom_highlights_v1', JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const handleRemoveCustomHighlightWord = (word: string) => {
    setCustomHighlightWords(prev => {
      const next = prev.filter(w => w !== word);
      try {
        localStorage.setItem('hs_custom_highlights_v1', JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const handleCompleteOnboarding = () => {
    try {
      localStorage.setItem('hs_onboarding_done_v1', 'true');
    } catch { }
    setShowOnboardingModal(false);
    try {
      if (localStorage.getItem('hs_coachmarks_done_v1') !== 'true') {
        setShowCoachMarks(true);
      }
    } catch { }
  };

  const handleDismissCoachMarks = () => {
    try {
      localStorage.setItem('hs_coachmarks_done_v1', 'true');
    } catch { }
    setShowCoachMarks(false);
  };
  const [webCompanionSlug, setWebCompanionSlug] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/c/')) {
      return decodeURIComponent(path.replace('/c/', ''));
    }
    return null;
  });

  // PWA Standalone Detection & Installation Modal State
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (isNativeApp()) return true;
    if (typeof window === 'undefined') return false;
    try {
      const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
      return Boolean((mq && mq.matches) || (window.navigator as any)?.standalone);
    } catch {
      return false;
    }
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)') : null;
        const isStandaloneCheck = isNativeApp() || Boolean((mq && mq.matches) || (window.navigator as any)?.standalone);
        setIsStandalone(isStandaloneCheck);
      } catch { }

      const handleBeforeInstall = (e: any) => {
        try {
          e.preventDefault();
          setDeferredInstallPrompt(e);
        } catch { }
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[PWA] Service worker registration error:', err);
        });
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = () => {
    soundEngine.triggerHaptic('selectionTick');
    setShowInstallModal(true);
  };

  const [doubleTapBurst, setDoubleTapBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const lastTapRef = useRef<{ time: number; cardId: string }>({ time: 0, cardId: '' });
  const feedContainerRef = useRef<HTMLDivElement | null>(null);
  const feedModeRef = useRef<FeedMode>(feedMode);
  feedModeRef.current = feedMode;

  // Load initial data from SQLite backend only if not already inlined in window.__HALAL_BOOTSTRAP__
  useEffect(() => {
    const applyBootData = (data: {
      cards?: FeedCard[];
      total_corpus_count?: number;
      collection_counts?: Record<string, number>;
      surahs?: SurahInfo[];
      bookmarked_cards?: FeedCard[];
      state?: Partial<UserState>;
      folders?: string[];
    }) => {
      const native = isNativeApp();
      if (data.cards) {
        const preparedCards = native ? applyLocalUserOverlays(data.cards) : data.cards;
        if (feedModeRef.current === 'for_you') {
          setCards(preparedCards);
        }
        if (native) {
          setSavedVaultCards(preparedCards.filter(c => c.is_bookmarked));
        }
      }
      if (data.surahs) setSurahs(data.surahs);
      if (data.collection_counts) setCollectionCounts(data.collection_counts);
      if (data.total_corpus_count) {
        setTotalFeedCount(data.total_corpus_count);
        setHasMoreFeed(true);
      }
      if (!native && data.bookmarked_cards) setSavedVaultCards(data.bookmarked_cards);
      if (!native && data.state) setUserState(prev => ({ ...prev, ...data.state }));
      if (native) {
        setFolders(getLocalFolders());
      } else if (data.folders) {
        setFolders(data.folders);
      }
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
          setTimeout(() => scrollToCardIndex(idx), 80);
        } else if (hasBackendApiRef.current) {
          fetch(apiUrl(`/api/cards/${encodeURIComponent(slug)}`))
            .then(r => (r.ok ? r.json() : null))
            .then(res => {
              if (res?.card) {
                const card = isNativeApp() ? applyLocalUserOverlays([res.card])[0] : res.card;
                setCards(prev => [card, ...prev.filter(c => c.id !== card.id)]);
                setActiveCardIndex(0);
              }
            })
            .catch(() => { });
        }
      }
    };

    if (initialBoot.fromServer) {
      applyBootData(initialBoot.data);
      return;
    }

    fetch(apiUrl('/api/bootstrap'))
      .then(r => {
        if (!r.ok) throw new Error('Static mode');
        hasBackendApiRef.current = true;
        return r.json();
      })
      .then((data) => applyBootData(data))
      .catch(() => {
        hasBackendApiRef.current = false;
      });
  }, []);

  // Fetch filtered page from /api/feed when mode, collection, surah, or mood changes
  useEffect(() => {
    if (isFirstFilterEffectRef.current) {
      isFirstFilterEffectRef.current = false;
      // Only skip if we already have server-inlined "For You" cards
      if (feedMode === 'for_you' && initialBoot.fromServer) return;
    }
    const params = new URLSearchParams({
      mode: feedMode,
      collection: selectedCollection,
      session_id: sessionIdRef.current,
      offset: '0',
      limit: feedMode === 'sequential' ? '60' : '30'
    });
    if (feedMode === 'sequential' && selectedCollection === 'quran' && selectedSurah) {
      params.set('surah', String(selectedSurah));
    }
    if (feedMode === 'moods' && selectedMood !== 'all') {
      params.set('mood', selectedMood);
    }

    fetch(apiUrl(`/api/feed?${params.toString()}`))
      .then(r => (r.ok ? r.json() : null))
      .then(page => {
        if (page && Array.isArray(page.cards) && page.cards.length > 0) {
          hasBackendApiRef.current = true;
          const prepared = isNativeApp() ? applyLocalUserOverlays(page.cards) : page.cards;
          setCards(prepared);
          setTotalFeedCount(page.total || prepared.length);
          setHasMoreFeed(true);
          setActiveCardIndex(0);
          if (feedContainerRef.current) feedContainerRef.current.scrollTop = 0;
        }
      })
      .catch(() => { });
  }, [feedMode, selectedCollection, selectedSurah, selectedMood]);

  const fetchNextFeedPage = () => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;
    const params = new URLSearchParams({
      mode: feedMode,
      collection: selectedCollection,
      session_id: sessionIdRef.current,
      offset: String(cards.length),
      limit: '40'
    });
    if (feedMode === 'sequential' && selectedCollection === 'quran' && selectedSurah) {
      params.set('surah', String(selectedSurah));
    }
    if (feedMode === 'moods' && selectedMood !== 'all') {
      params.set('mood', selectedMood);
    }

    fetch(apiUrl(`/api/feed?${params.toString()}`))
      .then(r => (r.ok ? r.json() : null))
      .then(async (page) => {
        if (page && Array.isArray(page.cards) && page.cards.length > 0) {
          hasBackendApiRef.current = true;
          const prepared = isNativeApp() ? applyLocalUserOverlays(page.cards) : page.cards;
          setCards(prev => {
            const seen = new Set(prev.map(c => c.id));
            const fresh = prepared.filter((c: FeedCard) => !seen.has(c.id));
            return fresh.length > 0 ? [...prev, ...fresh] : [...prev, ...prepared];
          });
          setTotalFeedCount(page.total || cards.length);
          setHasMoreFeed(true);
        } else if (feedMode !== 'sequential') {
          // Endless scrolling: rotate session seed and fetch fresh stream from the 14,678-card corpus
          sessionIdRef.current = 'sess_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
          params.set('session_id', sessionIdRef.current);
          params.set('offset', '0');
          const retry = await fetch(apiUrl(`/api/feed?${params.toString()}`)).then(r => (r.ok ? r.json() : null));
          if (retry && Array.isArray(retry.cards) && retry.cards.length > 0) {
            const prepared = isNativeApp() ? applyLocalUserOverlays(retry.cards) : retry.cards;
            setCards(prev => [...prev, ...prepared]);
            setHasMoreFeed(true);
          }
        } else {
          setHasMoreFeed(false);
        }
      })
      .catch(() => { })
      .finally(() => {
        isFetchingMoreRef.current = false;
      });
  };

  // Persist filter preferences across reloads
  useEffect(() => {
    try {
      localStorage.setItem('hs_last_feed_mode', feedMode);
      localStorage.setItem('hs_last_mood', selectedMood);
      localStorage.setItem('hs_last_collection', selectedCollection);
      if (selectedSurah) {
        localStorage.setItem('hs_last_surah', String(selectedSurah));
      } else {
        localStorage.removeItem('hs_last_surah');
      }
    } catch { }
  }, [feedMode, selectedMood, selectedCollection, selectedSurah]);

  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    setSystemPrefersLight(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // Sync theme attribute on document root & native status bar
  const resolvedTheme = userState.theme === 'system'
    ? (systemPrefersLight ? 'andalusian_parchment' : 'midnight_sanctuary')
    : (userState.theme || 'midnight_sanctuary');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    initNativeShell(resolvedTheme);
  }, [resolvedTheme]);

  // Filtered Cards based on active Feed Mode (when server pagination is active, `cards` already matches the filter)
  const displayedCards = useMemo(() => {
    if (hasBackendApiRef.current) {
      return cards;
    }
    if (feedMode === 'for_you') {
      return cards;
    }
    if (feedMode === 'sequential') {
      return cards
        .filter(c => c.collection_slug === selectedCollection && (!selectedSurah || c.surah_or_book_num === selectedSurah))
        .sort((a, b) => (a.surah_or_book_num || 0) - (b.surah_or_book_num || 0) || (a.ayah_start || 0) - (b.ayah_start || 0) || a.sequence_order - b.sequence_order);
    }
    if (feedMode === 'moods') {
      if (selectedMood === 'all') return cards;
      return cards.filter(
        c => (c.mood_tags || []).includes(selectedMood) || (c.topic_tags || []).includes(selectedMood)
      );
    }
    return cards;
  }, [cards, feedMode, selectedCollection, selectedSurah, selectedMood]);

  const activeCard = displayedCards[activeCardIndex] || displayedCards[0] || null;

  const updateServerState = async (patch: Partial<UserState>) => {
    setUserState(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('halalscroll_state_v2', JSON.stringify(next));
      } catch { }
      return next;
    });
    offlineUpdateState(patch);
    if (isNativeApp()) return;
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setUserState(prev => {
            const next = { ...prev, ...data.state };
            try {
              localStorage.setItem('halalscroll_state_v2', JSON.stringify(next));
            } catch { }
            return next;
          });
        }
      }
    } catch { }
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
    const inCurrent = displayedCards.findIndex(c => c.id === idOrSlug || c.share_slug === idOrSlug);
    if (inCurrent >= 0) {
      scrollToCardIndex(inCurrent);
    } else if (hasBackendApiRef.current) {
      fetch(apiUrl(`/api/cards/${encodeURIComponent(idOrSlug)}`))
        .then(r => (r.ok ? r.json() : null))
        .then(res => {
          if (res?.card) {
            const card = isNativeApp() ? applyLocalUserOverlays([res.card])[0] : res.card;
            setCards(prev => [card, ...prev.filter(c => c.id !== card.id)]);
            scrollToCardIndex(0);
          }
        })
        .catch(() => { });
    } else {
      setFeedMode('for_you');
      setTimeout(() => {
        const allIdx = cards.findIndex(c => c.id === idOrSlug || c.share_slug === idOrSlug);
        if (allIdx >= 0) scrollToCardIndex(allIdx);
      }, 60);
    }
  };

  const stopAllCardAudio = () => {
    soundEngine.stopRecitation();
    setPlayingCardId(null);
    setActiveWordIdx(-1);
    setShowReciterMenuForCard(null);
  };

  // Stop recitation or transcript audio whenever switching tabs, collections, moods, surahs, or active cards
  useEffect(() => {
    stopAllCardAudio();
    setPopoverWord(null);
  }, [activeCard?.id, feedMode, selectedCollection, selectedSurah, selectedMood]);

  // Stop recitation or transcript audio when switching browser tabs or backgrounding the app
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVisibilityOrHide = () => {
      if (document.hidden) {
        stopAllCardAudio();
      }
    };
    const handlePageHide = () => {
      stopAllCardAudio();
    };
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('blur', handlePageHide);
    };
  }, []);

  const handleFeedScroll = () => {
    const container = feedContainerRef.current;
    if (!container || container.clientHeight === 0) return;

    // Immediately stop audio as soon as the user begins scrolling away from the active card
    if (Math.abs(container.scrollTop - activeCardIndex * container.clientHeight) > 20) {
      soundEngine.stopRecitation();
      if (playingCardId) {
        setPlayingCardId(null);
        setActiveWordIdx(-1);
      }
    }

    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== activeCardIndex && newIndex >= 0 && newIndex < displayedCards.length) {
      setActiveCardIndex(newIndex);
      soundEngine.triggerHaptic('lightImpact');
      setPopoverWord(null);
      stopAllCardAudio();
      // Automatically prefetch next page when within 10 cards of the end
      if (newIndex >= displayedCards.length - 10 && hasMoreFeed) {
        fetchNextFeedPage();
      }
      // Track seen cards in backend for smart exploration (web mode)
      const current = displayedCards[newIndex];
      if (current && hasBackendApiRef.current && !isNativeApp()) {
        fetch('/api/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ card_ids: [current.id] })
        }).catch(() => { });
      }
      // Save reading progress in Sequential mode
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
        },
        userState.reciter,
        userState.arabic_script
      );
    }
  };

  const handleToggleBookmark = async (card: FeedCard, folderName = 'Favorites', action: 'toggle' | 'add' | 'remove' = 'toggle') => {
    soundEngine.triggerHaptic('softSuccess');
    const applyBookmarkData = (data: { card?: FeedCard; bookmarked_cards?: FeedCard[]; cards?: FeedCard[]; folders?: string[] }) => {
      if (data.card) {
        setCards(prev => prev.map(c => (c.id === data.card!.id ? data.card! : c)));
        if (bookmarkFolderModalCard && bookmarkFolderModalCard.id === data.card.id) {
          setBookmarkFolderModalCard(data.card);
        }
      } else if (data.cards) {
        setCards(data.cards);
      }
      if (data.bookmarked_cards) setSavedVaultCards(data.bookmarked_cards);
      if (data.folders) setFolders(data.folders);
    };

    if (isNativeApp()) {
      const fallback = offlineToggleBookmark(card.id, folderName, action);
      const updated = fallback.cards.find(c => c.id === card.id);
      if (updated) {
        setCards(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        if (bookmarkFolderModalCard && bookmarkFolderModalCard.id === updated.id) {
          setBookmarkFolderModalCard(updated);
        }
        setSavedVaultCards(prev => {
          const rest = prev.filter(c => c.id !== updated.id);
          return updated.is_bookmarked ? [updated, ...rest] : rest;
        });
      }
      if (fallback.folders) setFolders(fallback.folders);
      return;
    }
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
    const applyPracticeData = (data: { card?: FeedCard; cards?: FeedCard[]; state?: Partial<UserState> }) => {
      if (data.card) {
        setCards(prev => prev.map(c => (c.id === data.card!.id ? data.card! : c)));
        if (deepStudyModal && deepStudyModal.card.id === cardId) {
          setDeepStudyModal({ ...deepStudyModal, card: data.card });
        }
      } else if (data.cards) {
        setCards(data.cards);
        const updated = data.cards.find((c: FeedCard) => c.id === cardId);
        if (updated && deepStudyModal) {
          setDeepStudyModal({ ...deepStudyModal, card: updated });
        }
      }
      if (data.state) setUserState(prev => ({ ...prev, ...data.state }));
    };

    if (isNativeApp()) {
      const fallback = offlineMarkPracticed(cardId, practiced, reflectionNote);
      const updated = fallback.cards.find(c => c.id === cardId);
      if (updated) {
        setCards(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        if (deepStudyModal && deepStudyModal.card.id === cardId) {
          setDeepStudyModal({ ...deepStudyModal, card: updated });
        }
      }
      if (fallback.state) setUserState(prev => ({ ...prev, ...fallback.state }));
      return;
    }
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
    const sourceList = savedVaultCards.length > 0 ? savedVaultCards : cards.filter(c => c.is_bookmarked);
    return sourceList.filter(c => {
      if (!c.is_bookmarked) return false;
      if (vaultFilterFolder === 'All') return true;
      return c.bookmark_folders.includes(vaultFilterFolder);
    });
  }, [savedVaultCards, cards, vaultFilterFolder]);

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
            paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
            paddingBottom: '8px',
            paddingLeft: 'calc(14px + env(safe-area-inset-left, 0px))',
            paddingRight: 'calc(14px + env(safe-area-inset-right, 0px))',
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.22), rgba(16, 185, 129, 0.18))',
            borderBottom: '1px solid var(--border-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-primary)' }}>
              <strong>Halal Scroll:</strong> <span>Read, Listen &amp; Explore Roots</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a
                href="https://apps.apple.com/app/halal-scroll-quran-sunnah/id6834652749"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: '#E8C968',
                  color: '#090A0F',
                  textDecoration: 'none',
                  fontWeight: 800,
                  whiteSpace: 'nowrap'
                }}
              >
                Get on App Store ↗
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
          paddingTop: webCompanionSlug && activeCard ? '8px' : 'calc(8px + env(safe-area-inset-top, 0px))',
          paddingBottom: '6px',
          paddingLeft: 'calc(10px + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(10px + env(safe-area-inset-right, 0px))',
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
                title="Settings, Reading Preferences & About"
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

              {!isStandalone && (
                <button
                  onClick={handleInstallClick}
                  className="glass-pill"
                  title="Install Halal Scroll App on your iPhone or Android"
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 999,
                    color: 'var(--accent-gold-bright)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: 'rgba(212, 175, 55, 0.18)',
                    border: '1px solid var(--border-gold)',
                    flexShrink: 0
                  }}
                >
                  <Smartphone size={14} />
                </button>
              )}
            </div>
          </div>

          {/* SUB-BAR FOR MODE B: SEQUENTIAL (Khatmah & Book Reader + 114 Surahs Picker) */}
          {feedMode === 'sequential' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div
                className="glass-pill no-scrollbar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 16,
                  overflowX: 'auto'
                }}
              >
                {SEQUENTIAL_COLLECTIONS.map((col) => {
                  const isSel = selectedCollection === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => {
                        soundEngine.triggerHaptic('selectionTick');
                        setSelectedCollection(col.id);
                        setSelectedSurah(null);
                        setActiveCardIndex(0);
                        if (feedContainerRef.current) feedContainerRef.current.scrollTop = 0;
                      }}
                      style={{
                        flexShrink: 0,
                        padding: '6px 14px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        border: isSel ? '1px solid var(--border-gold)' : '1px solid transparent',
                        background: isSel ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: isSel ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <span>{col.label}</span>
                    </button>
                  );
                })}
              </div>

              {selectedCollection === 'quran' && surahs.length > 0 && (
                <div
                  className="glass-pill"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '5px 12px',
                    borderRadius: 14
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold-bright)', whiteSpace: 'nowrap' }}>
                    Jump to Surah:
                  </span>
                  <select
                    value={selectedSurah || ''}
                    onChange={(e) => {
                      soundEngine.triggerHaptic('selectionTick');
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedSurah(val);
                    }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-specular)',
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    <option value="">All 114 Surahs</option>
                    {surahs.map(s => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {s.name_simple} ({s.name_arabic}) — {s.translated_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
            // Virtual windowing: keep only cards within +/- 8 of activeCardIndex fully mounted for 60fps scrolling across 14,678 cards
            if (Math.abs(cardIdx - activeCardIndex) > 8) {
              return (
                <div key={card.id} className="feed-card-snap card-inactive">
                  <div className="card-content-cluster" style={{ opacity: 0.2 }}>
                    <span className="glass-pill" style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11 }}>
                      {card.source_title}
                    </span>
                  </div>
                </div>
              );
            }

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
                {/* UNIFIED CARD CONTENT CLUSTER: Slim Top Metadata + Vertically Balanced Sacred Text + Act On It Today */}
                <div className="card-content-cluster" style={{ zIndex: 2, paddingRight: 44 }}>
                  {/* SLIM TOP CARD METADATA HEADER */}
                  {(() => {
                    const sacredIdentity = getSacredContentIdentity(card);
                    return (
                      <div
                        className="reel-anim-meta"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3,
                          width: '100%',
                          flexShrink: 0
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', justifyContent: 'center', maxWidth: '100%' }}>
                          <span style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '2px 8px',
                            borderRadius: 99,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            background: sacredIdentity.pillBg,
                            border: `1px solid ${sacredIdentity.pillBorder}`,
                            color: sacredIdentity.accentColor
                          }}>
                            {sacredIdentity.badgeLabel}
                          </span>

                          <span
                            style={{
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

                        <div style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%'
                        }}>
                          {card.revelation_place ? `${card.revelation_place} • ${card.authenticity_grade}` : card.authenticity_grade}
                        </div>
                      </div>
                    );
                  })()}

                  {/* VERTICALLY CENTERED SACRED PASSAGE CANVAS (Arabic + Translation + Act On It Today) */}
                  {(() => {
                    const sacredIdentity = getSacredContentIdentity(card);
                    const fontScale = Math.min(1.5, Math.max(0.8, Number(userState.font_scale || '1') || 1));
                    const fullArabicScript = userState.arabic_script === 'indopak' && card.arabic_text_indopak
                      ? card.arabic_text_indopak
                      : card.arabic_text_uthmani;
                    const allArabicTokens = fullArabicScript.split(/\s+/).filter(Boolean);
                    const isLongArabic = allArabicTokens.length > 44;
                    const visibleArabicTokens = isLongArabic ? allArabicTokens.slice(0, 42) : allArabicTokens;
                    const arabicQuoteMask = getArabicSacredQuoteTokenMask(visibleArabicTokens, card.card_type);
                    const isLongTranslation = translationText.length > 310;
                    const clampedTranslationText = isLongTranslation
                      ? `${translationText.slice(0, 290).replace(/\s+\S*$/, '')}…`
                      : translationText;

                    const baseArabicRem =
                      visibleArabicTokens.length > 34 ? 1.18 :
                      visibleArabicTokens.length > 24 ? 1.32 :
                      visibleArabicTokens.length > 14 ? 1.48 :
                      visibleArabicTokens.length > 8 ? 1.65 : 1.88;
                    const baseTransRem =
                      clampedTranslationText.length > 240 ? 0.94 :
                      clampedTranslationText.length > 160 ? 1.04 : 1.14;

                    const renderHighlightedEnglishChunk = (textSegment: string, keyPrefix: string) =>
                      textSegment.split(/(\s+)/).map((chunk, cIdx) => {
                        if (/^\s+$/.test(chunk)) return chunk;
                        const hl = matchWordHighlight(chunk, 'en', activeHighlightGroups, customHighlightWords);
                        if (!hl) return <React.Fragment key={`${keyPrefix}-${cIdx}`}>{chunk}</React.Fragment>;
                        return (
                          <span
                            key={`${keyPrefix}-${cIdx}`}
                            style={{
                              background: hl.bg,
                              color: hl.color,
                              borderBottom: `1.5px solid ${hl.border}`,
                              borderRadius: 5,
                              padding: '0 4px',
                              fontWeight: 600
                            }}
                            title={hl.label}
                          >
                            {chunk}
                          </span>
                        );
                      });

                    return (
                      <div
                        style={{
                          marginTop: 'auto',
                          marginBottom: 'auto',
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <div
                          className="arabic-sacred-text reel-anim-arabic"
                          style={{
                            fontSize: `${(baseArabicRem * fontScale).toFixed(2)}rem`,
                            lineHeight: visibleArabicTokens.length > 24 ? 1.66 : 1.82
                          }}
                        >
                          {(() => {
                            let spokenTokenCounter = 0;

                            return (
                              <>
                                {visibleArabicTokens.map((tok, tIdx) => {
                                  if (tok.includes('۝')) {
                                    return (
                                      <React.Fragment key={tIdx}>
                                        <span style={{ color: 'var(--accent-gold)', margin: '0 4px', fontSize: '0.9em' }}>{tok}</span>{' '}
                                      </React.Fragment>
                                    );
                                  }

                                  const isNonSpoken = isNonSpokenArabicMarker(tok);
                                  const currentSpokenIdx = isNonSpoken ? -1 : spokenTokenCounter++;
                                  const isWordActive = !isNonSpoken && isCardPlaying && activeWordIdx === currentSpokenIdx;
                                  const sacredHighlight = matchWordHighlight(tok, 'ar', activeHighlightGroups, customHighlightWords);
                                  const isDirectSacredQuote = arabicQuoteMask[tIdx];
                                  const tokenSourceColor =
                                    sacredColorCodingEnabled && isDirectSacredQuote
                                      ? sacredIdentity.textTint
                                      : 'var(--text-primary)';

                                  return (
                                    <React.Fragment key={tIdx}>
                                      <span
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isNonSpoken) return;
                                          const resolvedWord = resolveTappedArabicWord(tok, tIdx, card, translationText);
                                          soundEngine.speakArabicWord(resolvedWord);
                                          setPopoverWord({ word: resolvedWord, card });
                                        }}
                                        className={`arabic-word-token ${isWordActive ? 'active-word-glow' : ''}`}
                                        style={{
                                          background: !isWordActive && sacredHighlight ? sacredHighlight.bg : undefined,
                                          color: !isWordActive
                                            ? (sacredHighlight ? sacredHighlight.color : tokenSourceColor)
                                            : undefined,
                                          borderRadius: sacredHighlight ? 6 : undefined,
                                          padding: sacredHighlight ? '0 4px' : undefined,
                                          borderBottom: sacredHighlight
                                            ? `1.5px solid ${sacredHighlight.border}`
                                            : undefined
                                        }}
                                        title="Tap to hear pronunciation & inspect 3-letter Arabic root"
                                      >
                                        {tok}
                                      </span>{' '}
                                    </React.Fragment>
                                  );
                                })}
                                {isLongArabic && (
                                  <span style={{ color: 'var(--accent-gold)', fontSize: '0.82em' }}>…</span>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* Optional Learner Transliteration (Controlled via Settings) */}
                        {userState.show_transliteration === 'true' && card.card_type !== 'quran' && card.transliteration && (
                          <p
                            className="transliteration-text reel-anim-translation"
                            style={{
                              fontSize: `${(0.84 * fontScale).toFixed(2)}rem`,
                              margin: 0,
                              maxWidth: 420
                            }}
                          >
                            {card.transliteration}
                          </p>
                        )}

                        {/* Editorial Serif English Translation (Items 5 & 6: Partial Highlighting Only on Direct Prophetic Speech or Actual Dua) */}
                        {card.card_type === 'hadith' && sacredColorCodingEnabled ? (() => {
                          const split = splitHadithNarratorAndQuote(clampedTranslationText);
                          return (
                            <div
                              className="editorial-translation reel-anim-translation"
                              style={{
                                fontSize: `${(baseTransRem * fontScale).toFixed(2)}rem`,
                                lineHeight: clampedTranslationText.length > 200 ? 1.48 : 1.56,
                                maxWidth: 420,
                                textAlign: 'center',
                                color: 'var(--text-primary)'
                              }}
                            >
                              {split.narratorIntro && (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'normal' }}>
                                  {renderHighlightedEnglishChunk(split.narratorIntro, 'hn')}{' '}
                                </span>
                              )}
                              <span style={{ color: sacredIdentity.textTint, fontWeight: 500 }}>
                                “{renderHighlightedEnglishChunk(split.propheticQuote, 'hq')}”
                              </span>
                              {split.closingText && (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'normal', fontSize: '0.9em' }}>
                                  {' '}{split.closingText}
                                </span>
                              )}
                            </div>
                          );
                        })() : (card.card_type === 'dua' || card.card_type === 'seerah') && sacredColorCodingEnabled ? (() => {
                          const splitDua = splitDuaIntroAndSupplication(clampedTranslationText);
                          return (
                            <div
                              className="editorial-translation reel-anim-translation"
                              style={{
                                fontSize: `${(baseTransRem * fontScale).toFixed(2)}rem`,
                                lineHeight: clampedTranslationText.length > 200 ? 1.48 : 1.56,
                                maxWidth: 420,
                                textAlign: 'center',
                                color: 'var(--text-primary)'
                              }}
                            >
                              {splitDua.introText && (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'normal' }}>
                                  {renderHighlightedEnglishChunk(splitDua.introText, 'dn')}{' '}
                                </span>
                              )}
                              <span style={{ color: sacredIdentity.textTint, fontWeight: 500 }}>
                                “{renderHighlightedEnglishChunk(splitDua.supplicationText, 'dq')}”
                              </span>
                              {splitDua.closingText && (
                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'normal', fontSize: '0.9em' }}>
                                  {' '}{splitDua.closingText}
                                </span>
                              )}
                            </div>
                          );
                        })() : (
                          <p
                            className="editorial-translation reel-anim-translation"
                            style={{
                              fontSize: `${(baseTransRem * fontScale).toFixed(2)}rem`,
                              lineHeight: clampedTranslationText.length > 200 ? 1.48 : 1.56,
                              maxWidth: 420,
                              margin: 0,
                              color: sacredColorCodingEnabled ? sacredIdentity.textTint : 'var(--text-primary)'
                            }}
                          >
                            “{renderHighlightedEnglishChunk(clampedTranslationText, 'eq')}”
                          </p>
                        )}

                        {/* ITEM 9: PROMOTED "ACT ON IT TODAY" DIRECTLY UNDER MAIN FEED PASSAGE */}
                        {card.deep_study?.actionable_sunnah && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              soundEngine.triggerHaptic('selectionTick');
                              setDeepStudyModal({ card, initialTab: 'action' });
                            }}
                            style={{
                              width: '100%',
                              maxWidth: 410,
                              marginTop: 4,
                              padding: '8px 12px',
                              borderRadius: 12,
                              background: 'var(--surface-card)',
                              border: '1px solid var(--border-specular)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{
                                fontSize: 9.5,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--accent-gold-bright)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <Compass size={11} /> Act On It Today
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextPracticed = !card.practiced?.practiced_at;
                                  handleMarkPracticed(card.id, nextPracticed, card.practiced?.reflection_note || '');
                                }}
                                style={{
                                  background: card.practiced?.practiced_at ? 'rgba(16, 185, 129, 0.2)' : 'rgba(212, 175, 55, 0.14)',
                                  border: card.practiced?.practiced_at ? '1px solid var(--accent-emerald)' : '1px solid var(--border-gold)',
                                  color: card.practiced?.practiced_at ? 'var(--accent-emerald)' : 'var(--accent-gold-bright)',
                                  borderRadius: 99,
                                  padding: '2px 8px',
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {card.practiced?.practiced_at ? '✓ Practiced' : '+ Practice'}
                              </button>
                            </div>
                            <div style={{
                              fontSize: 11.5,
                              lineHeight: 1.4,
                              color: 'var(--text-secondary)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {card.deep_study.actionable_sunnah}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ITEM 7: RIGHT-SIDE VERTICAL ACTION STACK (Like, Private Note, Share) */}
                <div
                  style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 14,
                    zIndex: 18
                  }}
                >
                  {/* 1. Heart: Like / Favorite & Save */}
                  {(() => {
                    const isFavorited = Boolean(likedCards[card.id] || card.is_bookmarked);
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLikeCard(card.id, card);
                        }}
                        aria-label="Favorite and save passage"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          color: isFavorited ? '#FF3B5C' : 'var(--text-primary)',
                          cursor: 'pointer',
                          transform: isFavorited ? 'scale(1.06)' : 'scale(1)',
                          transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                      >
                        <Heart size={22} strokeWidth={2} fill={isFavorited ? '#FF3B5C' : 'none'} />
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: isFavorited ? '#FF3B5C' : 'var(--text-secondary)' }}>
                          {isFavorited ? 'Liked' : 'Like'}
                        </span>
                      </button>
                    );
                  })()}

                  {/* 2. Speech Bubble: Private Personal Notes */}
                  {(() => {
                    const hasPrivateNote = Boolean(personalNotes[card.id]?.text?.trim());
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.triggerHaptic('selectionTick');
                          setPersonalNoteModalCard(card);
                        }}
                        aria-label="Private personal notes"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          color: hasPrivateNote ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <MessageCircle size={22} strokeWidth={2} fill={hasPrivateNote ? 'rgba(232, 201, 104, 0.25)' : 'none'} />
                        {hasPrivateNote && (
                          <span style={{
                            position: 'absolute',
                            top: 1,
                            right: 1,
                            width: 6,
                            height: 6,
                            borderRadius: 99,
                            background: '#10B981'
                          }} />
                        )}
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: hasPrivateNote ? 'var(--accent-gold-bright)' : 'var(--text-secondary)' }}>
                          {hasPrivateNote ? 'My Note' : 'Note'}
                        </span>
                      </button>
                    );
                  })()}

                  {/* 3. Paper Airplane: Share */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.triggerHaptic('lightImpact');
                      setShareStudioModal({ card, initialSlide: 0 });
                    }}
                    aria-label="Share passage"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '2px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={20} strokeWidth={2} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Share
                    </span>
                  </button>
                </div>

                {/* ITEM 7 & 8: SIMPLIFIED MINIMALIST BOTTOM TOOLBAR (Recite on Left, Single Deep Study on Right) */}
                <div
                  className="reel-anim-dock"
                  style={{
                    width: '100%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    zIndex: 15,
                    marginTop: 'auto',
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  {/* Left: Recite Audio + Qari Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
                    <button
                      onClick={() => handleToggleRecitation(card)}
                      aria-label="Recite passage"
                      className="glass-pill"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        border: isCardPlaying ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                        background: isCardPlaying ? 'rgba(212, 175, 55, 0.18)' : 'var(--surface-card)',
                        color: isCardPlaying ? 'var(--accent-gold-bright)' : 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer'
                      }}
                    >
                      {isCardPlaying ? <Pause size={15} strokeWidth={2.2} /> : <Volume2 size={15} strokeWidth={2} />}
                      <span>{isCardPlaying ? 'Playing' : 'Recite'}</span>
                    </button>
                    {card.card_type === 'quran' && (
                      <button
                        onClick={() => {
                          soundEngine.triggerHaptic('selectionTick');
                          setShowReciterMenuForCard(showReciterMenuForCard === card.id ? null : card.id);
                        }}
                        title="Select Qari / Reciter"
                        className="glass-pill"
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 999,
                          border: '1px solid var(--border-specular)',
                          background: 'var(--surface-card)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <ChevronDown size={13} />
                      </button>
                    )}

                    {showReciterMenuForCard === card.id && (
                      <div
                        className="glass-pill"
                        style={{
                          position: 'absolute',
                          left: 0,
                          bottom: 42,
                          width: 215,
                          padding: 8,
                          borderRadius: 16,
                          boxShadow: '0 14px 36px rgba(0,0,0,0.55)',
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

                  {/* Right: Single Consistent "Deep Study" Button */}
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('lightImpact');
                      setDeepStudyModal({ card, initialTab: 'summary' });
                    }}
                    className="glass-pill deep-study-cta"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid var(--border-gold)',
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(16, 185, 129, 0.12))',
                      color: 'var(--text-primary)',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      flexShrink: 0
                    }}
                  >
                    <BookOpen size={14} style={{ color: 'var(--accent-gold-bright)' }} />
                    <span>Deep Study</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* INTERACTIVE VERSE JUMP RAIL (Tap or Slide to Jump to Any Verse) */}
        <div
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (!touch) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (touch.clientY - rect.top) / Math.max(1, rect.height)));
            const winStart = Math.max(0, activeCardIndex - 5);
            const winEnd = Math.min(displayedCards.length, winStart + 11);
            const targetIdx = Math.min(winEnd - 1, Math.max(winStart, Math.floor(winStart + ratio * (winEnd - winStart))));
            if (displayedCards[targetIdx]) {
              setRailScrubLabel(displayedCards[targetIdx].source_title);
              if (targetIdx !== activeCardIndex) {
                scrollToCardIndex(targetIdx);
              }
            }
          }}
          onTouchEnd={() => setTimeout(() => setRailScrubLabel(null), 700)}
          style={{
            position: 'absolute',
            right: 5,
            top: '34%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            zIndex: 20,
            padding: '8px 3px',
            borderRadius: 99,
            pointerEvents: 'auto',
            touchAction: 'none'
          }}
        >
          {railScrubLabel && (
            <div
              className="glass-pill"
              style={{
                position: 'absolute',
                right: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent-gold-bright)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none'
              }}
            >
              {railScrubLabel}
            </div>
          )}
          {(() => {
            const winStart = Math.max(0, activeCardIndex - 5);
            const winEnd = Math.min(displayedCards.length, winStart + 11);
            return displayedCards.slice(winStart, winEnd).map((c, relIdx) => {
              const idx = winStart + relIdx;
              const isActive = idx === activeCardIndex;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setRailScrubLabel(c.source_title);
                    scrollToCardIndex(idx);
                    setTimeout(() => setRailScrubLabel(null), 900);
                  }}
                  title={`Tap or slide to jump to ${c.source_title}`}
                  style={{
                    width: 6,
                    height: isActive ? 20 : 6,
                    borderRadius: 99,
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-gold-bright)' : 'var(--border-specular)',
                    boxShadow: isActive ? '0 0 8px rgba(212, 175, 55, 0.55)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                />
              );
            });
          })()}
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
                      Saved Bookmarks &amp; Collections
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

        {/* 7. CONSOLIDATED SETTINGS DESTINATION (Item 10: General, Reading Preferences, Notifications, Widgets, About/Mission, Privacy, Terms, Data Management & Support) */}
        {showSettingsDrawer && (
          <div className="spring-sheet-backdrop" onClick={() => setShowSettingsDrawer(false)}>
            <div
              className="spring-sheet-panel"
              style={{ height: '86%' }}
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
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.06em' }}>
                    Settings &amp; Preferences
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Halal Scroll Settings
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

              <div className="drawer-scroll" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* SECTION 1: GENERAL (Theme, Font Size, Script & Translation) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-gold)' }}>
                    General
                  </div>

                  {/* Theme / Appearance */}
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      updateServerState({ theme: 'system' });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: userState.theme === 'system' ? '1.5px solid var(--accent-gold-bright)' : '1px solid var(--border-specular)',
                      background: userState.theme === 'system' ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
                        <Smartphone size={14} /> Match System Appearance (Auto)
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Currently {systemPrefersLight ? 'Light (Andalusian Parchment)' : 'Dark (Midnight Sanctuary)'}
                      </div>
                    </div>
                    {userState.theme === 'system' && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-gold-bright)' }}>Active</span>
                    )}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { id: 'midnight_sanctuary', label: 'Midnight Sanctuary', sub: 'Deep Obsidian & Gold', icon: <Moon size={14} /> },
                      { id: 'andalusian_parchment', label: 'Andalusian Parchment', sub: 'Warm Linen & Ink', icon: <Sun size={14} /> },
                      { id: 'fajr_dawn', label: 'Fajr Dawn', sub: 'Indigo Morning Glow', icon: <Compass size={14} /> },
                      { id: 'maghrib_dusk', label: 'Maghrib Dusk', sub: 'Amber Horizon', icon: <Heart size={14} /> }
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
                            padding: 11,
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
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {th.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reading Font Size */}
                  {(() => {
                    const currentScale = Math.min(1.5, Math.max(0.8, Number(userState.font_scale || '1') || 1));
                    const pct = Math.round(currentScale * 100);
                    const stepScale = (delta: number) => {
                      const next = Math.min(1.5, Math.max(0.8, Math.round((currentScale + delta) * 10) / 10));
                      soundEngine.triggerHaptic('selectionTick');
                      updateServerState({ font_scale: String(next) });
                    };
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border-specular)', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            Font Size
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Adjust Arabic &amp; translation scale ({pct}%)
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {pct !== 100 && (
                            <button
                              onClick={() => {
                                soundEngine.triggerHaptic('selectionTick');
                                updateServerState({ font_scale: '1' });
                              }}
                              style={{
                                padding: '5px 9px',
                                borderRadius: 99,
                                border: '1px solid var(--border-specular)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => stepScale(-0.1)}
                            disabled={currentScale <= 0.8}
                            aria-label="Decrease font size"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 99,
                              border: '1px solid var(--border-gold)',
                              background: 'var(--surface-card)',
                              color: currentScale <= 0.8 ? 'var(--text-muted)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: currentScale <= 0.8 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ minWidth: 38, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent-gold-bright)' }}>
                            {pct}%
                          </span>
                          <button
                            onClick={() => stepScale(0.1)}
                            disabled={currentScale >= 1.5}
                            aria-label="Increase font size"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 99,
                              border: '1px solid var(--border-gold)',
                              background: 'var(--surface-card)',
                              color: currentScale >= 1.5 ? 'var(--text-muted)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: currentScale >= 1.5 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Arabic Script & Translation Edition */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'uthmani', label: 'Uthmani Script' },
                      { id: 'indopak', label: 'IndoPak Script' }
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

                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'clear', label: 'The Clear Quran' },
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

                {/* SECTION 2: READING PREFERENCES (Highlights, Recitation, Transliteration) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-gold)' }}>
                    Reading Preferences
                  </div>

                  <button
                    onClick={() => {
                      setShowSettingsDrawer(false);
                      setShowHighlighterModal(true);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-specular)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Highlighter size={14} style={{ color: 'var(--accent-emerald)' }} />
                        Source Colors &amp; Word Highlights
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Customize Quran, Prophetic Quote &amp; Dua colors and highlighted Divine Names
                      </div>
                    </div>
                    <ArrowUpRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  {/* Qari / Reciter Selection */}
                  <div style={{ padding: 12, borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border-specular)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                      Quran Reciter (Qari)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {RECITERS.map((r) => {
                        const active = userState.reciter === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              soundEngine.triggerHaptic('selectionTick');
                              updateServerState({ reciter: r.id });
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 10,
                              textAlign: 'left',
                              cursor: 'pointer',
                              border: active ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
                              background: active ? 'rgba(212, 175, 55, 0.16)' : 'transparent',
                              color: active ? 'var(--accent-gold-bright)' : 'var(--text-primary)'
                            }}
                          >
                            <div style={{ fontSize: 11.5, fontWeight: 700 }}>{r.short}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.origin}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transliteration Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border-specular)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Phonetic Transliteration (Non-Quran)
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Show Romanized pronunciation line on Hadith &amp; Dua cards
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
                      {userState.show_transliteration === 'true' ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>

                {/* SECTION 3: NOTIFICATIONS & WIDGETS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-gold)' }}>
                    Notifications &amp; Widgets
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border-specular)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Daily Morning &amp; Evening Dhikr Reminder
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Gentle daily reminder for morning &amp; evening remembrance
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        soundEngine.triggerHaptic('selectionTick');
                        try {
                          const cur = localStorage.getItem('hs_daily_reminders') === 'true';
                          localStorage.setItem('hs_daily_reminders', cur ? 'false' : 'true');
                          if (!cur && typeof Notification !== 'undefined' && Notification.requestPermission) {
                            Notification.requestPermission().catch(() => {});
                          }
                        } catch {}
                        setUserState((prev) => ({ ...prev }));
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 99,
                        border: '1px solid var(--border-gold)',
                        background: (typeof localStorage !== 'undefined' && localStorage.getItem('hs_daily_reminders') === 'true')
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'transparent',
                        color: (typeof localStorage !== 'undefined' && localStorage.getItem('hs_daily_reminders') === 'true')
                          ? 'var(--accent-emerald)'
                          : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {(typeof localStorage !== 'undefined' && localStorage.getItem('hs_daily_reminders') === 'true') ? 'Enabled' : 'Enable'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowSettingsDrawer(false);
                      setShowWidgetsModal(true);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-specular)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Smartphone size={14} style={{ color: 'var(--accent-gold-bright)' }} />
                        iPhone Home &amp; Lock Screen Widgets
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Preview Daily Quran Verse, Authentic Hadith &amp; Streak widgets
                      </div>
                    </div>
                    <ArrowUpRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* SECTION 4: ABOUT & MISSION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-gold)' }}>
                    About &amp; Mission
                  </div>

                  <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border-specular)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={15} /> 100% Free Sadaqah Jariyah • 14,678 Authentic Passages
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
                      Halal Scroll is built to help Muslims replace mindless scrolling with daily remembrance across all 114 Surahs of the Noble Quran (KFGQPC Uthmani &amp; IndoPak), Riyad as-Salihin, 40 Hadith Nawawi, Al-Adab Al-Mufrad, and Hisn al-Muslim—free forever with zero ads.
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => {
                          setShowSettingsDrawer(false);
                          setShowOnboardingModal(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border-specular)',
                          color: 'var(--text-primary)',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Replay Onboarding
                      </button>
                      <button
                        onClick={() => {
                          setShowSettingsDrawer(false);
                          setShowCoachMarks(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--border-specular)',
                          color: 'var(--text-primary)',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Feed Guide
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION 5: PRIVACY POLICY, TERMS, DATA MANAGEMENT & SUPPORT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-gold)' }}>
                    Legal, Data Management &amp; Support
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 14, background: 'var(--surface-card)', border: '1px solid var(--border-specular)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                      <a
                        href={isNativeApp() ? 'https://halalscroll-production.up.railway.app/privacy.html' : './privacy.html'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--accent-gold-bright)',
                          textDecoration: 'none'
                        }}
                      >
                        Privacy Policy <ArrowUpRight size={12} />
                      </a>
                      <a
                        href={isNativeApp() ? 'https://halalscroll-production.up.railway.app/privacy.html#terms' : './privacy.html#terms'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--accent-gold-bright)',
                          textDecoration: 'none'
                        }}
                      >
                        Terms of Use &amp; Sources <ArrowUpRight size={12} />
                      </a>
                      <a
                        href="mailto:support@halalscroll.app?subject=Halal%20Scroll%20Feedback"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          textDecoration: 'none'
                        }}
                      >
                        Contact Support <ArrowUpRight size={12} />
                      </a>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-specular)', paddingTop: 10, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        All bookmarks and personal notes are stored locally on your device.
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Reset local reading preferences, notes, and cached state on this device?')) {
                            try {
                              localStorage.clear();
                            } catch {}
                            window.location.reload();
                          }
                        }}
                        style={{
                          flexShrink: 0,
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: 'rgba(239, 68, 68, 0.14)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#FCA5A5',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Reset Local Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. VERIFIED SOURCES & SADAQAH JARIYAH MISSION MODAL (100% Free, Zero In-App Purchases, Zero Ads) */}
        {showPlusModal && (
          <div className="spring-sheet-backdrop" onClick={() => setShowPlusModal(false)}>
            <div
              className="spring-sheet-panel"
              style={{ height: '74%' }}
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
                  <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Verified Classical Sources &amp; Sadaqah Jariyah
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
                  <strong style={{ color: 'var(--accent-emerald)' }}>100% Free &amp; Open (Sadaqah Jariyah):</strong> Every feature in Halal Scroll is completely free for all users worldwide—with <strong>no subscriptions, no in-app purchases, no user accounts required, and zero ads</strong> over sacred text.
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
                    Included Free for Every Seeker
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>✓ <strong>14,678 Authentic Passages:</strong> Complete 114 Surahs of the Noble Quran, Riyad as-Salihin, 40 Hadith Nawawi, Al-Adab Al-Mufrad, Hisn al-Muslim, and Seerah Gems</div>
                    <div>✓ <strong>5-Tab Deep Study Breakdowns:</strong> Plain-English Tadabbur, Trilateral Arabic Root Word Explorer, Classical Tafsir (As-Sa‘di, Ibn Kathir, Ma‘ariful Qur’an), and Cross-References</div>
                    <div>✓ <strong>Synchronized Audio Recitation:</strong> Studio Qari MP3 recitation for Quran and Arabic voice playback for Hadith &amp; Duas</div>
                    <div>✓ <strong>Private On-Device Notes &amp; Share Studio:</strong> Personal reflections stored privately on your device, plus Ultra-HD Share Cards</div>
                  </div>
                </div>

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
                      <Smartphone size={16} style={{ color: 'var(--accent-gold-bright)' }} />
                      iPhone Home &amp; Lock Screen Widgets
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Preview the Daily Quran Verse, Daily Authentic Hadith, and Reading Streak widgets.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setShowPlusModal(false);
                      setShowWidgetsModal(true);
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(212, 175, 55, 0.18)',
                      border: '1px solid var(--border-gold)',
                      color: 'var(--accent-gold-bright)',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Preview Widgets
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showHighlighterModal && (
          <WordHighlighterModal
            sacredColorCodingEnabled={sacredColorCodingEnabled}
            onToggleSacredColorCoding={handleToggleSacredColorCoding}
            activeGroupIds={activeHighlightGroups}
            customWords={customHighlightWords}
            onToggleGroup={handleToggleHighlightGroup}
            onAddCustomWord={handleAddCustomHighlightWord}
            onRemoveCustomWord={handleRemoveCustomHighlightWord}
            onClose={() => setShowHighlighterModal(false)}
          />
        )}

        {personalNoteModalCard && (
          <PersonalNoteModal
            card={personalNoteModalCard}
            existingNote={personalNotes[personalNoteModalCard.id]?.text || ''}
            allNotes={personalNotes}
            onSaveNote={handleSavePersonalNote}
            onDeleteNote={handleDeletePersonalNote}
            onJumpToCardId={(targetCardId) => {
              const idx = displayedCards.findIndex(c => c.id === targetCardId);
              if (idx >= 0) {
                scrollToCardIndex(idx);
              }
            }}
            onClose={() => setPersonalNoteModalCard(null)}
          />
        )}

        {showWidgetsModal && (
          <WidgetsPreviewModal
            streakDays={Number(userState.streak_count || '1') || 1}
            onClose={() => setShowWidgetsModal(false)}
          />
        )}

        {showCoachMarks && !showOnboardingModal && (
          <InteractiveCoachMarksOverlay
            onDismiss={handleDismissCoachMarks}
          />
        )}

        {showOnboardingModal && (
          <OnboardingTutorialModal
            onComplete={handleCompleteOnboarding}
          />
        )}

        {showInstallModal && (
          <InstallAppModal
            deferredPrompt={deferredInstallPrompt}
            onClose={() => setShowInstallModal(false)}
            onInstalled={() => {
              setIsStandalone(true);
              setShowInstallModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Halal Scroll render error:', error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center', maxWidth: 440, padding: 24, borderRadius: 20, background: 'rgba(17, 24, 39, 0.95)', border: '1px solid var(--border-gold)', color: 'var(--text-primary)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold-bright)', marginBottom: 8 }}>Halal Scroll Sanctuary</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>An error occurred while rendering the page.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  try { localStorage.clear(); } catch {}
                  window.location.reload();
                }}
                style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
              >
                Clear Cache &amp; Reset
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', background: 'var(--accent-gold)', color: '#090A0F', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Reload App
              </button>
            </div>
            {this.state.error && (
              <pre style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.5)', color: '#f87171', fontSize: 11, textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

