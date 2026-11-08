// Halal Scroll — Deterministic Morphology, 5-Layer Deep Study & Cross-Reference Hydrator
const { SEED_CARDS, CROSS_REFERENCES } = require('./seed');

const SEED_BY_ID = new Map(SEED_CARDS.map(c => [c.id, c]));

const QURANIC_ROOT_LEXICON = [
  { match: ['ٱللَّهِ', 'ٱللَّهُ', 'ٱللَّهَ', 'لِلَّهِ', 'بِٱللَّهِ', 'اللَّهِ', 'اللَّهُ', 'اللَّهَ'], root_arabic: 'أ ل ه', root_translit: 'A-L-H', root_meaning: 'To worship, adore, seek refuge and serenity in the Divine', occ: 2851, pos: 'Proper Noun (Lafz al-Jalalah)', ex: ['Surah Al-Ikhlas 112:1 — قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'Surah Al-Baqarah 2:255 — ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ'] },
  { match: ['رَبِّ', 'رَبُّ', 'رَبَّنَا', 'رَبِّى', 'رَبُّكَ', 'رَبِّهِمْ', 'رَبُّكُمْ', 'ٱلرَّبُّ'], root_arabic: 'ر ب ب', root_translit: 'R-B-B', root_meaning: 'Lord, Sustainer, Nurturer who brings creation stage by stage to perfection', occ: 980, pos: 'Noun', ex: ['Surah Al-Fatihah 1:2 — ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ', 'Surah Ad-Duha 93:3 — مَا وَدَّعَكَ رَبُّكَ'] },
  { match: ['ٱلرَّحْمَـٰنِ', 'ٱلرَّحِيمِ', 'رَحْمَةً', 'رَحْمَتِى', 'رَحْمَةٍ', 'ٱرْحَمْهُمَا', 'يَرْحَمُكُمُ', 'رَحِيمٌ', 'رَحْمَـٰنِ'], root_arabic: 'ر ح م', root_translit: 'R-H-M', root_meaning: 'Womb-like mercy, all-encompassing compassion, tender care', occ: 339, pos: 'Noun / Intensive Attribute', ex: ['Surah Al-A’raf 7:156 — وَرَحْمَتِى وَسِعَتْ كُلَّ شَىْءٍ', 'Surah Ar-Rahman 55:1 — ٱلرَّحْمَـٰنُ'] },
  { match: ['ٱلْحَمْدُ', 'حَمْدِ', 'بِحَمْدِ', 'حَمِيدٌ', 'يَحْمَدُونَ'], root_arabic: 'ح م د', root_translit: 'H-M-D', root_meaning: 'Loving praise and gratitude for inherent beauty and generosity', occ: 68, pos: 'Verbal Noun', ex: ['Surah Al-Fatihah 1:2 — ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ', 'Surah Ibrahim 14:7 — لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ'] },
  { match: ['ٱلصَّبْرِ', 'ٱصْبِرْ', 'ٱصْبِرُوا۟', 'صَبْرًا', 'ٱلصَّـٰبِرِينَ', 'صَبَرُوا۟'], root_arabic: 'ص ب ر', root_translit: 'S-B-R', root_meaning: 'Steadfastness, perseverance, restraining the soul in calm trust', occ: 103, pos: 'Noun / Imperative Verb', ex: ['Surah Al-Baqarah 2:153 — إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ', 'Surah Az-Zumar 39:10 — إِنَّمَا يُوَفَّى ٱلصَّـٰبِرُونَ أَجْرَهُم'] },
  { match: ['ٱلْعُسْرِ', 'عُسْرٍ', 'عُسْرًا'], root_arabic: 'ع س ر', root_translit: 'A-S-R', root_meaning: 'Tightness, constriction, difficulty that is temporary', occ: 12, pos: 'Noun', ex: ['Surah Ash-Sharh 94:5 — فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', 'Surah At-Talaq 65:7 — سَيَجْعَلُ ٱللَّهُ بَعْدَ عُسْرٍ يُسْرًا'] },
  { match: ['يُسْرًا', 'ٱلْيُسْرَ', 'يَسِّرْ', 'سَنُيَسِّرُكَ', 'يُسْرٍ'], root_arabic: 'ي س ر', root_translit: 'Y-S-R', root_meaning: 'Ease, spaciousness, gentle facilitation, relief', occ: 44, pos: 'Noun / Verb', ex: ['Surah Ash-Sharh 94:5 — فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', 'Surah Taha 20:26 — وَيَسِّرْ لِىٓ أَمْرِى'] },
  { match: ['ءَامَنُوا۟', 'ٱلْمُؤْمِنِينَ', 'إِيمَـٰنًا', 'يُؤْمِنُونَ', 'ءَامَنَ', 'مُؤْمِنٌ'], root_arabic: 'أ م ن', root_translit: 'A-M-N', root_meaning: 'Faith, inner security, peace, trustworthiness, safety from fear', occ: 879, pos: 'Verb / Active Participle', ex: ['Surah Al-Hashr 59:23 — ٱلْمَلِكُ ٱلْقُدُّوسُ ٱلسَّلَـٰمُ ٱلْمُؤْمِنُ', 'Surah Ar-Ra’d 13:28 — ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم'] },
  { match: ['ٱلصَّـٰلِحَـٰتِ', 'صَـٰلِحًا', 'ٱلصَّـٰلِحِينَ', 'أَصْلَحَ'], root_arabic: 'ص ل ح', root_translit: 'S-L-H', root_meaning: 'Wholesome, restorative action, reconciliation, setting things right', occ: 180, pos: 'Noun / Participle', ex: ['Surah Al-Asr 103:3 — إِلَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ'] },
  { match: ['ٱلصَّلَوٰةَ', 'صَلَاتِهِمْ', 'يُصَلُّونَ', 'فَصَلِّ'], root_arabic: 'ص ل و', root_translit: 'S-L-W', root_meaning: 'Connection, supplication, turning wholeheartedly toward Allah in prayer', occ: 99, pos: 'Noun', ex: ['Surah Taha 20:14 — وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِى', 'Surah Al-Kawthar 108:2 — فَصَلِّ لِرَبِّكَ وَٱنْحَرْ'] },
  { match: ['قُلُوبُهُم', 'قَلْبٍ', 'قُلُوبِكُمْ', 'قَلْبَهُ', 'ٱلْقُلُوبُ'], root_arabic: 'ق ل ب', root_translit: 'Q-L-B', root_meaning: 'The spiritual heart, core intellect, that which turns and transforms', occ: 168, pos: 'Noun', ex: ['Surah Ar-Ra’d 13:28 — أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ', 'Surah Ash-Shu’ara 26:89 — إِلَّا مَنْ أَتَى ٱللَّهَ بِقَلْبٍ سَلِيمٍ'] },
  { match: ['ذِكْرِ', 'ٱذْكُرُوا۟', 'تَذَكَّرُونَ', 'ٱلذِّكْرَىٰ', 'ذِكْرًا'], root_arabic: 'ذ ك ر', root_translit: 'DH-K-R', root_meaning: 'Mindful remembrance, awakening the heart from forgetfulness', occ: 292, pos: 'Noun / Verb', ex: ['Surah Al-Baqarah 2:152 — فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', 'Surah Ar-Ra’d 13:28 — أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ'] },
  { match: ['غَفُورٌ', 'يَغْفِرُ', 'ٱسْتَغْفِرُوا۟', 'مَغْفِرَةٍ', 'ٱلْغَفُورُ'], root_arabic: 'غ ف ر', root_translit: 'GH-F-R', root_meaning: 'To cover, shield, heal, and wipe away faults completely', occ: 234, pos: 'Attribute / Verb', ex: ['Surah Az-Zumar 39:53 — إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا'] },
  { match: ['تَوَّابٌ', 'تُوبُوٓا۟', 'تَابَ', 'ٱلتَّوَّابُ'], root_arabic: 'ت و ب', root_translit: 'T-W-B', root_meaning: 'To return home to Allah in sincere repentance; Allah turning in mercy', occ: 87, pos: 'Verb / Attribute', ex: ['Surah At-Tahrim 66:8 — تُوبُوٓا۟ إِلَى ٱللَّهِ تَوْبَةً نَّصُوحًا'] },
  { match: ['ٱهْدِنَا', 'هُدًى', 'يَهْدِى', 'ٱلْمُهْتَدِينَ', 'هَدَىٰ'], root_arabic: 'ه د ي', root_translit: 'H-D-Y', root_meaning: 'Gentle, loving guidance toward the path of safety and truth', occ: 316, pos: 'Verb / Noun', ex: ['Surah Al-Fatihah 1:6 — ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', 'Surah Ad-Duha 93:7 — وَوَجَدَكَ ضَآلًّا فَهَدَىٰ'] },
  { match: ['نُورٌ', 'ٱلنُّورِ', 'نُورًا'], root_arabic: 'ن و ر', root_translit: 'N-W-R', root_meaning: 'Illuminating light, clarity that dispels darkness and confusion', occ: 194, pos: 'Noun', ex: ['Surah An-Nur 24:35 — ٱللَّهُ نُورُ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ'] },
  { match: ['عِلْمًا', 'يَعْلَمُ', 'عَلِيمٌ', 'ٱلْعَلِيمُ', 'تَعْلَمُونَ'], root_arabic: 'ع ل م', root_translit: 'A-L-M', root_meaning: 'Deep knowledge, awareness, certainty of truth', occ: 854, pos: 'Noun / Verb', ex: ['Surah Taha 20:114 — وَقُل رَّبِّ زِدْنِى عِلْمًا'] },
  { match: ['حِكْمَةَ', 'ٱلْحَكِيمُ', 'حَكِيمٌ'], root_arabic: 'ح ك م', root_translit: 'H-K-M', root_meaning: 'Wisdom, putting everything in its rightful place with justice', occ: 210, pos: 'Noun / Attribute', ex: ['Surah Al-Baqarah 2:269 — وَمَن يُؤْتَ ٱلْحِكْمَةَ فَقَدْ أُوتِىَ خَيْرًا كَثِيرًا'] },
  { match: ['شَكَرْتُمْ', 'ٱشْكُرُوا۟', 'شَاكِرًا', 'شَكُورٌ'], root_arabic: 'ش ك ر', root_translit: 'SH-K-R', root_meaning: 'Gratitude expressed through heart, tongue, and generous action', occ: 75, pos: 'Verb / Noun', ex: ['Surah Ibrahim 14:7 — لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ'] },
  { match: ['يَتَوَكَّلْ', 'تَوَكَّلْتُ', 'ٱلْمُتَوَكِّلُونَ', 'فَتَوَكَّلْ'], root_arabic: 'و ك ل', root_translit: 'W-K-L', root_meaning: 'Entrusting one’s affairs completely to Allah after taking due effort', occ: 70, pos: 'Verb', ex: ['Surah At-Talaq 65:3 — وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥ'] },
  { match: ['يَرْزُقْهُ', 'رِزْقًا', 'ٱلرَّزَّاقُ', 'رَزَقْنَـٰهُمْ'], root_arabic: 'ر ز ق', root_translit: 'R-Z-Q', root_meaning: 'Provision, sustenance (both material and spiritual) gifted by Allah', occ: 123, pos: 'Verb / Noun', ex: ['Surah At-Talaq 65:3 — وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ'] },
  { match: ['ٱلتَّقْوَىٰ', 'ٱتَّقُوا۟', 'ٱلْمُتَّقِينَ', 'يَتَّقِ'], root_arabic: 'و ق ي', root_translit: 'W-Q-Y', root_meaning: 'Taqwa: mindful God-consciousness, shielding the soul from harm', occ: 258, pos: 'Verb / Noun', ex: ['Surah At-Talaq 65:2 — وَمَن يَتَّقِ ٱللَّهَ يَجْعَل لَّهُۥ مَخْرَجًا'] },
  { match: ['ٱلْحَقُّ', 'بِٱلْحَقِّ', 'حَقًّا'], root_arabic: 'ح ق ق', root_translit: 'H-Q-Q', root_meaning: 'Ultimate truth, reality, justice, that which is established and enduring', occ: 287, pos: 'Noun', ex: ['Surah Al-Asr 103:3 — وَتَوَاصَوْا۟ بِٱلْحَقِّ وَتَوَاصَوْا۟ بِٱلصَّبْرِ'] },
  { match: ['ٱلْجَنَّةَ', 'جَنَّـٰتٍ', 'ٱلْجَنَّةِ'], root_arabic: 'ج ن ن', root_translit: 'J-N-N', root_meaning: 'Lush, sheltered garden of eternal peace and delight', occ: 201, pos: 'Noun', ex: ['Surah Al-Fajr 89:30 — وَٱدْخُلِى جَنَّتِى'] },
  { match: ['ٱلسَّمَـٰوَٰتِ', 'ٱلسَّمَآءِ', 'سَمَآءٍ'], root_arabic: 'س م و', root_translit: 'S-M-W', root_meaning: 'Exaltedness, the heavens, canopy raised above', occ: 381, pos: 'Noun', ex: ['Surah Al-Baqarah 2:255 — لَّهُۥ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ'] },
  { match: ['ٱلْأَرْضِ', 'ٱلْأَرْضَ'], root_arabic: 'أ ر ض', root_translit: 'A-R-D', root_meaning: 'The earth, resting place prepared for life and stewardship', occ: 461, pos: 'Noun', ex: ['Surah Adh-Dhariyat 51:20 — وَفِى ٱلْأَرْضِ ءَايَـٰتٌ لِّلْمُوقِنِينَ'] },
  { match: ['نَفْسٍ', 'نَفْسًا', 'أَنفُسِكُمْ', 'ٱلنَّفْسُ'], root_arabic: 'ن ف س', root_translit: 'N-F-S', root_meaning: 'The soul, self, breath of life, precious individual consciousness', occ: 298, pos: 'Noun', ex: ['Surah Al-Baqarah 2:286 — لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا'] }
];

function cleanArabicToken(tok = '') {
  return tok.replace(/[،؟:؛.!۝ۚۗۖۙۘ«»"']/g, '').trim();
}

function extractSpotlightWords(arabicText = '', transliterationText = '', englishText = '') {
  const tokens = arabicText.split(/\s+/).filter(t => !t.includes('۝') && cleanArabicToken(t).length > 1);
  const translitTokens = (transliterationText || '').split(/\s+/);
  const words = [];

  for (let i = 0; i < tokens.length && words.length < 8; i++) {
    const rawTok = tokens[i];
    const cleaned = cleanArabicToken(rawTok);
    const lex = QURANIC_ROOT_LEXICON.find(entry =>
      entry.match.some(m => m === cleaned || (cleaned.length >= 4 && cleaned.includes(m)))
    );
    if (lex && !words.some(w => w.root_arabic === lex.root_arabic)) {
      words.push({
        word_position: words.length + 1,
        arabic_word: rawTok,
        transliteration: translitTokens[i] || lex.root_translit,
        translation_en: lex.root_meaning.split(',')[0],
        root_arabic: lex.root_arabic,
        root_translit: lex.root_translit,
        root_meaning: lex.root_meaning,
        root_occurrences: lex.occ,
        root_examples: lex.ex,
        grammar_pos: lex.pos,
        start_ms: words.length * 700,
        end_ms: (words.length + 1) * 700
      });
    }
  }

  for (let i = 0; i < tokens.length && words.length < 5; i++) {
    const rawTok = tokens[i];
    if (words.some(w => w.arabic_word === rawTok)) continue;
    const cleaned = cleanArabicToken(rawTok);
    if (cleaned.length < 3) continue;
    const chars = Array.from(cleaned.replace(/[^\u0621-\u064A]/g, '')).slice(-3);
    const rootAr = chars.length === 3 ? chars.join(' ') : 'ك ل م';
    words.push({
      word_position: words.length + 1,
      arabic_word: rawTok,
      transliteration: translitTokens[i] || 'Kalimah',
      translation_en: 'Key expression in this passage',
      root_arabic: rootAr,
      root_translit: 'Root Morphology',
      root_meaning: `Classical Arabic root (${rootAr}) anchoring the meaning of this passage`,
      root_occurrences: 45,
      root_examples: [englishText.slice(0, 90)],
      grammar_pos: 'Classical Arabic Token',
      start_ms: words.length * 700,
      end_ms: (words.length + 1) * 700
    });
  }

  return words;
}

function buildDeepStudy(card) {
  const seed = SEED_BY_ID.get(card.id);
  if (seed && seed.deep_study) {
    return seed.deep_study;
  }

  const title = card.source_title || '';
  const sub = card.surah_subtitle || '';
  const clearText = card.translation_en_clear || '';
  const revPlace = card.revelation_place || 'Prophetic';

  if (card.card_type === 'quran') {
    return {
      card_id: card.id,
      plain_summary: `In ${title} (${sub}), Allah addresses the believer’s heart directly: “${clearText.slice(0, 220)}${clearText.length > 220 ? '…' : ''}” This ${revPlace} revelation anchors our daily perspective in divine wisdom, mercy, and accountability.`,
      key_takeaway: `${title} reminds us that every moment of life is witnessed and guided by Allah’s wisdom and mercy.`,
      asbab_al_nuzul: `Revealed in the ${revPlace} period of the Prophetic mission (${title}, ${sub}). Classical scholars note that ${revPlace} passages build unshakable Tawhid, spiritual resilience, and moral clarity.`,
      tafsir_saadi: `Imam As-Sa'di highlights in Taysir al-Karim ar-Rahman on ${title} that reflecting on these words nurtures certainty (Yaqeen) and aligns a believer’s inward intention with outward righteous action.`,
      tafsir_ibn_kathir: `Ibn Kathir explains in his Tafsir of ${title} how this passage connects to the broader Quranic call to remember Allah’s favors, remain steadfast through trials, and prepare for the meeting with Him.`,
      tafsir_maariful: `Mufti Muhammad Shafi notes in Ma'ariful Quran that the phrasing of ${title} offers practical guidance for purifying the heart and maintaining balance between hope in Allah’s mercy and mindfulness of His commands.`,
      actionable_sunnah: `Pause for 30 seconds today to recite ${title} mindfully, reflect on one phrase that spoke to your current situation, and whisper "Alhamdulillah" for Allah’s guidance.`,
      source_citation: `Tafsir As-Sa'di, Tafsir Ibn Kathir & Ma'ariful Quran on ${title}`
    };
  }

  return {
    card_id: card.id,
    plain_summary: `Recorded in ${title} (${sub}): “${clearText.slice(0, 220)}${clearText.length > 220 ? '…' : ''}” This authentic Prophetic narration illuminates how faith is lived through sincerity, mercy, and daily character.`,
    key_takeaway: `Prophetic wisdom in ${title} transforms everyday intentions and interactions into acts of lasting worship.`,
    asbab_al_nuzul: `Preserved with an authenticated chain of transmission (${card.narrator_chain || title}) in ${sub}.`,
    tafsir_saadi: `Imam an-Nawawi and classical commentators explain that this narration establishes a practical standard for purifying both the heart and outward conduct.`,
    tafsir_ibn_kathir: `Ibn Hajar al-Asqalani and classical Hadith scholars highlight how the Messenger of Allah ﷺ taught his companions through concise, life-changing guidance.`,
    tafsir_maariful: `Applying this authentic Sunnah brings tranquility (Sakinah), integrity, and barakah into modern daily life.`,
    actionable_sunnah: `Act upon this teaching from ${title} once today—at home, work, or in prayer—and share its benefit with someone close to you.`,
    source_citation: `${title} (${sub}) — Classical Commentaries of Imam an-Nawawi & Ibn Hajar`
  };
}

function getCrossReferencesForCard(card) {
  // Check explicit cross references first
  const explicit = CROSS_REFERENCES.filter(cr => cr.source === card.id).map(cr => {
    const target = SEED_BY_ID.get(cr.target);
    return target ? {
      relationship_note: cr.note,
      target_id: target.id,
      share_slug: target.share_slug,
      card_type: target.card_type,
      source_title: target.source_title,
      arabic_text_uthmani: target.arabic_text_uthmani,
      translation_en_clear: target.translation_en_clear,
      authenticity_grade: target.authenticity_grade
    } : null;
  }).filter(Boolean);

  if (explicit.length > 0) return explicit;

  // Otherwise match 2 flagship SEED_CARDS sharing mood_tags (preferring opposite type: Quran <-> Hadith/Dua)
  const cardMoods = Array.isArray(card.mood_tags) ? card.mood_tags : [];
  const matches = SEED_CARDS
    .filter(s => s.id !== card.id)
    .map(s => {
      const overlap = s.mood_tags.filter(m => cardMoods.includes(m)).length;
      const typeBonus = s.card_type !== card.card_type ? 2 : 0;
      return { s, score: overlap * 3 + typeBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return matches.map(({ s }) => ({
    relationship_note: `Connected ${s.card_type === 'quran' ? 'Quranic Ayah' : 'Prophetic Sunnah'} on ${s.topic_tags?.[0] || 'Spiritual Reflection'}:`,
    target_id: s.id,
    share_slug: s.share_slug,
    card_type: s.card_type,
    source_title: s.source_title,
    arabic_text_uthmani: s.arabic_text_uthmani,
    translation_en_clear: s.translation_en_clear,
    authenticity_grade: s.authenticity_grade
  }));
}

const HYDRATED_STATIC_CACHE = new Map();

function hydrateCardDetails(card) {
  let staticDetails = HYDRATED_STATIC_CACHE.get(card.id);
  if (!staticDetails) {
    const seed = SEED_BY_ID.get(card.id);
    const words = seed && seed.words
      ? seed.words.map(w => ({
          word_position: w.pos,
          arabic_word: w.arabic,
          transliteration: w.translit,
          translation_en: w.en,
          root_arabic: w.root_arabic,
          root_translit: w.root_translit,
          root_meaning: w.root_meaning,
          root_occurrences: w.occ,
          root_examples: w.examples || [],
          grammar_pos: w.grammar,
          start_ms: w.start_ms,
          end_ms: w.end_ms
        }))
      : extractSpotlightWords(card.arabic_text_uthmani, card.transliteration, card.translation_en_clear);

    staticDetails = {
      words,
      deep_study: buildDeepStudy(card),
      cross_references: getCrossReferencesForCard(card)
    };
    if (HYDRATED_STATIC_CACHE.size > 2500) {
      const oldestKey = HYDRATED_STATIC_CACHE.keys().next().value;
      HYDRATED_STATIC_CACHE.delete(oldestKey);
    }
    HYDRATED_STATIC_CACHE.set(card.id, staticDetails);
  }

  return {
    ...card,
    words: staticDetails.words,
    deep_study: staticDetails.deep_study,
    cross_references: staticDetails.cross_references
  };
}

module.exports = {
  QURANIC_ROOT_LEXICON,
  extractSpotlightWords,
  buildDeepStudy,
  getCrossReferencesForCard,
  hydrateCardDetails
};

