const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');
const esbuild = require('esbuild');
const { SEED_CARDS } = require('./seed');
const { hydrateCardDetails } = require('./corpus_hydrator');
const { rankCards } = require('./recommender');

const PORT = process.env.PORT || 3456;
const DB_PATH = path.join(__dirname, '..', 'halalscroll.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const CORPUS_GZ_PATH = path.join(__dirname, 'canonical_corpus.json.gz');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// 1. Initialize & Seed SQLite Database with 14,678+ Canonical Cards
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

let SURAH_DIRECTORY = [];

function loadCorpusPayload() {
  if (fs.existsSync(CORPUS_GZ_PATH)) {
    try {
      const gz = fs.readFileSync(CORPUS_GZ_PATH);
      const parsed = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
      SURAH_DIRECTORY = parsed.surahs || [];
      return parsed.cards || SEED_CARDS;
    } catch (e) {
      console.warn('Warning loading canonical_corpus.json.gz, falling back to SEED_CARDS:', e.message);
    }
  }
  return SEED_CARDS;
}

function seedDatabase() {
  const allCards = loadCorpusPayload();
  const existingCount = db.prepare(`SELECT COUNT(*) AS cnt FROM feed_cards`).get().cnt;

  // Track corpus version in app_meta so mood tag updates trigger re-seeding
  const CORPUS_VERSION = 'v2_mood_taxonomy';
  const dbVersionRow = db.prepare(`SELECT value FROM app_meta WHERE key = 'corpus_version'`).get();
  const dbVersion = dbVersionRow ? dbVersionRow.value : null;

  if (existingCount !== allCards.length || dbVersion !== CORPUS_VERSION) {
    console.log(`Seeding SQLite database with ${allCards.length} canonical cards (version: ${CORPUS_VERSION})...`);
    const t0 = Date.now();
    const insertCard = db.prepare(`
      INSERT OR REPLACE INTO feed_cards (
        id, card_type, canonical_ref, share_slug, collection_slug, sequence_order,
        surah_or_book_num, ayah_start, ayah_end, passage_group_id,
        arabic_text_uthmani, arabic_text_indopak, transliteration,
        translation_en_clear, translation_en_sahih, source_title, surah_subtitle,
        revelation_place, narrator_chain, authenticity_grade, theme_palette,
        mood_tags, topic_tags, time_window, discover_weight, reciter_name, audio_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      for (const c of allCards) {
        insertCard.run(
          c.id,
          c.card_type,
          c.canonical_ref,
          c.share_slug,
          c.collection_slug,
          c.sequence_order,
          c.surah_or_book_num ?? null,
          c.ayah_start ?? null,
          c.ayah_end ?? null,
          c.passage_group_id ?? null,
          c.arabic_text_uthmani,
          c.arabic_text_indopak || c.arabic_text_uthmani,
          c.transliteration ?? null,
          c.translation_en_clear,
          c.translation_en_sahih || c.translation_en_clear,
          c.source_title,
          c.surah_subtitle ?? null,
          c.revelation_place ?? null,
          c.narrator_chain ?? null,
          c.authenticity_grade ?? 'Verified Canonical',
          c.theme_palette || 'andalusian_parchment',
          JSON.stringify(c.mood_tags || ['hopeful']),
          JSON.stringify(c.topic_tags || ['Tadabbur']),
          c.time_window || 'any',
          c.discover_weight ?? 1.0,
          c.reciter_name || 'Mishary Rashid Alafasy',
          c.audio_url ?? null
        );
      }
      db.prepare(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('corpus_version', ?)`).run(CORPUS_VERSION);
      db.exec('COMMIT;');
      console.log(`✓ Seeded ${allCards.length} canonical cards in ${Date.now() - t0}ms.`);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } else {
    console.log(`✓ SQLite database already contains ${existingCount} canonical cards.`);
  }

  // Default user state & starter bookmarks
  const upsertState = db.prepare(`INSERT OR IGNORE INTO user_state (key, value) VALUES (?, ?)`);
  upsertState.run('streak_count', '12');
  upsertState.run('last_active_date', new Date().toISOString().slice(0, 10));
  upsertState.run('theme', 'system');
  upsertState.run('arabic_script', 'uthmani');
  upsertState.run('translation_edition', 'clear');
  upsertState.run('show_transliteration', 'true');
  upsertState.run('reciter', 'Mishary Rashid Alafasy');
  upsertState.run('plus_member', 'false');
  upsertState.run('sequential_quran_card', 'card-quran-94-5');
  upsertState.run('sequential_book_card', 'card-hadith-nawawi-19');
  upsertState.run('font_scale', '1');

  // Migrate any previous default theme to fajr_dawn
  try {
    db.prepare(`UPDATE user_state SET value = 'fajr_dawn' WHERE key = 'theme' AND value = 'andalusian_parchment'`).run();
  } catch (_) {}

  const insertBookmark = db.prepare(`INSERT OR IGNORE INTO user_bookmarks (card_id, folder_name) VALUES (?, ?)`);
  insertBookmark.run('card-quran-94-5', 'Hardship & Sabr');
  insertBookmark.run('card-dua-hisn-anxiety', 'Hardship & Sabr');
  insertBookmark.run('card-quran-17-23', 'Duas for Family');
}

seedDatabase();

// 2. Helper Functions for Fast Paginated Queries & Row Hydration
function getBookmarkAndPracticeMaps() {
  const allBookmarks = db.prepare(`SELECT card_id, folder_name, created_at FROM user_bookmarks ORDER BY created_at DESC`).all();
  const allPracticed = db.prepare(`SELECT card_id, reflection_note, practiced_at FROM user_practiced_actions`).all();

  const bookmarksByCard = {};
  for (const b of allBookmarks) {
    if (!bookmarksByCard[b.card_id]) bookmarksByCard[b.card_id] = [];
    bookmarksByCard[b.card_id].push(b.folder_name);
  }
  const practicedByCard = {};
  for (const p of allPracticed) {
    practicedByCard[p.card_id] = p;
  }
  return { bookmarksByCard, practicedByCard };
}

function hydrateRows(rows) {
  const { bookmarksByCard, practicedByCard } = getBookmarkAndPracticeMaps();
  return rows.map(c => {
    const parsed = {
      ...c,
      mood_tags: JSON.parse(c.mood_tags || '[]'),
      topic_tags: JSON.parse(c.topic_tags || '[]'),
      bookmark_folders: bookmarksByCard[c.id] || [],
      is_bookmarked: Boolean(bookmarksByCard[c.id] && bookmarksByCard[c.id].length > 0),
      practiced: practicedByCard[c.id] || null
    };
    return hydrateCardDetails(parsed);
  });
}

// Precompute static collection counts once at startup (corpus is immutable at runtime)
const CACHED_COLLECTION_COUNTS = (() => {
  const rows = db.prepare(`SELECT collection_slug, COUNT(*) AS cnt FROM feed_cards GROUP BY collection_slug`).all();
  const counts = { total: 0 };
  for (const r of rows) {
    counts[r.collection_slug] = r.cnt;
    counts.total += r.cnt;
  }
  return counts;
})();

function getCollectionCounts() {
  return CACHED_COLLECTION_COUNTS;
}

// In-memory feed metadata and ranking session cache
let CORPUS_META = null;
const SESSION_ORDER_CACHE = new Map();

function getCorpusMeta() {
  if (!CORPUS_META) {
    CORPUS_META = db.prepare(`
      SELECT id, card_type, collection_slug, surah_or_book_num, discover_weight, time_window, mood_tags
      FROM feed_cards
    `).all().map(r => ({
      ...r,
      moods: Object.fromEntries((JSON.parse(r.mood_tags || '[]')).map(m => [m, 3]))
    }));
  }
  return CORPUS_META;
}

function getUserAffinity() {
  const bookmarks = db.prepare(`SELECT card_id FROM user_bookmarks`).all();
  const practiced = db.prepare(`SELECT card_id FROM user_practiced_actions`).all();
  const idSet = new Set([...bookmarks.map(b => b.card_id), ...practiced.map(p => p.card_id)]);
  if (idSet.size === 0) return null;

  const affinity = { moods: {}, collections: {}, types: {} };
  const meta = getCorpusMeta();
  for (const c of meta) {
    if (idSet.has(c.id)) {
      affinity.types[c.card_type] = (affinity.types[c.card_type] || 0) + 1;
      affinity.collections[c.collection_slug] = (affinity.collections[c.collection_slug] || 0) + 1;
      for (const m of Object.keys(c.moods)) {
        affinity.moods[m] = (affinity.moods[m] || 0) + 1;
      }
    }
  }
  return affinity;
}

function getUserSeenMap() {
  const rows = db.prepare(`SELECT card_id, last_seen_at FROM user_seen`).all();
  const now = Date.now();
  const map = new Map();
  for (const r of rows) {
    const daysAgo = (now - new Date(r.last_seen_at).getTime()) / (1000 * 60 * 60 * 24);
    map.set(r.card_id, Math.max(0, daysAgo));
  }
  return map;
}

function getRankedOrderForSession(sessionId = 'default', mood = null) {
  const cacheKey = `${sessionId}:${mood || 'all'}`;
  let order = SESSION_ORDER_CACHE.get(cacheKey);
  if (!order) {
    const meta = getCorpusMeta();
    const affinity = getUserAffinity();
    const seen = getUserSeenMap();
    const hour = new Date().getHours();
    order = rankCards(meta, {
      seed: sessionId,
      mood: mood && mood !== 'all' ? mood : null,
      affinity,
      seen,
      hour
    });
    if (SESSION_ORDER_CACHE.size > 200) {
      const oldest = SESSION_ORDER_CACHE.keys().next().value;
      SESSION_ORDER_CACHE.delete(oldest);
    }
    SESSION_ORDER_CACHE.set(cacheKey, order);
  }
  return order;
}

function queryFeedPage({
  mode = 'for_you',
  collection = 'quran',
  surah = null,
  mood = null,
  search = null,
  session_id = 'default',
  offset = 0,
  limit = 20
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  // Mode: Search
  if (search && String(search).trim().length > 0) {
    const q = `%${String(search).trim()}%`;
    const whereSql = `WHERE (source_title LIKE ? OR translation_en_clear LIKE ? OR canonical_ref LIKE ? OR surah_subtitle LIKE ?)`;
    const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM feed_cards ${whereSql}`).get(q, q, q, q);
    const total = totalRow ? totalRow.cnt : 0;
    const rows = db.prepare(`
      SELECT * FROM feed_cards
      ${whereSql}
      ORDER BY discover_weight DESC, sequence_order ASC
      LIMIT ? OFFSET ?
    `).all(q, q, q, q, safeLimit, safeOffset);
    const cards = hydrateRows(rows);
    return { cards, total, offset: safeOffset, limit: safeLimit, has_more: safeOffset + cards.length < total };
  }

  // Mode: Sequential Khatmah / Book reading
  if (mode === 'sequential') {
    const whereClauses = [`collection_slug = ?`];
    const params = [collection || 'quran'];
    if (collection === 'quran' && surah && Number(surah) >= 1 && Number(surah) <= 114) {
      whereClauses.push(`surah_or_book_num = ?`);
      params.push(Number(surah));
    }
    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    let total = 0;
    if (!surah || collection !== 'quran') {
      total = CACHED_COLLECTION_COUNTS[collection || 'quran'] || 0;
    } else {
      const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM feed_cards ${whereSql}`).get(...params);
      total = totalRow ? totalRow.cnt : 0;
    }
    const rows = db.prepare(`
      SELECT * FROM feed_cards
      ${whereSql}
      ORDER BY surah_or_book_num ASC, ayah_start ASC, sequence_order ASC
      LIMIT ? OFFSET ?
    `).all(...params, safeLimit, safeOffset);
    const cards = hydrateRows(rows);
    return { cards, total, offset: safeOffset, limit: safeLimit, has_more: safeOffset + cards.length < total };
  }

  // Mode: Personalized "For You" or "Moods" using Recommendation Engine
  const effectiveMood = (mode === 'moods' && mood && mood !== 'all') ? mood : null;
  const order = getRankedOrderForSession(session_id, effectiveMood);
  const total = order.length;
  const pageIndices = order.slice(safeOffset, safeOffset + safeLimit);

  if (pageIndices.length === 0) {
    return { cards: [], total, offset: safeOffset, limit: safeLimit, has_more: false };
  }

  const meta = getCorpusMeta();
  const pageIds = pageIndices.map(idx => meta[idx].id);
  const placeholders = pageIds.map(() => '?').join(',');
  const fetchedRows = db.prepare(`SELECT * FROM feed_cards WHERE id IN (${placeholders})`).all(...pageIds);
  const rowMap = new Map(fetchedRows.map(r => [r.id, r]));
  const orderedRows = pageIds.map(id => rowMap.get(id)).filter(Boolean);

  const cards = hydrateRows(orderedRows);
  return {
    cards,
    total,
    offset: safeOffset,
    limit: safeLimit,
    has_more: safeOffset + cards.length < total
  };
}

function getBookmarkedCards() {
  const rows = db.prepare(`
    SELECT fc.* FROM feed_cards fc
    INNER JOIN (SELECT DISTINCT card_id FROM user_bookmarks) ub ON ub.card_id = fc.id
    ORDER BY fc.discover_weight DESC, fc.sequence_order ASC
  `).all();
  return hydrateRows(rows);
}

function getCardBySlugOrId(slugOrId) {
  const row = db.prepare(`
    SELECT * FROM feed_cards
    WHERE share_slug = ? OR id = ? OR canonical_ref = ?
    LIMIT 1
  `).get(slugOrId, slugOrId, slugOrId);
  if (!row) return null;
  return hydrateRows([row])[0];
}

function getUserState() {
  const rows = db.prepare(`SELECT key, value FROM user_state`).all();
  const state = {};
  for (const r of rows) state[r.key] = r.value;
  return state;
}

function buildBootstrapPayload(limit = 16, sessionId = null) {
  const dynamicSeed = sessionId || ('seed_' + Math.random().toString(36).slice(2, 10));
  const initialPage = queryFeedPage({ mode: 'for_you', session_id: dynamicSeed, offset: 0, limit });
  const counts = getCollectionCounts();
  const state = getUserState();
  const folders = db.prepare(`SELECT DISTINCT folder_name FROM user_bookmarks ORDER BY folder_name ASC`).all().map(r => r.folder_name);
  const allFolders = Array.from(new Set(['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization', ...folders]));
  return {
    cards: initialPage.cards,
    feed_seed: dynamicSeed,
    total_corpus_count: counts.total,
    collection_counts: counts,
    surahs: SURAH_DIRECTORY,
    bookmarked_cards: getBookmarkedCards(),
    state,
    folders: allFolders
  };
}

let BOOTSTRAP_CACHE = null;

function invalidateBootstrapCache() {
  BOOTSTRAP_CACHE = null;
}

function getCachedBootstrap(limit = 20) {
  if (!BOOTSTRAP_CACHE || BOOTSTRAP_CACHE.limit !== limit) {
    const payload = buildBootstrapPayload(limit);
    const jsonStr = JSON.stringify(payload);
    BOOTSTRAP_CACHE = {
      limit,
      payload,
      jsonStr,
      inlineJson: jsonStr.replace(/</g, '\\u003c'),
      gzipBuf: zlib.gzipSync(Buffer.from(jsonStr, 'utf8'))
    };
  }
  return BOOTSTRAP_CACHE;
}

// Pre-warm bootstrap cache at startup
getCachedBootstrap(20);
const ASSET_CACHE = {
  jsRaw: null,
  jsGzip: null,
  cssRaw: null,
  cssGzip: null,
  version: String(Date.now())
};

function refreshAssetCache() {
  const jsPath = path.join(PUBLIC_DIR, 'app.js');
  const cssPath = path.join(PUBLIC_DIR, 'app.css');
  if (fs.existsSync(jsPath)) {
    ASSET_CACHE.jsRaw = fs.readFileSync(jsPath);
    ASSET_CACHE.jsGzip = zlib.gzipSync(ASSET_CACHE.jsRaw);
  }
  if (fs.existsSync(cssPath)) {
    ASSET_CACHE.cssRaw = fs.readFileSync(cssPath);
    ASSET_CACHE.cssGzip = zlib.gzipSync(ASSET_CACHE.cssRaw);
  }
  ASSET_CACHE.version = String(Date.now());
}

refreshAssetCache();

// Build Frontend Bundle with esbuild (minified production bundle)
async function buildFrontend() {
  const entry = path.join(__dirname, '..', 'src', 'main.tsx');
  if (!fs.existsSync(entry)) return;
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    outfile: path.join(PUBLIC_DIR, 'app.js'),
    format: 'iife',
    target: ['es2020'],
    jsx: 'automatic',
    minify: true,
    sourcemap: false,
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
  refreshAssetCache();
  console.log('[esbuild] Built minified public/app.js successfully.');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function acceptsGzip(req) {
  const enc = (req && req.headers && req.headers['accept-encoding']) || '';
  return enc.includes('gzip');
}

function sendJson(req, res, status, payload) {
  const jsonStr = JSON.stringify(payload);
  if (acceptsGzip(req) && jsonStr.length > 1024) {
    const gz = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Encoding': 'gzip',
      'Vary': 'Accept-Encoding',
      'Cache-Control': 'no-store'
    });
    return res.end(gz);
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  return res.end(jsonStr);
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOgSvg(card) {
  const title = escapeXml(card.source_title);
  const badge = escapeXml(card.authenticity_grade || card.revelation_place || 'Verified Canonical');
  const arabic = escapeXml(card.arabic_text_uthmani.slice(0, 140));
  const english = escapeXml(card.translation_en_clear.slice(0, 180) + (card.translation_en_clear.length > 180 ? '…' : ''));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090A0F"/>
      <stop offset="55%" stop-color="#12151E"/>
      <stop offset="100%" stop-color="#172026"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#090A0F" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="48" y="42" width="1104" height="546" rx="28" fill="none" stroke="#D4AF37" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="96" y="105" fill="#D4AF37" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="1">${title}</text>
  <text x="1104" y="105" text-anchor="end" fill="#10B981" font-family="system-ui, sans-serif" font-size="18" font-weight="600">${badge}</text>
  <text x="600" y="255" text-anchor="middle" fill="#F4F1EA" font-family="serif" font-size="44" direction="rtl">${arabic}</text>
  <text x="600" y="385" text-anchor="middle" fill="#E6E1D6" font-family="Georgia, serif" font-size="26" font-style="italic">“${english}”</text>
  <text x="96" y="535" fill="#9CA3AF" font-family="system-ui, sans-serif" font-size="18">Halal Scroll: Quran &amp; Sunnah • Daily Ayah, Hadith &amp; Tadabbur</text>
  <text x="1104" y="535" text-anchor="end" fill="#D4AF37" font-family="system-ui, sans-serif" font-size="18" font-weight="600">halalscroll.app/c/${escapeXml(card.share_slug)}</text>
</svg>`;
}

const handleRequest = async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API: GET /api/bootstrap (Initial fast page + corpus metadata + 114 Surahs directory)
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    const cached = getCachedBootstrap(20);
    if (acceptsGzip(req)) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding',
        'Cache-Control': 'no-store'
      });
      return res.end(cached.gzipBuf);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    return res.end(cached.jsonStr);
  }

  // API: GET /api/feed (Cursor/Offset Paginated Feed across 14,678+ cards)
  if (pathname === '/api/feed' && req.method === 'GET') {
    const mode = url.searchParams.get('mode') || 'for_you';
    const collection = url.searchParams.get('collection') || 'quran';
    const surah = url.searchParams.get('surah') || null;
    const mood = url.searchParams.get('mood') || null;
    const search = url.searchParams.get('search') || null;
    const session_id = url.searchParams.get('session_id') || 'default';
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 24);

    const page = queryFeedPage({ mode, collection, surah, mood, search, session_id, offset, limit });
    return sendJson(req, res, 200, page);
  }

  // API: POST /api/seen (Record impressions to avoid repeats and refine ranking)
  if (pathname === '/api/seen' && req.method === 'POST') {
    const body = await parseBody(req);
    const { card_ids = [] } = body;
    if (Array.isArray(card_ids) && card_ids.length > 0) {
      const upsertSeen = db.prepare(`
        INSERT INTO user_seen (card_id, seen_count, last_seen_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(card_id) DO UPDATE SET
          seen_count = seen_count + 1,
          last_seen_at = CURRENT_TIMESTAMP
      `);
      db.exec('BEGIN IMMEDIATE TRANSACTION;');
      for (const id of card_ids.slice(0, 50)) {
        if (id) upsertSeen.run(String(id));
      }
      db.exec('COMMIT;');
    }
    return sendJson(req, res, 200, { ok: true, count: card_ids.length });
  }

  // API: GET /api/surahs (114 Surahs Directory)
  if (pathname === '/api/surahs' && req.method === 'GET') {
    return sendJson(req, res, 200, { surahs: SURAH_DIRECTORY });
  }

  // API: GET /api/cards/:slug
  if (pathname.startsWith('/api/cards/') && req.method === 'GET') {
    const slug = decodeURIComponent(pathname.replace('/api/cards/', ''));
    const found = getCardBySlugOrId(slug);
    if (!found) return sendJson(req, res, 404, { error: 'Card not found' });
    return sendJson(req, res, 200, { card: found });
  }

  // API: POST /api/bookmarks
  if (pathname === '/api/bookmarks' && req.method === 'POST') {
    const body = await parseBody(req);
    const { card_id, folder_name = 'Favorites', action = 'toggle' } = body;
    if (!card_id) return sendJson(req, res, 400, { error: 'Missing card_id' });

    const exists = db.prepare(`SELECT 1 FROM user_bookmarks WHERE card_id = ? AND folder_name = ?`).get(card_id, folder_name);
    if (action === 'remove' || (action === 'toggle' && exists)) {
      db.prepare(`DELETE FROM user_bookmarks WHERE card_id = ? AND folder_name = ?`).run(card_id, folder_name);
    } else {
      db.prepare(`INSERT OR IGNORE INTO user_bookmarks (card_id, folder_name) VALUES (?, ?)`).run(card_id, folder_name);
    }

    invalidateBootstrapCache();
    const updatedCard = getCardBySlugOrId(card_id);
    const cached = getCachedBootstrap(20).payload;
    return sendJson(req, res, 200, {
      card: updatedCard,
      bookmarked_cards: cached.bookmarked_cards,
      cards: cached.cards,
      folders: cached.folders
    });
  }

  // API: POST /api/practice
  if (pathname === '/api/practice' && req.method === 'POST') {
    const body = await parseBody(req);
    const { card_id, reflection_note = '', practiced = true } = body;
    if (!card_id) return sendJson(req, res, 400, { error: 'Missing card_id' });

    const existing = db.prepare(`SELECT * FROM user_practiced_actions WHERE card_id = ?`).get(card_id);
    if (practiced) {
      db.prepare(`
        INSERT OR REPLACE INTO user_practiced_actions (card_id, reflection_note, practiced_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(card_id, reflection_note);

      if (!existing) {
        const curStreak = parseInt(getUserState().streak_count || '12', 10);
        db.prepare(`INSERT OR REPLACE INTO user_state (key, value) VALUES ('streak_count', ?)`).run(String(curStreak + 1));
      }
    } else {
      db.prepare(`DELETE FROM user_practiced_actions WHERE card_id = ?`).run(card_id);
    }

    invalidateBootstrapCache();
    const updatedCard = getCardBySlugOrId(card_id);
    const cached = getCachedBootstrap(20).payload;
    return sendJson(req, res, 200, {
      card: updatedCard,
      cards: cached.cards,
      state: cached.state
    });
  }

  // API: POST /api/state
  if (pathname === '/api/state' && req.method === 'POST') {
    const body = await parseBody(req);
    const upsert = db.prepare(`INSERT OR REPLACE INTO user_state (key, value) VALUES (?, ?)`);
    for (const [k, v] of Object.entries(body)) {
      upsert.run(k, String(v));
    }
    invalidateBootstrapCache();
    return sendJson(req, res, 200, { state: getUserState() });
  }

  // Dynamic OpenGraph Raster JPG Card Preview: /api/og/:slug.jpg
  if (pathname.startsWith('/api/og/') && pathname.endsWith('.jpg')) {
    const slug = decodeURIComponent(pathname.replace('/api/og/', '').replace('.jpg', ''));
    const card = getCardBySlugOrId(slug);
    const jpgSlug = card ? card.share_slug : 'ash-sharh-5-6';
    const jpgPath = path.join(PUBLIC_DIR, 'og', `${jpgSlug}.jpg`);
    const fallbackJpgPath = path.join(PUBLIC_DIR, 'og', 'ash-sharh-5-6.jpg');
    const targetPath = fs.existsSync(jpgPath) ? jpgPath : fallbackJpgPath;
    if (fs.existsSync(targetPath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      return res.end(fs.readFileSync(targetPath));
    }
  }

  // Dynamic OpenGraph SVG Card Preview: /api/og/:slug.svg
  if (pathname.startsWith('/api/og/') && pathname.endsWith('.svg')) {
    const slug = decodeURIComponent(pathname.replace('/api/og/', '').replace('.svg', ''));
    const card = getCardBySlugOrId(slug) || getCardBySlugOrId('ash-sharh-5-6');
    const svg = renderOgSvg(card);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
    return res.end(svg);
  }

  // Static JS/CSS assets served from pre-compressed RAM cache
  if (pathname === '/app.js') {
    if (!ASSET_CACHE.jsRaw) refreshAssetCache();
    if (ASSET_CACHE.jsRaw) {
      if (acceptsGzip(req) && ASSET_CACHE.jsGzip) {
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding',
          'Cache-Control': 'public, max-age=3600'
        });
        return res.end(ASSET_CACHE.jsGzip);
      }
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
      return res.end(ASSET_CACHE.jsRaw);
    }
  }
  if (pathname === '/app.css') {
    if (!ASSET_CACHE.cssRaw) refreshAssetCache();
    if (ASSET_CACHE.cssRaw) {
      if (acceptsGzip(req) && ASSET_CACHE.cssGzip) {
        res.writeHead(200, {
          'Content-Type': 'text/css; charset=utf-8',
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding',
          'Cache-Control': 'public, max-age=3600'
        });
        return res.end(ASSET_CACHE.cssGzip);
      }
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
      return res.end(ASSET_CACHE.cssRaw);
    }
  }

  // Static PWA and public assets (manifest, sw.js, icons, favicon)
  const MIME_TYPES = {
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon'
  };

  const safeRelPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const publicCandidate = path.join(PUBLIC_DIR, safeRelPath);
  if (safeRelPath !== '/' && safeRelPath !== '\\' && fs.existsSync(publicCandidate)) {
    try {
      if (fs.statSync(publicCandidate).isFile()) {
        const ext = path.extname(publicCandidate).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const cacheControl = (ext === '.webmanifest' || safeRelPath === '/sw.js')
          ? 'no-cache'
          : 'public, max-age=86400';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
          ...(safeRelPath === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {})
        });
        return res.end(fs.readFileSync(publicCandidate));
      }
    } catch (_) {}
  }

  // Serve HTML with dynamic OpenGraph metadata + inlined initial bootstrap payload for 0ms first render
  const proto = (req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host = (req.headers && req.headers.host) || 'halalscroll-production.up.railway.app';
  const baseOrigin = `${proto}://${host}`;

  let ogTitle = 'Halal Scroll: Quran & Sunnah — Daily Ayah, Hadith & Tadabbur';
  let ogDesc = 'Replace mindless social media doom-scrolling with a serene, tactile vertical feed of 14,600+ canonical Quran passages, Sahih Hadith, Prophetic Duas, and Seerah reflections.';
  let ogSlug = 'ash-sharh-5-6';
  let deepLinkCard = null;
  if (pathname.startsWith('/c/')) {
    const slug = decodeURIComponent(pathname.replace('/c/', ''));
    deepLinkCard = getCardBySlugOrId(slug);
    if (deepLinkCard) {
      ogTitle = `${deepLinkCard.source_title} • Halal Scroll`;
      ogDesc = `“${deepLinkCard.translation_en_clear}” — Tap to explore Word-by-Word Arabic Roots, Classical Tafsir & Daily Sunnah.`;
      ogSlug = deepLinkCard.share_slug;
    }
  }
  const ogImage = `${baseOrigin}/api/og/${ogSlug}.jpg`;
  // Dynamic bootstrap payload per request to deliver fresh recommendation on reload
  const bootPayload = buildBootstrapPayload(20);
  if (deepLinkCard && !bootPayload.cards.some(c => c.id === deepLinkCard.id)) {
    bootPayload.cards = [deepLinkCard, ...bootPayload.cards];
  }
  const inlineBootJson = JSON.stringify(bootPayload).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="${escapeXml(bootPayload.state?.theme || 'fajr_dawn')}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${escapeXml(ogTitle)}</title>
  <meta name="description" content="${escapeXml(ogDesc)}" />

  <!-- PWA & iOS Mobile Web App Meta Tags -->
  <meta name="theme-color" content="#030712" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Halal Scroll" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="application-name" content="Halal Scroll" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
  <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
  <link rel="icon" href="/favicon.png" />

  <!-- OpenGraph Metadata -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeXml(baseOrigin + pathname)}" />
  <meta property="og:site_name" content="Halal Scroll" />
  <meta property="og:title" content="${escapeXml(ogTitle)}" />
  <meta property="og:description" content="${escapeXml(ogDesc)}" />
  <meta property="og:image" content="${escapeXml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeXml(ogImage)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeXml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeXml(ogDesc)}" />
  <meta name="twitter:image" content="${escapeXml(ogImage)}" />
  <link rel="stylesheet" href="/app.css?v=${ASSET_CACHE.version}" />
</head>
<body>
  <div id="root"></div>
  <script>window.__HALAL_BOOTSTRAP__ = ${inlineBootJson};</script>
  <script src="/app.js?v=${ASSET_CACHE.version}"></script>
</body>
</html>`;

  if (acceptsGzip(req)) {
    const gzHtml = zlib.gzipSync(Buffer.from(html, 'utf8'));
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Encoding': 'gzip',
      'Vary': 'Accept-Encoding',
      'Cache-Control': 'no-cache'
    });
    return res.end(gzHtml);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  return res.end(html);
};

const server = http.createServer(handleRequest);

if (require.main === module) {
  buildFrontend().then(() => {
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Halal Scroll E2E Server listening on http://0.0.0.0:${PORT}`);
    });
  }).catch(err => {
    console.error('Build error:', err);
  });
}

module.exports = { handleRequest, buildFrontend, db };
