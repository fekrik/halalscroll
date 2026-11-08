const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');
const esbuild = require('esbuild');
const { SEED_CARDS } = require('./seed');
const { hydrateCardDetails } = require('./corpus_hydrator');

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

  if (existingCount !== allCards.length) {
    console.log(`Seeding SQLite database with ${allCards.length} canonical cards...`);
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
  upsertState.run('theme', 'andalusian_parchment');
  upsertState.run('arabic_script', 'uthmani');
  upsertState.run('translation_edition', 'clear');
  upsertState.run('show_transliteration', 'true');
  upsertState.run('reciter', 'Mishary Rashid Alafasy');
  upsertState.run('plus_member', 'false');
  upsertState.run('sequential_quran_card', 'card-quran-94-5');
  upsertState.run('sequential_book_card', 'card-hadith-nawawi-19');

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

function queryFeedPage({
  mode = 'for_you',
  collection = 'quran',
  surah = null,
  mood = null,
  search = null,
  offset = 0,
  limit = 30
} = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const whereClauses = [];
  const params = [];

  if (search && String(search).trim().length > 0) {
    const q = `%${String(search).trim()}%`;
    whereClauses.push(`(source_title LIKE ? OR translation_en_clear LIKE ? OR canonical_ref LIKE ? OR surah_subtitle LIKE ?)`);
    params.push(q, q, q, q);
  } else if (mode === 'sequential') {
    whereClauses.push(`collection_slug = ?`);
    params.push(collection || 'quran');
    if (collection === 'quran' && surah && Number(surah) >= 1 && Number(surah) <= 114) {
      whereClauses.push(`surah_or_book_num = ?`);
      params.push(Number(surah));
    }
  } else if (mode === 'moods' && mood) {
    whereClauses.push(`mood_tags LIKE ?`);
    params.push(`%"${mood}"%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderSql = mode === 'sequential'
    ? `ORDER BY surah_or_book_num ASC, ayah_start ASC, sequence_order ASC`
    : `ORDER BY discover_weight DESC, sequence_order ASC`;

  const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM feed_cards ${whereSql}`).get(...params);
  const total = totalRow ? totalRow.cnt : 0;

  const rows = db.prepare(`
    SELECT * FROM feed_cards
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(...params, safeLimit, safeOffset);

  const cards = hydrateRows(rows);
  return {
    cards,
    total,
    offset: safeOffset,
    limit: safeLimit,
    has_more: safeOffset + cards.length < total
  };
}

function getCollectionCounts() {
  const rows = db.prepare(`SELECT collection_slug, COUNT(*) AS cnt FROM feed_cards GROUP BY collection_slug`).all();
  const counts = { total: 0 };
  for (const r of rows) {
    counts[r.collection_slug] = r.cnt;
    counts.total += r.cnt;
  }
  return counts;
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

// Build Frontend Bundle with esbuild
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
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"'
    }
  });
  console.log('[esbuild] Built public/app.js successfully.');
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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
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
    const initialPage = queryFeedPage({ mode: 'for_you', offset: 0, limit: 40 });
    const counts = getCollectionCounts();
    const state = getUserState();
    const folders = db.prepare(`SELECT DISTINCT folder_name FROM user_bookmarks ORDER BY folder_name ASC`).all().map(r => r.folder_name);
    const allFolders = Array.from(new Set(['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization', ...folders]));
    return sendJson(res, 200, {
      cards: initialPage.cards,
      total_corpus_count: counts.total,
      collection_counts: counts,
      surahs: SURAH_DIRECTORY,
      bookmarked_cards: getBookmarkedCards(),
      state,
      folders: allFolders
    });
  }

  // API: GET /api/feed (Cursor/Offset Paginated Feed across 14,678+ cards)
  if (pathname === '/api/feed' && req.method === 'GET') {
    const mode = url.searchParams.get('mode') || 'for_you';
    const collection = url.searchParams.get('collection') || 'quran';
    const surah = url.searchParams.get('surah') || null;
    const mood = url.searchParams.get('mood') || null;
    const search = url.searchParams.get('search') || null;
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 30);

    const page = queryFeedPage({ mode, collection, surah, mood, search, offset, limit });
    return sendJson(res, 200, page);
  }

  // API: GET /api/surahs (114 Surahs Directory)
  if (pathname === '/api/surahs' && req.method === 'GET') {
    return sendJson(res, 200, { surahs: SURAH_DIRECTORY });
  }

  // API: GET /api/cards/:slug
  if (pathname.startsWith('/api/cards/') && req.method === 'GET') {
    const slug = decodeURIComponent(pathname.replace('/api/cards/', ''));
    const found = getCardBySlugOrId(slug);
    if (!found) return sendJson(res, 404, { error: 'Card not found' });
    return sendJson(res, 200, { card: found });
  }

  // API: POST /api/bookmarks
  if (pathname === '/api/bookmarks' && req.method === 'POST') {
    const body = await parseBody(req);
    const { card_id, folder_name = 'Favorites', action = 'toggle' } = body;
    if (!card_id) return sendJson(res, 400, { error: 'Missing card_id' });

    const exists = db.prepare(`SELECT 1 FROM user_bookmarks WHERE card_id = ? AND folder_name = ?`).get(card_id, folder_name);
    if (action === 'remove' || (action === 'toggle' && exists)) {
      db.prepare(`DELETE FROM user_bookmarks WHERE card_id = ? AND folder_name = ?`).run(card_id, folder_name);
    } else {
      db.prepare(`INSERT OR IGNORE INTO user_bookmarks (card_id, folder_name) VALUES (?, ?)`).run(card_id, folder_name);
    }

    const updatedCard = getCardBySlugOrId(card_id);
    const bookmarkedCards = getBookmarkedCards();
    const initialPage = queryFeedPage({ mode: 'for_you', offset: 0, limit: 40 });
    const folders = db.prepare(`SELECT DISTINCT folder_name FROM user_bookmarks ORDER BY folder_name ASC`).all().map(r => r.folder_name);
    const allFolders = Array.from(new Set(['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization', ...folders]));
    return sendJson(res, 200, {
      card: updatedCard,
      bookmarked_cards: bookmarkedCards,
      cards: initialPage.cards,
      folders: allFolders
    });
  }

  // API: POST /api/practice
  if (pathname === '/api/practice' && req.method === 'POST') {
    const body = await parseBody(req);
    const { card_id, reflection_note = '', practiced = true } = body;
    if (!card_id) return sendJson(res, 400, { error: 'Missing card_id' });

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

    const updatedCard = getCardBySlugOrId(card_id);
    const initialPage = queryFeedPage({ mode: 'for_you', offset: 0, limit: 40 });
    return sendJson(res, 200, {
      card: updatedCard,
      cards: initialPage.cards,
      state: getUserState()
    });
  }

  // API: POST /api/state
  if (pathname === '/api/state' && req.method === 'POST') {
    const body = await parseBody(req);
    const upsert = db.prepare(`INSERT OR REPLACE INTO user_state (key, value) VALUES (?, ?)`);
    for (const [k, v] of Object.entries(body)) {
      upsert.run(k, String(v));
    }
    return sendJson(res, 200, { state: getUserState() });
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

  // Static JS/CSS assets
  if (pathname === '/app.js') {
    const p = path.join(PUBLIC_DIR, 'app.js');
    if (fs.existsSync(p)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(fs.readFileSync(p));
    }
  }
  if (pathname === '/app.css') {
    const p = path.join(PUBLIC_DIR, 'app.css');
    if (fs.existsSync(p)) {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(fs.readFileSync(p));
    }
  }

  // Serve HTML with dynamic OpenGraph metadata for /c/:slug or root /
  const proto = (req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host = (req.headers && req.headers.host) || 'halalscroll-production.up.railway.app';
  const baseOrigin = `${proto}://${host}`;

  let ogTitle = 'Halal Scroll: Quran & Sunnah — Daily Ayah, Hadith & Tadabbur';
  let ogDesc = 'Replace mindless social media doom-scrolling with a serene, tactile vertical feed of 14,600+ canonical Quran passages, Sahih Hadith, Prophetic Duas, and Seerah reflections.';
  let ogSlug = 'ash-sharh-5-6';
  if (pathname.startsWith('/c/')) {
    const slug = decodeURIComponent(pathname.replace('/c/', ''));
    const card = getCardBySlugOrId(slug);
    if (card) {
      ogTitle = `${card.source_title} • Halal Scroll`;
      ogDesc = `“${card.translation_en_clear}” — Tap to explore Word-by-Word Arabic Roots, Classical Tafsir & Daily Sunnah.`;
      ogSlug = card.share_slug;
    }
  }
  const ogImage = `${baseOrigin}/api/og/${ogSlug}.jpg`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeXml(ogTitle)}</title>
  <meta name="description" content="${escapeXml(ogDesc)}" />
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
  <link rel="apple-touch-icon" href="${escapeXml(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeXml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeXml(ogDesc)}" />
  <meta name="twitter:image" content="${escapeXml(ogImage)}" />
  <link rel="stylesheet" href="/app.css" />
</head>
<body>
  <div id="root"></div>
  <script src="/app.js"></script>
</body>
</html>`;

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
