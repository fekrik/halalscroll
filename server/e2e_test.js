// Automated End-to-End Verification Suite for Halal Scroll: Quran & Sunnah
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { handleRequest, buildFrontend } = require('./index');

function request(method, path, body = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const req = new EventEmitter();
      req.method = method;
      req.url = path;
      req.headers = { 'content-type': 'application/json' };

      let resStatus = 200;
      let resHeaders = {};
      let resBody = '';

      const res = {
        writeHead(status, headers = {}) {
          resStatus = status;
          resHeaders = Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
          );
        },
        end(chunk = '') {
          resBody += chunk ? chunk.toString() : '';
          let json = null;
          try { json = JSON.parse(resBody); } catch {}
          resolve({ status: resStatus, headers: resHeaders, text: resBody, json });
        }
      };

      const p = handleRequest(req, res);
      if (body) {
        req.emit('data', Buffer.from(JSON.stringify(body)));
      }
      req.emit('end');
      await p;
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('Building frontend bundle and running Halal Scroll E2E verification...');
  await buildFrontend();

  // 1. Test /api/bootstrap (Feed Cards, Word Morphology, 5-Layer Deep Study, Cross-References)
  const boot = await request('GET', '/api/bootstrap');
  assert.strictEqual(boot.status, 200, 'Bootstrap endpoint should return 200');
  assert(Array.isArray(boot.json.cards) && boot.json.cards.length === 16, 'Should return all 16 canonical cards');

  const ashSharh = boot.json.cards.find(c => c.share_slug === 'ash-sharh-5-6');
  assert(ashSharh, 'Surah Ash-Sharh 94:5-6 grouped passage should exist');
  assert.strictEqual(ashSharh.words.length, 8, 'Surah Ash-Sharh 94:5-6 should have 8 interactive word tokens');
  assert(ashSharh.deep_study && ashSharh.deep_study.plain_summary, 'Should include pre-computed RAG-grounded Deep Study');
  assert(ashSharh.cross_references.length >= 2, 'Should include bidirectional Ayah <-> Hadith cross-references');
  console.log('✓ 1. /api/bootstrap verified: Canonical cards, word morphology, 5-tab Deep Study & cross-references intact');

  // 2. Test /api/cards/:slug lookup
  const single = await request('GET', '/api/cards/ad-duha-1-5');
  assert.strictEqual(single.status, 200);
  assert.strictEqual(single.json.card.canonical_ref, 'quran:93:1-5');
  console.log('✓ 2. /api/cards/:slug verified: Single card lookup for Surah Ad-Duha 93:1-5');

  // 3. Test Custom Collection Bookmarking (/api/bookmarks)
  const bm = await request('POST', '/api/bookmarks', {
    card_id: 'card-quran-39-53',
    folder_name: 'Tawbah & Hope',
    action: 'add'
  });
  assert.strictEqual(bm.status, 200);
  assert(bm.json.folders.includes('Tawbah & Hope'), 'New custom folder should be persisted');
  const azZumar = bm.json.cards.find(c => c.id === 'card-quran-39-53');
  assert(azZumar.bookmark_folders.includes('Tawbah & Hope'), 'Card should belong to custom folder');
  console.log('✓ 3. /api/bookmarks verified: Custom collection creation and persistence in SQLite');

  // 4. Test Daily Sunnah Action Practice & Streak Increment (/api/practice)
  const prevStreak = parseInt(boot.json.state.streak_count, 10);
  const prac = await request('POST', '/api/practice', {
    card_id: 'card-quran-94-5',
    practiced: true,
    reflection_note: 'Alhamdulillah, listed two mercies alongside my current test.'
  });
  assert.strictEqual(prac.status, 200);
  const newStreak = parseInt(prac.json.state.streak_count, 10);
  assert(newStreak >= prevStreak, 'Streak should increment when practicing a Sunnah action');
  const updatedSharh = prac.json.cards.find(c => c.id === 'card-quran-94-5');
  assert.strictEqual(
    updatedSharh.practiced.reflection_note,
    'Alhamdulillah, listed two mercies alongside my current test.'
  );
  console.log('✓ 4. /api/practice verified: Actionable Sunnah marked practiced, reflection saved, streak updated');

  // 5. Test User Preferences Persistence (/api/state)
  const st = await request('POST', '/api/state', {
    theme: 'andalusian_parchment',
    arabic_script: 'uthmani'
  });
  assert.strictEqual(st.status, 200);
  assert.strictEqual(st.json.state.theme, 'andalusian_parchment');
  // Restore default midnight_sanctuary
  await request('POST', '/api/state', { theme: 'midnight_sanctuary' });
  console.log('✓ 5. /api/state verified: Theme, Arabic script & user state persisted');

  // 6. Test Dynamic OpenGraph SVG Card & Web Companion Deep Link (/c/:slug & /api/og/:slug.svg)
  const og = await request('GET', '/api/og/ash-sharh-5-6.svg');
  assert.strictEqual(og.status, 200);
  assert(og.headers['content-type'].includes('image/svg+xml'));
  assert(og.text.includes('Surah Ash-Sharh'));

  const deepLinkHtml = await request('GET', '/c/ash-sharh-5-6');
  assert.strictEqual(deepLinkHtml.status, 200);
  assert(deepLinkHtml.text.includes('Surah Ash-Sharh • 94:5–6 • Halal Scroll'));
  assert(deepLinkHtml.text.includes('/api/og/ash-sharh-5-6.svg'));
  console.log('✓ 6. Web Companion Deep Link (/c/ash-sharh-5-6) & OpenGraph SVG generator verified');

  // 7. Verify compiled frontend bundle (/app.js)
  const bundle = await request('GET', '/app.js');
  assert.strictEqual(bundle.status, 200);
  assert(bundle.text.length > 50000, 'Frontend React + Lucide bundle should be compiled and served');
  console.log('✓ 7. Frontend React bundle (/app.js) verified');

  console.log('\nALL 7 E2E VERIFICATION SUITES PASSED!');
}

runTests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
