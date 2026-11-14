import { FeedCard, UserState } from './types';
// @ts-ignore
import seedData from '../server/seed.js';

const STORAGE_KEYS = {
  BOOKMARKS: 'halalscroll_bookmarks_v1',
  PRACTICED: 'halalscroll_practiced_v1',
  STATE: 'halalscroll_state_v2',
  FOLDERS: 'halalscroll_folders_v1'
};

const DEFAULT_STATE: UserState = {
  streak_count: '12',
  theme: 'system',
  arabic_script: 'uthmani',
  translation_edition: 'clear',
  show_transliteration: 'true',
  reciter: 'Mishary Rashid Alafasy',
  plus_member: 'false',
  sequential_quran_card: 'card-quran-94-5',
  sequential_book_card: 'card-hadith-nawawi-19',
  font_scale: '1'
};

const DEFAULT_FOLDERS = ['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization'];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function getOfflineBootstrap(): { cards: FeedCard[]; state: UserState; folders: string[] } {
  const { SEED_CARDS, CROSS_REFERENCES } = seedData as {
    SEED_CARDS: any[];
    CROSS_REFERENCES: any[];
  };

  const bookmarksMap = readJson<Record<string, string[]>>(STORAGE_KEYS.BOOKMARKS, {
    'card-quran-94-5': ['Favorites'],
    'card-dua-hisn-anxiety': ['Hardship & Sabr']
  });
  const practicedMap = readJson<Record<string, { card_id: string; reflection_note: string; practiced_at: string }>>(
    STORAGE_KEYS.PRACTICED,
    {}
  );
  const state = { ...DEFAULT_STATE, ...readJson<Partial<UserState>>(STORAGE_KEYS.STATE, {}) };
  const folders = Array.from(
    new Set([...DEFAULT_FOLDERS, ...readJson<string[]>(STORAGE_KEYS.FOLDERS, [])])
  );

  const cardById = new Map<string, any>();
  for (const c of SEED_CARDS) cardById.set(c.id, c);

  const cards: FeedCard[] = SEED_CARDS.map((c) => {
    const words = (c.words || []).map((w: any, idx: number) => ({
      id: idx + 1,
      card_id: c.id,
      ...w
    }));

    const refs = CROSS_REFERENCES
      .filter((r: any) => r.source_card_id === c.id)
      .map((r: any, idx: number) => {
        const target = cardById.get(r.target_card_id) || SEED_CARDS[0];
        return {
          id: idx + 1,
          source_card_id: r.source_card_id,
          target_card_id: r.target_card_id,
          relationship_note: r.relationship_note,
          source_title: target.source_title,
          card_type: target.card_type,
          share_slug: target.share_slug,
          arabic_text_uthmani: target.arabic_text_uthmani,
          translation_en_clear: target.translation_en_clear,
          authenticity_grade: target.authenticity_grade
        };
      });

    const bmFolders = bookmarksMap[c.id] || [];

    return {
      ...c,
      words,
      deep_study: c.deep_study ? { card_id: c.id, ...c.deep_study } : null,
      cross_references: refs,
      bookmark_folders: bmFolders,
      is_bookmarked: bmFolders.length > 0,
      practiced: practicedMap[c.id] || null
    };
  });

  return { cards, state, folders };
}

export function offlineToggleBookmark(cardId: string, folderName: string, action: 'toggle' | 'add' | 'remove') {
  const bookmarksMap = readJson<Record<string, string[]>>(STORAGE_KEYS.BOOKMARKS, {
    'card-quran-94-5': ['Favorites'],
    'card-dua-hisn-anxiety': ['Hardship & Sabr']
  });
  const current = bookmarksMap[cardId] || [];
  const exists = current.includes(folderName);

  if (action === 'remove' || (action === 'toggle' && exists)) {
    bookmarksMap[cardId] = current.filter(f => f !== folderName);
  } else if (!exists) {
    bookmarksMap[cardId] = [...current, folderName];
  }
  writeJson(STORAGE_KEYS.BOOKMARKS, bookmarksMap);

  const folders = Array.from(
    new Set([...DEFAULT_FOLDERS, ...readJson<string[]>(STORAGE_KEYS.FOLDERS, []), folderName])
  );
  writeJson(STORAGE_KEYS.FOLDERS, folders);

  return getOfflineBootstrap();
}

export function offlineMarkPracticed(cardId: string, practiced: boolean, reflectionNote: string) {
  const practicedMap = readJson<Record<string, { card_id: string; reflection_note: string; practiced_at: string }>>(
    STORAGE_KEYS.PRACTICED,
    {}
  );
  const state = { ...DEFAULT_STATE, ...readJson<Partial<UserState>>(STORAGE_KEYS.STATE, {}) };

  const existed = Boolean(practicedMap[cardId]);
  if (practiced) {
    practicedMap[cardId] = {
      card_id: cardId,
      reflection_note: reflectionNote,
      practiced_at: new Date().toISOString()
    };
    if (!existed) {
      state.streak_count = String(parseInt(state.streak_count || '12', 10) + 1);
      writeJson(STORAGE_KEYS.STATE, state);
    }
  } else {
    delete practicedMap[cardId];
  }
  writeJson(STORAGE_KEYS.PRACTICED, practicedMap);
  return getOfflineBootstrap();
}

export function offlineUpdateState(patch: Partial<UserState>) {
  const state = { ...DEFAULT_STATE, ...readJson<Partial<UserState>>(STORAGE_KEYS.STATE, {}), ...patch };
  writeJson(STORAGE_KEYS.STATE, state);
  return state;
}

export function getLocalFolders(): string[] {
  return Array.from(
    new Set([...DEFAULT_FOLDERS, ...readJson<string[]>(STORAGE_KEYS.FOLDERS, [])])
  );
}

export function applyLocalUserOverlays(cards: FeedCard[]): FeedCard[] {
  const bookmarksMap = readJson<Record<string, string[]>>(STORAGE_KEYS.BOOKMARKS, {
    'card-quran-94-5': ['Favorites'],
    'card-dua-hisn-anxiety': ['Hardship & Sabr']
  });
  const practicedMap = readJson<Record<string, { card_id: string; reflection_note: string; practiced_at: string }>>(
    STORAGE_KEYS.PRACTICED,
    {}
  );
  return cards.map((c) => {
    const bmFolders = bookmarksMap[c.id] || [];
    return {
      ...c,
      bookmark_folders: bmFolders,
      is_bookmarked: bmFolders.length > 0,
      practiced: practicedMap[c.id] || null
    };
  });
}

