export type CardType = 'quran' | 'hadith' | 'dua' | 'seerah';

export interface CardWord {
  id: number;
  card_id: string;
  word_position: number;
  arabic_word: string;
  transliteration: string;
  translation_en: string;
  root_arabic: string;
  root_translit: string;
  root_meaning: string;
  root_occurrences: number;
  root_examples: string[];
  grammar_pos: string;
  start_ms: number;
  end_ms: number;
}

export interface DeepStudy {
  card_id: string;
  plain_summary: string;
  key_takeaway: string;
  asbab_al_nuzul: string;
  tafsir_saadi: string;
  tafsir_ibn_kathir: string;
  tafsir_maariful: string;
  actionable_sunnah: string;
  source_citation: string;
}

export interface CrossReference {
  id: number;
  source_card_id: string;
  target_card_id: string;
  relationship_note: string;
  source_title: string;
  card_type: CardType;
  share_slug: string;
  arabic_text_uthmani: string;
  translation_en_clear: string;
  authenticity_grade: string;
}

export interface PracticedAction {
  card_id: string;
  reflection_note: string;
  practiced_at: string;
}

export interface FeedCard {
  id: string;
  card_type: CardType;
  canonical_ref: string;
  share_slug: string;
  collection_slug: string;
  sequence_order: number;
  surah_or_book_num: number;
  ayah_start: number;
  ayah_end: number;
  passage_group_id: string | null;
  arabic_text_uthmani: string;
  arabic_text_indopak: string;
  transliteration: string;
  translation_en_clear: string;
  translation_en_sahih: string;
  source_title: string;
  surah_subtitle: string;
  revelation_place: string | null;
  narrator_chain: string | null;
  authenticity_grade: string;
  theme_palette: string;
  mood_tags: string[];
  topic_tags: string[];
  time_window: string;
  discover_weight: number;
  reciter_name: string;
  audio_url?: string | null;
  words: CardWord[];
  deep_study: DeepStudy | null;
  cross_references: CrossReference[];
  bookmark_folders: string[];
  is_bookmarked: boolean;
  practiced: PracticedAction | null;
}

export interface SurahInfo {
  number: number;
  name_simple: string;
  name_arabic: string;
  translated_name: string;
  verses_count: number;
  revelation_place: string;
  card_count: number;
}

export interface UserState {
  streak_count: string;
  theme: 'midnight_sanctuary' | 'andalusian_parchment' | 'fajr_dawn' | 'maghrib_dusk';
  arabic_script: 'uthmani' | 'indopak';
  translation_edition: 'clear' | 'sahih';
  show_transliteration: string;
  reciter: string;
  plus_member: string;
  sequential_quran_card: string;
  sequential_book_card: string;
}

export type FeedMode = 'for_you' | 'sequential' | 'moods';
export type DeepStudyTab = 'summary' | 'words' | 'tafsir' | 'sunnah' | 'action';

