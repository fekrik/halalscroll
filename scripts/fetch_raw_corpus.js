const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const CACHE_DIR = path.join(__dirname, '..', 'server', 'corpus_cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'HalalScroll-Corpus-Ingest/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(JSON.parse(text));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function downloadIfMissing(filename, url) {
  const target = path.join(CACHE_DIR, filename);
  if (fs.existsSync(target) && fs.statSync(target).size > 1000) {
    console.log(`✓ Cached: ${filename}`);
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  }
  console.log(`Downloading ${filename} from ${url}...`);
  const data = await fetchUrl(url);
  fs.writeFileSync(target, JSON.stringify(data));
  console.log(`✓ Saved ${filename} (${(fs.statSync(target).size / 1024).toFixed(1)} KB)`);
  return data;
}

async function main() {
  // 1. All 114 Chapters metadata from Quran.com v4
  await downloadIfMissing('chapters.json', 'https://api.quran.com/api/v4/chapters?language=en');

  // 2. All 6,236 Ayahs in Uthmani & IndoPak script from Quran.com v4
  await downloadIfMissing('quran_uthmani.json', 'https://api.quran.com/api/v4/quran/verses/uthmani');
  await downloadIfMissing('quran_indopak.json', 'https://api.quran.com/api/v4/quran/verses/indopak');

  // 3. Complete English Translations: The Clear Quran (131) & Sahih International (20)
  await downloadIfMissing('translation_clear_131.json', 'https://api.quran.com/api/v4/quran/translations/131');
  await downloadIfMissing('translation_sahih_20.json', 'https://api.quran.com/api/v4/quran/translations/20');

  // 4. Complete Quran Transliteration (en.transliteration from AlQuran Cloud)
  try {
    await downloadIfMissing('quran_transliteration.json', 'https://api.alquran.cloud/v1/quran/en.transliteration');
  } catch (e) {
    console.warn('Transliteration optional fetch warning:', e.message);
  }

  // 5. Complete 40 Hadith Nawawi (Arabic + English)
  await downloadIfMissing('hadith_nawawi_ara.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.min.json');
  await downloadIfMissing('hadith_nawawi_eng.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-nawawi.min.json');

  // 6. Riyad as-Salihin / Bukhari & Muslim Authentic Collections (Arabic + English)
  const hadithCollections = [
    ['hadith_qudsi_ara.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-qudsi.min.json'],
    ['hadith_qudsi_eng.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-qudsi.min.json'],
    ['hadith_bukhari_eng.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari.min.json'],
    ['hadith_bukhari_ara.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.min.json'],
    ['hadith_muslim_eng.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-muslim.min.json'],
    ['hadith_muslim_ara.json', 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim.min.json']
  ];

  for (const [fname, url] of hadithCollections) {
    try {
      await downloadIfMissing(fname, url);
    } catch (e) {
      console.warn(`Optional collection ${fname} skipped:`, e.message);
    }
  }

  console.log('\nAll canonical primary datasets downloaded to server/corpus_cache!');
}

main().catch(err => {
  console.error('Corpus fetch failed:', err);
  process.exit(1);
});

