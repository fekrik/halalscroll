// Halal Scroll — Canonical 10,000+ Card Corpus Ingestion Pipeline
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { SEED_CARDS } = require('../server/seed');

const CACHE_DIR = path.join(__dirname, '..', 'server', 'corpus_cache');
const OUT_GZ_FILE = path.join(__dirname, '..', 'server', 'canonical_corpus.json.gz');
const OUT_JSON_FILE = path.join(__dirname, '..', 'server', 'canonical_corpus.json');

function stripHtmlAndFootnotes(str = '') {
  return String(str)
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeClearTranslation(sahihText = '') {
  return stripHtmlAndFootnotes(sahihText)
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/Allāh/g, 'Allah')
    .replace(/\s+-\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferMoodAndTopicTags(englishText = '', sourceTitle = '') {
  const lower = (englishText + ' ' + sourceTitle).toLowerCase();
  const moods = [];
  const topics = [];

  if (/hardship|ease|burden|distress|grief|fear|worry|anxious|sad|afflict|trial|patience|patient/.test(lower)) {
    moods.push('anxious', 'hopeful');
    topics.push('Sabr', 'Relief', 'Tawakkul');
  }
  if (/forgiv|repent|mercy|merciful|sin|pardon|compassion/.test(lower)) {
    moods.push('seeking_forgiveness', 'hopeful');
    topics.push('Mercy', 'Tawbah', 'Forgiveness');
  }
  if (/thank|gratef|praise|blessing|favor|bounty|increase|grace/.test(lower)) {
    moods.push('grateful');
    topics.push('Shukr', 'Alhamdulillah', 'Blessings');
  }
  if (/parent|mother|father|kinship|family|kindness|gentle|smile|neighbor/.test(lower)) {
    moods.push('parents', 'grateful');
    topics.push('Parents', 'Adab', 'Compassion');
  }
  if (/tired|sleep|night|rest|peace|tranquil|heart|heavy|striv/.test(lower)) {
    moods.push('burnout', 'anxious');
    topics.push('Sakinnah', 'Heart', 'Night Prayer');
  }
  if (/alone|near|close|with you|forsaken|guardian|protect|friend|ally/.test(lower)) {
    moods.push('lonely', 'hopeful');
    topics.push('Nearness of Allah', 'Protection', 'Trust');
  }

  if (moods.length === 0) {
    moods.push('hopeful', 'grateful');
  }
  if (topics.length === 0) {
    topics.push('Tadabbur', 'Guidance', 'Iman');
  }

  return {
    mood_tags: Array.from(new Set(moods)).slice(0, 3),
    topic_tags: Array.from(new Set(topics)).slice(0, 3)
  };
}

function pad3(n) {
  return String(n).padStart(3, '0');
}

function buildCorpus() {
  console.log('Loading cached primary datasets...');
  const chapters = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'chapters.json'), 'utf8')).chapters;
  const uthmaniVerses = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'quran_uthmani.json'), 'utf8')).verses;
  const indopakVerses = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'quran_indopak.json'), 'utf8')).verses;
  const sahihTranslations = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'translation_sahih_20.json'), 'utf8')).translations;
  const translitSurahs = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'quran_transliteration.json'), 'utf8')).data.surahs;

  const translitByKey = new Map();
  for (const s of translitSurahs) {
    for (const a of s.ayahs) {
      translitByKey.set(`${s.number}:${a.numberInSurah}`, {
        text: a.text,
        ruku: a.ruku,
        juz: a.juz,
        page: a.page
      });
    }
  }

  const existingRefs = new Set(SEED_CARDS.map(c => c.canonical_ref));
  const existingSlugs = new Set(SEED_CARDS.map(c => c.share_slug));
  const existingIds = new Set(SEED_CARDS.map(c => c.id));

  // Start with the 16 flagship hand-crafted SEED_CARDS (boosted discover_weight = 10.0 so they anchor the top of For You)
  const generatedCards = SEED_CARDS.map((c, idx) => ({
    ...c,
    sequence_order: idx + 1,
    discover_weight: 10.0,
    audio_url: c.card_type === 'quran' && c.surah_or_book_num && c.ayah_start
      ? `https://everyayah.com/data/Alafasy_128kbps/${pad3(c.surah_or_book_num)}${pad3(c.ayah_start)}.mp3`
      : null
  }));

  // 1. All 114 Surahs of the Noble Quran (6,236 Ayahs grouped into coherent Thematic Passages)
  const chapterMap = new Map(chapters.map(c => [c.id, c]));
  const versesBySurah = new Map();
  const surahCardCounts = new Map();

  for (let i = 0; i < uthmaniVerses.length; i++) {
    const u = uthmaniVerses[i];
    const [sNumStr, aNumStr] = u.verse_key.split(':');
    const sNum = Number(sNumStr);
    const aNum = Number(aNumStr);
    const indo = indopakVerses[i]?.text_indopak || u.text_uthmani;
    const sahihRaw = sahihTranslations[i]?.text || '';
    const sahihClean = stripHtmlAndFootnotes(sahihRaw);
    const clearEn = makeClearTranslation(sahihRaw);
    const trMeta = translitByKey.get(u.verse_key) || { text: '', ruku: 1, juz: 1, page: 1 };

    if (!versesBySurah.has(sNum)) versesBySurah.set(sNum, []);
    versesBySurah.get(sNum).push({
      surah: sNum,
      ayah: aNum,
      verse_key: u.verse_key,
      uthmani: u.text_uthmani,
      indopak: indo,
      sahih: sahihClean,
      clear: clearEn,
      translit: trMeta.text,
      ruku: trMeta.ruku,
      juz: trMeta.juz
    });
  }

  let quranSeq = 100;
  let quranPassageCount = 0;

  for (const [sNum, ayahs] of versesBySurah.entries()) {
    const ch = chapterMap.get(sNum);
    const surahName = ch ? ch.name_simple : `Surah ${sNum}`;
    const surahMeaning = ch?.translated_name?.name || '';
    const revPlace = ch?.revelation_place === 'makkah' ? 'Meccan' : 'Medinan';
    let countForSurah = SEED_CARDS.filter(c => c.card_type === 'quran' && c.surah_or_book_num === sNum).length;

    let i = 0;
    while (i < ayahs.length) {
      const group = [ayahs[i]];
      let charLen = ayahs[i].uthmani.length;
      const startRuku = ayahs[i].ruku;
      i++;

      // Group up to 3 connected ayahs if within the same Ruku and under 210 Arabic chars
      while (
        i < ayahs.length &&
        group.length < 3 &&
        ayahs[i].ruku === startRuku &&
        charLen + ayahs[i].uthmani.length < 210
      ) {
        group.push(ayahs[i]);
        charLen += ayahs[i].uthmani.length;
        i++;
      }

      const ayahStart = group[0].ayah;
      const ayahEnd = group[group.length - 1].ayah;
      const rangeStr = ayahStart === ayahEnd ? `${ayahStart}` : `${ayahStart}-${ayahEnd}`;
      const displayRange = ayahStart === ayahEnd ? `${ayahStart}` : `${ayahStart}–${ayahEnd}`;
      const canonicalRef = `quran:${sNum}:${rangeStr}`;

      if (existingRefs.has(canonicalRef)) continue;
      existingRefs.add(canonicalRef);

      let slug = `${surahName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sNum}-${rangeStr}`;
      if (existingSlugs.has(slug)) slug = `${slug}-p`;
      existingSlugs.add(slug);

      const cardId = `card-quran-${sNum}-${rangeStr}`;
      if (existingIds.has(cardId)) continue;
      existingIds.add(cardId);

      const uthmaniText = group.map(a => `${a.uthmani} ۝`).join(' ');
      const indopakText = group.map(a => `${a.indopak} ۝`).join(' ');
      const translitText = group.map(a => a.translit).join(' ');
      const clearText = group.map(a => a.clear).join(' ');
      const sahihText = group.map(a => a.sahih).join(' ');

      const { mood_tags, topic_tags } = inferMoodAndTopicTags(clearText, `${surahName} ${surahMeaning}`);
      const isBelovedSurah = sNum === 1 || sNum >= 78 || [18, 36, 55, 56, 67, 12, 19, 20, 31].includes(sNum);

      generatedCards.push({
        id: cardId,
        card_type: 'quran',
        canonical_ref: canonicalRef,
        share_slug: slug,
        collection_slug: 'quran',
        sequence_order: quranSeq++,
        surah_or_book_num: sNum,
        ayah_start: ayahStart,
        ayah_end: ayahEnd,
        passage_group_id: `surah-${sNum}-ruku-${startRuku}-${ayahStart}`,
        arabic_text_uthmani: uthmaniText,
        arabic_text_indopak: indopakText,
        transliteration: translitText,
        translation_en_clear: clearText,
        translation_en_sahih: sahihText,
        source_title: `Surah ${surahName} • ${sNum}:${displayRange}`,
        surah_subtitle: `${surahMeaning} • Juz ${group[0].juz}`,
        revelation_place: revPlace,
        narrator_chain: null,
        authenticity_grade: 'Canonical Mutawatir • Grouped Passage',
        theme_palette: 'andalusian_parchment',
        mood_tags,
        topic_tags,
        time_window: sNum === 67 || sNum === 32 ? 'sleep' : sNum === 18 ? 'jumuah' : 'any',
        discover_weight: isBelovedSurah ? 4.5 : 2.2,
        reciter_name: 'Mishary Rashid Alafasy',
        audio_url: `https://everyayah.com/data/Alafasy_128kbps/${pad3(sNum)}${pad3(ayahStart)}.mp3`
      });
      quranPassageCount++;
      countForSurah++;
    }
    surahCardCounts.set(sNum, countForSurah);
  }
  console.log(`✓ Generated ${quranPassageCount} grouped Quran passage cards across all 114 Surahs.`);

  // 2. Complete 40 Hadith an-Nawawi (42 Canonical Hadiths)
  const nawawiAra = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_nawawi_ara.json'), 'utf8')).hadiths;
  const nawawiEng = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_nawawi_eng.json'), 'utf8')).hadiths;
  let nawawiCount = 0;

  for (let i = 0; i < nawawiEng.length; i++) {
    const eng = nawawiEng[i];
    const ara = nawawiAra[i];
    if (!eng || !ara || !eng.text || !ara.text) continue;
    const hNum = eng.hadithnumber || (i + 1);
    const canonicalRef = `nawawi:${hNum}`;
    if (existingRefs.has(canonicalRef)) continue;
    existingRefs.add(canonicalRef);

    const cleanEn = stripHtmlAndFootnotes(eng.text);
    const cleanAr = stripHtmlAndFootnotes(ara.text);
    const { mood_tags, topic_tags } = inferMoodAndTopicTags(cleanEn, `40 Hadith Nawawi ${hNum}`);

    generatedCards.push({
      id: `card-nawawi-${hNum}`,
      card_type: 'hadith',
      canonical_ref: canonicalRef,
      share_slug: `nawawi-hadith-${hNum}`,
      collection_slug: 'nawawi40',
      sequence_order: hNum,
      surah_or_book_num: hNum,
      ayah_start: hNum,
      ayah_end: hNum,
      passage_group_id: null,
      arabic_text_uthmani: cleanAr,
      translation_en_clear: cleanEn,
      source_title: `40 Hadith Nawawi • Hadith ${hNum}`,
      surah_subtitle: 'Foundations of Prophetic Wisdom',
      revelation_place: null,
      narrator_chain: 'Imam Yahya ibn Sharaf an-Nawawi',
      authenticity_grade: '✓ Sahih • Canonical 40 Nawawi',
      theme_palette: 'andalusian_parchment',
      mood_tags,
      topic_tags,
      time_window: 'any',
      discover_weight: 5.5,
      reciter_name: 'Mishary Rashid Alafasy',
      audio_url: null
    });
    nawawiCount++;
  }
  console.log(`✓ Generated ${nawawiCount} cards from 40 Hadith an-Nawawi.`);

  // 3. Complete 40 Hadith Qudsi (Sacred Hadith)
  const qudsiAra = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_qudsi_ara.json'), 'utf8')).hadiths;
  const qudsiEng = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_qudsi_eng.json'), 'utf8')).hadiths;
  let qudsiCount = 0;

  for (let i = 0; i < qudsiEng.length; i++) {
    const eng = qudsiEng[i];
    const ara = qudsiAra[i];
    if (!eng || !ara || !eng.text || !ara.text) continue;
    const hNum = eng.hadithnumber || (i + 1);
    const canonicalRef = `qudsi:${hNum}`;
    if (existingRefs.has(canonicalRef)) continue;
    existingRefs.add(canonicalRef);

    const cleanEn = stripHtmlAndFootnotes(eng.text);
    const cleanAr = stripHtmlAndFootnotes(ara.text);
    const { mood_tags, topic_tags } = inferMoodAndTopicTags(cleanEn, `Hadith Qudsi ${hNum}`);

    generatedCards.push({
      id: `card-qudsi-${hNum}`,
      card_type: 'hadith',
      canonical_ref: canonicalRef,
      share_slug: `hadith-qudsi-${hNum}`,
      collection_slug: 'riyad_assalihin',
      sequence_order: 100 + hNum,
      surah_or_book_num: hNum,
      ayah_start: hNum,
      ayah_end: hNum,
      passage_group_id: null,
      arabic_text_uthmani: cleanAr,
      translation_en_clear: cleanEn,
      source_title: `40 Hadith Qudsi • Hadith ${hNum}`,
      surah_subtitle: 'Sacred Divine Sayings on the Tongue of the Prophet ﷺ',
      revelation_place: null,
      narrator_chain: 'Sacred Hadith Qudsi (Bukhari & Muslim)',
      authenticity_grade: '✓ Sahih • Hadith Qudsi',
      theme_palette: 'andalusian_parchment',
      mood_tags,
      topic_tags,
      time_window: 'any',
      discover_weight: 5.0,
      reciter_name: 'Mishary Rashid Alafasy',
      audio_url: null
    });
    qudsiCount++;
  }
  console.log(`✓ Generated ${qudsiCount} cards from 40 Hadith Qudsi.`);

  // 4. Sahih al-Bukhari & Sahih Muslim (All Concise, Complete Prophetic Narrations, Duas, Adab, Riqaq & Seerah)
  const bukhariEng = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_bukhari_eng.json'), 'utf8'));
  const bukhariAra = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_bukhari_ara.json'), 'utf8'));
  const muslimEng = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_muslim_eng.json'), 'utf8'));
  const muslimAra = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'hadith_muslim_ara.json'), 'utf8'));

  const bukhariAraByNum = new Map(bukhariAra.hadiths.map(h => [h.hadithnumber, h.text]));
  const muslimAraByNum = new Map(muslimAra.hadiths.map(h => [h.hadithnumber, h.text]));

  // Exclude technical legal/penal chapters unsuitable for spiritual feed
  const excludedBukhariBooks = new Set([6, 28, 36, 38, 39, 44, 48, 50, 68, 84, 85, 86, 87, 88, 89, 90]);
  let bukhariCount = 0;

  for (const h of bukhariEng.hadiths) {
    const bookNum = h.reference?.book;
    if (!bookNum || excludedBukhariBooks.has(bookNum)) continue;
    const enText = stripHtmlAndFootnotes(h.text || '');
    const arText = stripHtmlAndFootnotes(bukhariAraByNum.get(h.hadithnumber) || '');
    if (enText.length < 70 || enText.length > 620 || arText.length < 35 || arText.length > 720) continue;

    const hNum = h.hadithnumber;
    const canonicalRef = `bukhari:${hNum}`;
    if (existingRefs.has(canonicalRef)) continue;
    existingRefs.add(canonicalRef);

    const sectionTitle = bukhariEng.metadata?.sections?.[String(bookNum)] || 'Sahih al-Bukhari';
    const isDua = bookNum === 80 || bookNum === 15;
    const isSeerah = [1, 60, 61, 62, 63, 64].includes(bookNum);
    const isAdab = [78, 79, 51, 53, 69].includes(bookNum);
    const isHighPriority = [2, 3, 19, 30, 32, 66, 78, 80, 81, 97].includes(bookNum);

    const cardType = isDua ? 'dua' : isSeerah ? 'seerah' : 'hadith';
    const collectionSlug = isDua
      ? 'hisn'
      : isSeerah
      ? 'seerah'
      : isAdab
      ? 'adab_mufrad'
      : 'riyad_assalihin';

    let narrator = 'Sahih al-Bukhari';
    let bodyEn = enText;
    const narMatch = enText.match(/^(Narrated [^:]{3,55}):\s*(.+)$/s);
    if (narMatch) {
      narrator = narMatch[1];
      bodyEn = narMatch[2].trim();
    }

    const { mood_tags, topic_tags } = inferMoodAndTopicTags(bodyEn, sectionTitle);

    generatedCards.push({
      id: `card-bukhari-${hNum}`,
      card_type: cardType,
      canonical_ref: canonicalRef,
      share_slug: `bukhari-${hNum}`,
      collection_slug: collectionSlug,
      sequence_order: 1000 + bukhariCount,
      surah_or_book_num: bookNum,
      ayah_start: hNum,
      ayah_end: hNum,
      passage_group_id: null,
      arabic_text_uthmani: arText,
      translation_en_clear: bodyEn,
      source_title: `Sahih al-Bukhari • #${hNum}`,
      surah_subtitle: `Book of ${sectionTitle}`,
      revelation_place: null,
      narrator_chain: narrator,
      authenticity_grade: '✓ Sahih • Imam al-Bukhari',
      theme_palette: 'andalusian_parchment',
      mood_tags,
      topic_tags,
      time_window: bookNum === 19 ? 'sleep' : 'any',
      discover_weight: isHighPriority ? 4.2 : 2.5,
      reciter_name: 'Mishary Rashid Alafasy',
      audio_url: null
    });
    bukhariCount++;
  }
  console.log(`✓ Generated ${bukhariCount} cards from Sahih al-Bukhari.`);

  const excludedMuslimBooks = new Set([3, 17, 18, 19, 23, 28, 29, 30]);
  let muslimCount = 0;

  for (const h of muslimEng.hadiths) {
    const bookNum = h.reference?.book;
    if (!bookNum || excludedMuslimBooks.has(bookNum)) continue;
    const enText = stripHtmlAndFootnotes(h.text || '');
    const arText = stripHtmlAndFootnotes(muslimAraByNum.get(h.hadithnumber) || '');
    if (enText.length < 70 || enText.length > 620 || arText.length < 35 || arText.length > 720) continue;

    const hNum = h.hadithnumber;
    const canonicalRef = `muslim:${hNum}`;
    if (existingRefs.has(canonicalRef)) continue;
    existingRefs.add(canonicalRef);

    const sectionTitle = (muslimEng.metadata?.sections?.[String(bookNum)] || 'Sahih Muslim').replace(/^The Book (of|Pertaining to)\s+/i, '').trim();
    const isDua = bookNum === 48 || bookNum === 50;
    const isSeerah = bookNum === 43 || bookNum === 44;
    const isAdab = [38, 39, 40, 45].includes(bookNum);
    const isHighPriority = [1, 38, 45, 47, 48, 49, 50, 55].includes(bookNum);

    const cardType = isDua ? 'dua' : isSeerah ? 'seerah' : 'hadith';
    const collectionSlug = isDua
      ? 'hisn'
      : isSeerah
      ? 'seerah'
      : isAdab
      ? 'adab_mufrad'
      : 'riyad_assalihin';

    const { mood_tags, topic_tags } = inferMoodAndTopicTags(enText, sectionTitle);

    generatedCards.push({
      id: `card-muslim-${hNum}`,
      card_type: cardType,
      canonical_ref: canonicalRef,
      share_slug: `muslim-${hNum}`,
      collection_slug: collectionSlug,
      sequence_order: 6000 + muslimCount,
      surah_or_book_num: bookNum,
      ayah_start: hNum,
      ayah_end: hNum,
      passage_group_id: null,
      arabic_text_uthmani: arText,
      translation_en_clear: enText,
      source_title: `Sahih Muslim • #${hNum}`,
      surah_subtitle: `Book of ${sectionTitle}`,
      revelation_place: null,
      narrator_chain: 'Sahih Muslim',
      authenticity_grade: '✓ Sahih • Imam Muslim',
      theme_palette: 'andalusian_parchment',
      mood_tags,
      topic_tags,
      time_window: 'any',
      discover_weight: isHighPriority ? 4.0 : 2.3,
      reciter_name: 'Mishary Rashid Alafasy',
      audio_url: null
    });
    muslimCount++;
  }
  console.log(`✓ Generated ${muslimCount} cards from Sahih Muslim.`);

  // Build Surah metadata directory with card counts
  const surahDirectory = chapters.map(ch => ({
    number: ch.id,
    name_simple: ch.name_simple,
    name_arabic: ch.name_arabic,
    translated_name: ch.translated_name?.name || '',
    verses_count: ch.verses_count,
    revelation_place: ch.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
    card_count: surahCardCounts.get(ch.id) || 1
  }));

  const payload = {
    generated_at: new Date().toISOString(),
    total_cards: generatedCards.length,
    surahs: surahDirectory,
    cards: generatedCards
  };

  const jsonBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const gzBuffer = zlib.gzipSync(jsonBuffer, { level: 9 });
  fs.writeFileSync(OUT_GZ_FILE, gzBuffer);
  // Remove old uncompressed file if present so repo stays lean
  if (fs.existsSync(OUT_JSON_FILE)) fs.unlinkSync(OUT_JSON_FILE);

  const rawMb = (jsonBuffer.length / (1024 * 1024)).toFixed(2);
  const gzMb = (gzBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`\n======================================================`);
  console.log(`TOTAL CANONICAL CARDS GENERATED: ${generatedCards.length}`);
  console.log(`  - Uncompressed JSON: ${rawMb} MB -> Gzipped: ${gzMb} MB`);
  console.log(`  - Flagship Seed Cards: ${SEED_CARDS.length}`);
  console.log(`  - Quran Passage Cards (All 114 Surahs): ${quranPassageCount}`);
  console.log(`  - 40 Hadith Nawawi: ${nawawiCount}`);
  console.log(`  - 40 Hadith Qudsi: ${qudsiCount}`);
  console.log(`  - Sahih al-Bukhari: ${bukhariCount}`);
  console.log(`  - Sahih Muslim: ${muslimCount}`);
  console.log(`======================================================\n`);
}

buildCorpus();
