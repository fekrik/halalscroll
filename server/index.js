const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const esbuild = require('esbuild');
const { SEED_CARDS, CROSS_REFERENCES } = require('./seed');

const PORT = process.env.PORT || 3456;
const SOCKET_PATH = process.env.SOCKET_PATH || null;
const DB_PATH = path.join(__dirname, '..', 'halalscroll.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// 1. Initialize & Seed SQLite Database
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

function seedDatabase() {
  const insertCard = db.prepare(`
    INSERT OR REPLACE INTO feed_cards (
      id, card_type, canonical_ref, share_slug, collection_slug, sequence_order,
      surah_or_book_num, ayah_start, ayah_end, passage_group_id,
      arabic_text_uthmani, arabic_text_indopak, transliteration,
      translation_en_clear, translation_en_sahih, source_title, surah_subtitle,
      revelation_place, narrator_chain, authenticity_grade, theme_palette,
      mood_tags, topic_tags, time_window, discover_weight, reciter_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteWords = db.prepare(`DELETE FROM card_words WHERE card_id = ?`);
  const insertWord = db.prepare(`
    INSERT INTO card_words (
      card_id, word_position, arabic_word, transliteration, translation_en,
      root_arabic, root_translit, root_meaning, root_occurrences, root_examples,
      grammar_pos, start_ms, end_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDeepStudy = db.prepare(`
    INSERT OR REPLACE INTO card_deep_study (
      card_id, plain_summary, key_takeaway, asbab_al_nuzul,
      tafsir_saadi, tafsir_ibn_kathir, tafsir_maariful, actionable_sunnah, source_citation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of SEED_CARDS) {
    insertCard.run(
      c.id, c.card_type, c.canonical_ref, c.share_slug, c.collection_slug, c.sequence_order,
      c.surah_or_book_num, c.ayah_start, c.ayah_end, c.passage_group_id,
      c.arabic_text_uthmani, c.arabic_text_indopak, c.transliteration,
      c.translation_en_clear, c.translation_en_sahih, c.source_title, c.surah_subtitle,
      c.revelation_place, c.narrator_chain, c.authenticity_grade, c.theme_palette,
      JSON.stringify(c.mood_tags), JSON.stringify(c.topic_tags), c.time_window, c.discover_weight, c.reciter_name
    );

    deleteWords.run(c.id);
    for (const w of c.words || []) {
      insertWord.run(
        c.id, w.word_position, w.arabic_word, w.transliteration, w.translation_en,
        w.root_arabic, w.root_translit, w.root_meaning, w.root_occurrences,
        JSON.stringify(w.root_examples || []), w.grammar_pos, w.start_ms, w.end_ms
      );
    }

    if (c.deep_study) {
      const ds = c.deep_study;
      insertDeepStudy.run(
        c.id, ds.plain_summary, ds.key_takeaway, ds.asbab_al_nuzul,
        ds.tafsir_saadi, ds.tafsir_ibn_kathir, ds.tafsir_maariful,
        ds.actionable_sunnah, ds.source_citation
      );
    }
  }

  db.exec(`DELETE FROM card_cross_references;`);
  const insertRef = db.prepare(`
    INSERT INTO card_cross_references (source_card_id, target_card_id, relationship_note)
    VALUES (?, ?, ?)
  `);
  for (const ref of CROSS_REFERENCES) {
    insertRef.run(ref.source_card_id, ref.target_card_id, ref.relationship_note);
  }

  // Ensure default user state exists
  const ensureState = db.prepare(`INSERT OR IGNORE INTO user_state (key, value) VALUES (?, ?)`);
  ensureState.run('streak_count', '12');
  ensureState.run('theme', 'midnight_sanctuary');
  ensureState.run('arabic_script', 'uthmani');
  ensureState.run('translation_edition', 'clear');
  ensureState.run('show_transliteration', 'true');
  ensureState.run('reciter', 'Mishary Rashid Alafasy');
  ensureState.run('plus_member', 'false');
  ensureState.run('sequential_quran_card', 'card-quran-94-5');
  ensureState.run('sequential_book_card', 'card-hadith-nawawi-19');

  // Seed 2 initial bookmarks so the Bookmarks Vault has immediate examples
  const countBookmarks = db.prepare(`SELECT COUNT(*) as c FROM user_bookmarks`).get();
  if (countBookmarks.c === 0) {
    const insBm = db.prepare(`INSERT OR IGNORE INTO user_bookmarks (card_id, folder_name) VALUES (?, ?)`);
    insBm.run('card-quran-94-5', 'Favorites');
    insBm.run('card-dua-hisn-anxiety', 'Hardship & Sabr');
  }
}

seedDatabase();

// Helper to hydrate cards with words, deep_study, cross_references, bookmarks, and practiced state
function getHydratedCards() {
  const cards = db.prepare(`SELECT * FROM feed_cards ORDER BY sequence_order ASC, id ASC`).all();
  const words = db.prepare(`SELECT * FROM card_words ORDER BY word_position ASC`).all();
  const deepStudies = db.prepare(`SELECT * FROM card_deep_study`).all();
  const crossRefs = db.prepare(`
    SELECT r.*, c.source_title, c.card_type, c.share_slug, c.arabic_text_uthmani, c.translation_en_clear, c.authenticity_grade
    FROM card_cross_references r
    JOIN feed_cards c ON c.id = r.target_card_id
  `).all();
  const bookmarks = db.prepare(`SELECT * FROM user_bookmarks`).all();
  const practiced = db.prepare(`SELECT * FROM user_practiced_actions`).all();

  const wordsByCard = new Map();
  for (const w of words) {
    w.root_examples = JSON.parse(w.root_examples || '[]');
    if (!wordsByCard.has(w.card_id)) wordsByCard.set(w.card_id, []);
    wordsByCard.get(w.card_id).push(w);
  }

  const dsByCard = new Map();
  for (const ds of deepStudies) dsByCard.set(ds.card_id, ds);

  const refsByCard = new Map();
  for (const r of crossRefs) {
    if (!refsByCard.has(r.source_card_id)) refsByCard.set(r.source_card_id, []);
    refsByCard.get(r.source_card_id).push(r);
  }

  const bmByCard = new Map();
  for (const b of bookmarks) {
    if (!bmByCard.has(b.card_id)) bmByCard.set(b.card_id, []);
    bmByCard.get(b.card_id).push(b.folder_name);
  }

  const pracByCard = new Map();
  for (const p of practiced) pracByCard.set(p.card_id, p);

  return cards.map(c => ({
    ...c,
    mood_tags: JSON.parse(c.mood_tags || '[]'),
    topic_tags: JSON.parse(c.topic_tags || '[]'),
    words: wordsByCard.get(c.id) || [],
    deep_study: dsByCard.get(c.id) || null,
    cross_references: refsByCard.get(c.id) || [],
    bookmark_folders: bmByCard.get(c.id) || [],
    is_bookmarked: (bmByCard.get(c.id) || []).length > 0,
    practiced: pracByCard.get(c.id) || null
  }));
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

  // API: GET /api/bootstrap
  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    const cards = getHydratedCards();
    const state = getUserState();
    const folders = db.prepare(`SELECT DISTINCT folder_name FROM user_bookmarks ORDER BY folder_name ASC`).all().map(r => r.folder_name);
    const allFolders = Array.from(new Set(['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization', ...folders]));
    return sendJson(res, 200, { cards, state, folders: allFolders });
  }

  // API: GET /api/cards/:slug
  if (pathname.startsWith('/api/cards/') && req.method === 'GET') {
    const slug = decodeURIComponent(pathname.replace('/api/cards/', ''));
    const cards = getHydratedCards();
    const found = cards.find(c => c.share_slug === slug || c.id === slug || c.canonical_ref === slug);
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

    const cards = getHydratedCards();
    const folders = db.prepare(`SELECT DISTINCT folder_name FROM user_bookmarks ORDER BY folder_name ASC`).all().map(r => r.folder_name);
    const allFolders = Array.from(new Set(['Favorites', 'Duas for Family', 'Hardship & Sabr', 'Daily Memorization', ...folders]));
    return sendJson(res, 200, { cards, folders: allFolders });
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

    return sendJson(res, 200, {
      cards: getHydratedCards(),
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

  // Dynamic OpenGraph SVG Card Preview: /api/og/:slug.svg
  if (pathname.startsWith('/api/og/') && pathname.endsWith('.svg')) {
    const slug = decodeURIComponent(pathname.replace('/api/og/', '').replace('.svg', ''));
    const cards = getHydratedCards();
    const card = cards.find(c => c.share_slug === slug || c.id === slug) || cards[0];
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
  let ogTitle = 'Halal Scroll: Quran & Sunnah — Daily Ayah, Hadith & Tadabbur';
  let ogDesc = 'Replace mindless social media doom-scrolling with a serene, tactile vertical feed of the Quran, Sahih Hadith, Prophetic Duas, and Seerah reflections.';
  let ogImage = `/api/og/ash-sharh-5-6.svg`;
  if (pathname.startsWith('/c/')) {
    const slug = decodeURIComponent(pathname.replace('/c/', ''));
    const cards = getHydratedCards();
    const card = cards.find(c => c.share_slug === slug || c.id === slug);
    if (card) {
      ogTitle = `${card.source_title} • Halal Scroll`;
      ogDesc = `“${card.translation_en_clear}” — Tap to explore Word-by-Word Arabic Roots, Classical Tafsir & Daily Sunnah.`;
      ogImage = `/api/og/${card.share_slug}.svg`;
    }
  }

  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html
      .replace('__OG_TITLE__', escapeXml(ogTitle))
      .replace('__OG_DESC__', escapeXml(ogDesc))
      .replace('__OG_IMAGE__', escapeXml(ogImage));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(html);
  }

  res.writeHead(404);
  res.end('Not found');
};

const server = http.createServer(handleRequest);

if (require.main === module) {
  buildFrontend().then(() => {
    server.listen(PORT, () => {
      console.log(`Halal Scroll E2E Server listening on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Build error:', err);
  });
}

module.exports = { handleRequest, buildFrontend, db };
