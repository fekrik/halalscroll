// Halal Scroll — Mood Taxonomy Tagger + Personalized "For You" Ranker
//
// 1. Mood tagging: every card is scored against the 13 mood/theme filters shown in the UI
//    (ids MUST match MOOD_FILTERS in src/main.tsx). Weighted keyword rules run over the English
//    translation + source metadata; each card keeps its top 3 moods above a threshold, and every
//    mood is guaranteed a minimum floor of cards so no filter ever comes back empty.
// 2. Ranking: "For You" builds a per-session ordering from
//      quality prior (discover_weight) + user affinity (bookmarks / practiced moods & collections)
//      + time-of-day fit + seeded exploration noise − recently-seen penalty,
//    then applies a diversity pass so Quran / Hadith / Dua interleave and the same Surah or book
//    never repeats back-to-back. Orderings are cached per session seed so pagination is stable.

const MOOD_TAGGER_VERSION = '2';

// Each rule: [regex, weight]. Text is lower-cased translation + subtitle + source title.
const MOOD_RULES = {
  anxious: [
    [/\b(fear(s|ful|ed)?|afraid|worr(y|ies|ied)|anxi\w*|distress\w*|dread|panic\w*|terrif\w*)\b/g, 2],
    [/\b(tranquil\w*|reassur\w*|sakin\w*|calm\w*|at rest|serenity|security)\b/g, 1.5],
    [/\b(no fear (shall|will) be|neither (shall|will) they grieve|do not fear|fear not)\b/g, 2.5],
    [/\b(ease|relief|reliev\w*|comfort\w*)\b/g, 1]
  ],
  tawbah: [
    [/\b(repent\w*|tawbah|turn(s|ed)? (back )?to (him|allah|your lord) in repentance)\b/g, 3],
    [/\b(forgiv\w*|pardon\w*|seek(s|ing)? forgiveness|istighfar|absolv\w*)\b/g, 2],
    [/\b(sins?|sinn\w*|transgress\w*|wrongdo\w*|misdeeds?|evil deeds?)\b/g, 1]
  ],
  low_iman: [
    [/\b(hearts? (are |were |become |became )?(hardened|sealed|hard)|hypocri\w*|heedless\w*|negligen\w*)\b/g, 2.5],
    [/\b(increase(d|s)? (them |him |you )?in faith|sweetness of faith|faith (increases|wavers)|iman)\b/g, 3],
    [/\b(remembrance of allah|remember allah|dhikr|glorif(y|ies|ied) (allah|your lord)|tasbih)\b/g, 1.5],
    [/\b(doubt\w*|waver\w*|guidance|guide(d|s)? (them|you|us)|led astray|astray)\b/g, 1],
    [/\b(faith|believ(e|er|ers|ed))\b/g, 0.4]
  ],
  grateful: [
    [/\b(thank\w*|gratitude|grateful|ungrateful|shukr|alhamdulillah|praise be to allah|al-hamdu)\b/g, 2.5],
    [/\b(favou?rs?|blessings?|bount(y|ies|iful)|grace)\b/g, 1]
  ],
  grieving: [
    [/\b(griev\w*|grief|sorrow\w*|sad(ness|dened)?|mourn\w*|bereav\w*)\b/g, 2.5],
    [/\b(weep\w*|wept|tears?|cr(y|ied|ying))\b/g, 1.5],
    [/\b(afflict\w*|misfortune\w*|loss of|lost (his|her|their)|to him we (shall |will )?return|death of)\b/g, 2],
    [/\b(calamit\w*)\b/g, 0.8],
    [/\b(death|died|dies|dead)\b/g, 0.6]
  ],
  rizq: [
    [/\b(provision\w*|rizq|sustenance|livelihood|provide(s|d)? for)\b/g, 2.5],
    [/\b(wealth|poverty|poor|needy|debts?|indebted|earn(s|ed|ing)?|trade|merchant\w*|riches)\b/g, 1.2],
    [/\b(charity|sadaqah|spend(s|ing)? (in the way|of what))\b/g, 0.8]
  ],
  decision_making: [
    [/\b(istikhara|seek(s|ing)? (your |allah's )?guidance (in|through)|consult\w*|counsel\w*|shura)\b/g, 3],
    [/\b(decid\w*|decision\w*|choos\w*|choice|resolve(d)?|make up (your|his) mind|determin(e|ed) (upon|on))\b/g, 2],
    [/\b(doubtful (matters|things)|what makes you doubt|uncertain\w*|perplex\w*|confus\w*)\b/g, 2],
    [/\b(wisdom|wise|judg(e|ment|ement) between)\b/g, 0.6]
  ],
  sabr: [
    [/\b(patien(t|ce|tly)|sabr|steadfast\w*|persever\w*|endur\w*)\b/g, 2.5],
    [/\b(trials?|tested|test you|tribulation\w*|hardship\w*|difficult\w*)\b/g, 1.2]
  ],
  tawakkul: [
    [/\b(rel(y|ies|ied|iance) (up)?on|put (your|their|his|my) trust|trust(s|ed)? (in|upon) allah|tawakkul|tawakkal\w*)\b/g, 3],
    [/\b(sufficient for (him|us|me|you)|suffices|disposer of affairs|wakil|best disposer|guardian)\b/g, 2],
    [/\b(trust\w*)\b/g, 0.8]
  ],
  family: [
    [/\b(parents?|mothers?|fathers?|ties of kinship|kinship|kindred|relatives?|famil(y|ies))\b/g, 2],
    [/\b(wi(fe|ves)|husbands?|spouses?|marri\w*|orphans?|daughters?|sons?)\b/g, 1.2],
    [/\b(children|child)\b/g, 0.8]
  ],
  akhlaq: [
    [/\b(manners|character|good conduct|akhlaq|adab|modest\w*|haya)\b/g, 3],
    [/\b(truthful\w*|honest\w*|kind(ness|ly)?|gentle\w*|humil\w*|humble|arrogan\w*|backbit\w*|slander\w*|envy|envious|jealous\w*|anger|angry|neighbou?rs?|smil\w*|lie|lies|lying|liars?)\b/g, 1.5],
    [/\b(good (deeds?|works?)|righteous\w*)\b/g, 0.5]
  ],
  salah: [
    [/\b(pray(er|ers|ed|ing)?|salah|salat|prostrat\w*|bow(ed|ing)? down|ruku|wudu|ablution|mosque|masjid|adhan|call to prayer|qiblah?|rak'?a\w*|takbir)\b/g, 2]
  ],
  akhirah: [
    [/\b(paradise|jannah|hereafter|day of (judgement|judgment|resurrection|reckoning)|resurrect\w*|last day|hell(fire)?|the fire)\b/g, 2],
    [/\b(gardens? (beneath|under) which rivers|eternal\w*|abid(e|ing) (therein|forever)|scale(s)? of|reckoning)\b/g, 1.5],
    [/\b(reward\w*|punish\w*)\b/g, 0.5]
  ]
};

const MOOD_IDS = Object.keys(MOOD_RULES);
const MIN_SCORE = 2;          // a card needs at least one strong hit to be tagged
const MAX_MOODS_PER_CARD = 3;
const MIN_CARDS_PER_MOOD = 150; // every filter is guaranteed at least this many cards

// Mood ids hand-assigned to the 16 flagship seed cards, plus legacy ingestion tag aliases
const LEGACY_ALIASES = {
  seeking_forgiveness: 'tawbah',
  parents: 'family',
  hopeful: null,
  burnout: null,
  lonely: null
};

function scoreMoodsForText(text) {
  const lower = String(text || '').toLowerCase();
  const scores = {};
  for (const mood of MOOD_IDS) {
    let s = 0;
    for (const [re, w] of MOOD_RULES[mood]) {
      re.lastIndex = 0;
      const hits = lower.match(re);
      if (hits) s += w * Math.min(hits.length, 3); // cap repeated hits so long passages don't dominate
    }
    if (s > 0) scores[mood] = s;
  }
  // Normalize slightly by length so a 5-word Ayah and a 300-word Hadith compete fairly
  const words = lower.split(/\s+/).length;
  const lengthFactor = 1 / Math.max(1, Math.log10(Math.max(words, 10)) - 0.3);
  for (const k of Object.keys(scores)) scores[k] = +(scores[k] * lengthFactor * 1.7).toFixed(3);
  return scores;
}

/**
 * Tags every card. `cards` = [{ id, text, seedMoods: string[] }].
 * Returns Map<id, { mood: score }> containing only the moods kept for that card.
 */
function tagAllCards(cards) {
  const raw = new Map();
  for (const c of cards) {
    const scores = scoreMoodsForText(c.text);
    for (const m of c.seedMoods || []) {
      const mapped = m in LEGACY_ALIASES ? LEGACY_ALIASES[m] : m;
      if (mapped && MOOD_RULES[mapped]) scores[mapped] = Math.max(scores[mapped] || 0, 6); // curated tags win
    }
    raw.set(c.id, scores);
  }

  // Pass 1: keep top-N moods above threshold per card
  const kept = new Map();
  for (const [id, scores] of raw) {
    const top = Object.entries(scores)
      .filter(([, s]) => s >= MIN_SCORE)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_MOODS_PER_CARD);
    kept.set(id, Object.fromEntries(top));
  }

  // Pass 2: guarantee a floor per mood using the best remaining candidates
  for (const mood of MOOD_IDS) {
    let count = 0;
    for (const m of kept.values()) if (m[mood]) count++;
    if (count >= MIN_CARDS_PER_MOOD) continue;
    const candidates = [];
    for (const [id, scores] of raw) {
      if (scores[mood] && !kept.get(id)[mood]) candidates.push([id, scores[mood]]);
    }
    candidates.sort((a, b) => b[1] - a[1]);
    for (const [id, s] of candidates.slice(0, MIN_CARDS_PER_MOOD - count)) {
      kept.get(id)[mood] = s;
    }
  }
  return kept;
}

// ---------- Seeded randomness ----------
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seededUnit(seed, id) {
  // xorshift over FNV hash → uniform [0,1)
  let x = hashString(seed + '|' + id) || 1;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  return (x >>> 0) / 4294967296;
}

function timeWindowForHour(hour) {
  if (hour == null || Number.isNaN(hour)) return null;
  if (hour >= 4 && hour < 11) return 'morning';
  if (hour >= 16 && hour < 21) return 'evening';
  if (hour >= 21 || hour < 4) return 'sleep';
  return null;
}

/**
 * Builds a full diversified ordering of card indexes.
 * meta: [{ id, card_type, collection_slug, surah_or_book_num, discover_weight, time_window, moods: {mood:score} }]
 * opts: { seed, mood, affinity: { moods:{}, collections:{}, types:{} }, seen: Map<id, daysAgo>, hour }
 */
function rankCards(meta, opts) {
  const { seed, mood = null, affinity = null, seen = new Map(), hour = null } = opts;
  const window = timeWindowForHour(hour);

  const scored = [];
  for (let i = 0; i < meta.length; i++) {
    const c = meta[i];
    let moodFit = 0;
    if (mood) {
      moodFit = c.moods[mood];
      if (!moodFit) continue;
    }

    const quality = Math.log(Math.max(c.discover_weight || 1, 1.01)); // 10→2.30, 5.5→1.70, 4.5→1.50, 2.2→0.79
    let s = mood ? Math.min(moodFit, 8) * 0.35 + quality * 0.6 : quality;

    if (affinity) {
      let a = 0;
      for (const [m, sc] of Object.entries(c.moods)) a += (affinity.moods[m] || 0) * Math.min(sc, 6) / 6;
      a += (affinity.collections[c.collection_slug] || 0) * 0.5;
      a += (affinity.types[c.card_type] || 0) * 0.3;
      s += Math.min(a, 1.2);
    }

    if (window && c.time_window === window) s += 0.8;

    const daysAgo = seen.get(c.id);
    if (daysAgo != null) s -= 2.5 * Math.exp(-daysAgo / 7);

    s += seededUnit(seed, c.id) * 1.6; // exploration: reshuffles every session, strong enough to mix tiers
    scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s);

  // Diversity pass: no 3 of the same card_type in a row, no same collection+surah/book within last 4
  const out = [];
  const pending = [];
  const recent = [];
  const ok = (c) => {
    const n = out.length;
    if (n >= 2) {
      const t1 = meta[out[n - 1]].card_type;
      const t2 = meta[out[n - 2]].card_type;
      if (t1 === c.card_type && t2 === c.card_type) return false;
    }
    const key = c.collection_slug + ':' + (c.surah_or_book_num ?? '');
    return !recent.includes(key);
  };
  const push = (idx) => {
    out.push(idx);
    const c = meta[idx];
    recent.push(c.collection_slug + ':' + (c.surah_or_book_num ?? ''));
    if (recent.length > 4) recent.shift();
  };

  for (const { i } of scored) {
    // Try deferred cards first so they aren't starved
    for (let p = 0; p < pending.length; p++) {
      if (ok(meta[pending[p]])) {
        push(pending[p]);
        pending.splice(p, 1);
        p = -1;
      }
    }
    if (ok(meta[i])) push(i);
    else pending.push(i);
    if (pending.length > 60) push(pending.shift()); // never stall
  }
  for (const idx of pending) push(idx);
  return out;
}

module.exports = {
  MOOD_TAGGER_VERSION,
  MOOD_IDS,
  scoreMoodsForText,
  tagAllCards,
  rankCards,
  seededUnit
};
