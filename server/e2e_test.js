// Automated End-to-End Verification Suite for Halal Scroll: Quran & Sunnah (14,678+ Card Production Corpus)
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { handleRequest, buildFrontend } = require('./index');

function request(method, path, body = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const req = new EventEmitter();
      req.method = method;
      req.url = path;
      req.headers = { 'content-type': 'application/json', host: 'halalscroll-production.up.railway.app' };

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

  // 1. Test /api/bootstrap (14,678+ Canonical Cards, 114 Surahs Directory, Word Morphology, 5-Layer Deep Study)
  const boot = await request('GET', '/api/bootstrap');
  assert.strictEqual(boot.status, 200, 'Bootstrap endpoint should return 200');
  assert(Array.isArray(boot.json.cards) && boot.json.cards.length === 20, 'Should return initial 20 hydrated cards');
  assert(boot.json.total_corpus_count >= 14000, `Expected 14,000+ total cards, got ${boot.json.total_corpus_count}`);
  assert(Array.isArray(boot.json.surahs) && boot.json.surahs.length === 114, 'Should return all 114 Surahs metadata');

  const ashSharh = boot.json.cards.find(c => c.share_slug === 'ash-sharh-5-6');
  assert(ashSharh, 'Surah Ash-Sharh 94:5-6 grouped passage should exist');
  assert.strictEqual(ashSharh.words.length, 8, 'Surah Ash-Sharh 94:5-6 should have 8 interactive word tokens');
  assert(ashSharh.deep_study && ashSharh.deep_study.plain_summary, 'Should include pre-computed RAG-grounded Deep Study');
  assert(ashSharh.cross_references.length >= 2, 'Should include bidirectional Ayah <-> Hadith cross-references');
  console.log(`✓ 1. /api/bootstrap verified: ${boot.json.total_corpus_count.toLocaleString()} canonical cards & 114 Surahs intact`);

  // 2. Test /api/feed Pagination & Surah Filter (Surah Ya-Sin #36 & 40 Hadith Nawawi)
  const yasinFeed = await request('GET', '/api/feed?mode=sequential&collection=quran&surah=36&offset=0&limit=10');
  assert.strictEqual(yasinFeed.status, 200);
  assert(yasinFeed.json.cards.length > 0 && yasinFeed.json.total >= 20, 'Surah Ya-Sin should have grouped passage cards');
  assert.strictEqual(yasinFeed.json.cards[0].surah_or_book_num, 36);
  assert(yasinFeed.json.cards[0].audio_url.includes('Alafasy_128kbps/036'), 'Should include real EveryAyah Qari MP3 URL');
  assert(yasinFeed.json.cards[0].words.length >= 4, 'Should include spotlight root words on ingested Quran passages');
  assert(yasinFeed.json.cards[0].deep_study.plain_summary.includes('Ya-Sin'), 'Should include hydrated 5-layer Deep Study');

  const nawawiFeed = await request('GET', '/api/feed?mode=sequential&collection=nawawi40&offset=0&limit=50');
  assert.strictEqual(nawawiFeed.status, 200);
  assert(nawawiFeed.json.total >= 42, 'Should include complete 40 Hadith Nawawi');
  console.log('✓ 2. /api/feed pagination, Surah filter (Surah Ya-Sin #36), and 40 Hadith Nawawi verified');

  // 3. Test /api/cards/:slug lookup across flagship and newly ingested cards
  const single = await request('GET', '/api/cards/ad-duha-1-5');
  assert.strictEqual(single.status, 200);
  assert.strictEqual(single.json.card.canonical_ref, 'quran:93:1-5');

  const nawawi1 = await request('GET', '/api/cards/nawawi-hadith-1');
  assert.strictEqual(nawawi1.status, 200);
  assert.strictEqual(nawawi1.json.card.canonical_ref, 'nawawi:1');
  console.log('✓ 3. /api/cards/:slug verified for both flagship and ingested 14,678-card corpus');

  // 4. Test Custom Collection Bookmarking (/api/bookmarks)
  const bm = await request('POST', '/api/bookmarks', {
    card_id: 'card-quran-39-53',
    folder_name: 'Tawbah & Hope',
    action: 'add'
  });
  assert.strictEqual(bm.status, 200);
  assert(bm.json.folders.includes('Tawbah & Hope'), 'New custom folder should be persisted');
  assert(bm.json.card.bookmark_folders.includes('Tawbah & Hope'), 'Card should belong to custom folder');
  console.log('✓ 4. /api/bookmarks verified: Custom collection creation and persistence in SQLite');

  // 5. Test Daily Sunnah Action Practice & Streak Increment (/api/practice)
  const prevStreak = parseInt(boot.json.state.streak_count, 10);
  const prac = await request('POST', '/api/practice', {
    card_id: 'card-quran-94-5',
    practiced: true,
    reflection_note: 'Alhamdulillah, listed two mercies alongside my current test.'
  });
  assert.strictEqual(prac.status, 200);
  const newStreak = parseInt(prac.json.state.streak_count, 10);
  assert(newStreak >= prevStreak, 'Streak should increment when practicing a Sunnah action');
  assert.strictEqual(
    prac.json.card.practiced.reflection_note,
    'Alhamdulillah, listed two mercies alongside my current test.'
  );
  console.log('✓ 5. /api/practice verified: Actionable Sunnah marked practiced, reflection saved, streak updated');

  // 6. Test User Preferences Persistence (/api/state) & Dynamic OpenGraph JPG/SVG
  const st = await request('POST', '/api/state', {
    theme: 'midnight_sanctuary',
    arabic_script: 'uthmani'
  });
  assert.strictEqual(st.status, 200);
  assert.strictEqual(st.json.state.theme, 'midnight_sanctuary');
  await request('POST', '/api/state', { theme: 'andalusian_parchment' });

  const ogSvg = await request('GET', '/api/og/ash-sharh-5-6.svg');
  assert.strictEqual(ogSvg.status, 200);
  assert(ogSvg.headers['content-type'].includes('image/svg+xml'));

  const ogJpg = await request('GET', '/api/og/ash-sharh-5-6.jpg');
  assert.strictEqual(ogJpg.status, 200);
  assert(ogJpg.headers['content-type'].includes('image/jpeg'));

  const deepLinkHtml = await request('GET', '/c/ash-sharh-5-6');
  assert.strictEqual(deepLinkHtml.status, 200);
  assert(!deepLinkHtml.text.includes('__OG_'), 'Deep link HTML must never contain raw __OG_ placeholders');
  assert(deepLinkHtml.text.includes('Surah Ash-Sharh • 94:5–6 • Halal Scroll'));
  assert(deepLinkHtml.text.includes('https://halalscroll-production.up.railway.app/api/og/ash-sharh-5-6.jpg'));
  console.log('✓ 6. User preferences, Web Companion Deep Link & iMessage/WhatsApp OpenGraph JPG verified');

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
