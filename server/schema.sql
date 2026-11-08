-- Halal Scroll — Core Database Schema (SQLite / PostgreSQL compatible)

CREATE TABLE IF NOT EXISTS feed_cards (
    id TEXT PRIMARY KEY,
    card_type TEXT NOT NULL, -- 'quran' | 'hadith' | 'dua' | 'seerah'
    canonical_ref TEXT NOT NULL UNIQUE, -- e.g. 'quran:94:5-6', 'riyad:24', 'hisn:morning:1'
    share_slug TEXT NOT NULL UNIQUE,    -- e.g. 'ash-sharh-5-6' for halalscroll.app/c/ash-sharh-5-6
    
    -- Sequential Ordering & Semantic Grouping
    collection_slug TEXT NOT NULL, -- 'quran', 'riyad_assalihin', 'nawawi40', 'adab_mufrad', 'hisn', 'seerah'
    sequence_order INTEGER NOT NULL,
    surah_or_book_num INTEGER,
    ayah_start INTEGER,
    ayah_end INTEGER,
    passage_group_id TEXT,
    
    -- Core Display Text (Immutable Canonical Content)
    arabic_text_uthmani TEXT NOT NULL,
    arabic_text_indopak TEXT,
    transliteration TEXT,
    translation_en_clear TEXT NOT NULL,
    translation_en_sahih TEXT,
    
    -- Metadata & Authenticity
    source_title TEXT NOT NULL,   -- e.g. 'Surah Ash-Sharh • 94:5–6' or 'Riyad as-Salihin • Hadith 24'
    surah_subtitle TEXT,          -- e.g. 'The Relief' or 'Book of Patience'
    revelation_place TEXT,        -- 'Meccan' | 'Medinan' (for Quran)
    narrator_chain TEXT,          -- e.g. 'Narrated Abu Hurairah (RA)' (for Hadith)
    authenticity_grade TEXT,      -- e.g. '✓ Sahih • Bukhari & Muslim'
    
    -- Visual Theme & Discovery Tagging
    theme_palette TEXT DEFAULT 'midnight_gold', -- Controls ambient gradient tint
    mood_tags TEXT NOT NULL,      -- JSON array of strings e.g. '["anxious", "patience", "hope"]'
    topic_tags TEXT NOT NULL,     -- JSON array of strings e.g. '["tawakkul", "prayer", "family"]'
    time_window TEXT DEFAULT 'any', -- 'any' | 'morning' | 'evening' | 'sleep' | 'jumuah'
    discover_weight REAL DEFAULT 1.0,
    
    -- Audio & Pre-rendered Share Assets
    audio_url TEXT,
    reciter_name TEXT DEFAULT 'Mishary Rashid Alafasy',
    word_timestamps TEXT,         -- JSON: [[word_idx, start_ms, end_ms], ...]
    share_video_url TEXT,
    share_og_image_url TEXT
);

CREATE TABLE IF NOT EXISTS card_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL REFERENCES feed_cards(id) ON DELETE CASCADE,
    word_position INTEGER NOT NULL,
    arabic_word TEXT NOT NULL,
    transliteration TEXT,
    translation_en TEXT NOT NULL,
    root_arabic TEXT,              -- e.g. 'ر ح م'
    root_translit TEXT,            -- e.g. 'R-H-M'
    root_meaning TEXT,             -- e.g. 'Mercy, compassion, womb'
    root_occurrences INTEGER,      -- Number of times root appears in Quran
    root_examples TEXT,            -- JSON array of 3 famous Ayahs sharing this root
    grammar_pos TEXT,              -- Noun, Verb (Form I-X), Particle
    start_ms INTEGER DEFAULT 0,
    end_ms INTEGER DEFAULT 800
);

CREATE TABLE IF NOT EXISTS card_deep_study (
    card_id TEXT PRIMARY KEY REFERENCES feed_cards(id) ON DELETE CASCADE,
    plain_summary TEXT NOT NULL,          -- Tab 1: "Explain It Easier"
    key_takeaway TEXT NOT NULL,           -- Tab 1 & Share Slide 2 highlight
    asbab_al_nuzul TEXT,                  -- Tab 3: Historical context / reason of revelation
    tafsir_saadi TEXT,                    -- Tab 3: Verified excerpt from Tafsir As-Sa'di
    tafsir_ibn_kathir TEXT,               -- Tab 3: Verified excerpt from Ibn Kathir
    tafsir_maariful TEXT,                 -- Tab 3: Verified excerpt from Ma'ariful Quran
    actionable_sunnah TEXT NOT NULL,      -- Tab 5: "Act On It Today" prompt
    source_citation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_card_id TEXT NOT NULL REFERENCES feed_cards(id) ON DELETE CASCADE,
    target_card_id TEXT NOT NULL REFERENCES feed_cards(id) ON DELETE CASCADE,
    relationship_note TEXT NOT NULL
);

-- User State Tables (Bookmarks, Collections, Practiced Sunnahs, Reflections, Reading Progress, Streak)
CREATE TABLE IF NOT EXISTS user_bookmarks (
    card_id TEXT NOT NULL REFERENCES feed_cards(id) ON DELETE CASCADE,
    folder_name TEXT NOT NULL DEFAULT 'Favorites',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (card_id, folder_name)
);

CREATE TABLE IF NOT EXISTS user_practiced_actions (
    card_id TEXT PRIMARY KEY REFERENCES feed_cards(id) ON DELETE CASCADE,
    reflection_note TEXT DEFAULT '',
    practiced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feed_cards_discover ON feed_cards(discover_weight DESC, sequence_order ASC);
CREATE INDEX IF NOT EXISTS idx_feed_cards_collection ON feed_cards(collection_slug, surah_or_book_num, sequence_order ASC);
CREATE INDEX IF NOT EXISTS idx_feed_cards_slug ON feed_cards(share_slug);
CREATE INDEX IF NOT EXISTS idx_feed_cards_type ON feed_cards(card_type);


