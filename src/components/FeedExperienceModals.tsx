import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  X,
  Plus,
  BookOpen,
  Volume2,
  Compass,
  Heart,
  MessageCircle,
  Send,
  Search,
  Lock,
  Trash2,
  ChevronRight,
  Layers,
  Smartphone
} from 'lucide-react';
import { soundEngine } from '../audioEngine';
import { CardWord, FeedCard } from '../types';

export interface HighlightGroup {
  id: string;
  label: string;
  subtitle: string;
  bg: string;
  border: string;
  color: string;
  enPatterns: string[];
  arPatterns: string[];
}

export const SACRED_HIGHLIGHT_GROUPS: HighlightGroup[] = [
  {
    id: 'allah',
    label: 'Allah & Divine Names',
    subtitle: 'Allah, Lord, Most Merciful (اللَّه • رَبّ • الرَّحْمَٰن)',
    bg: 'var(--hl-allah-bg)',
    border: 'var(--hl-allah-border)',
    color: 'var(--hl-allah-text)',
    enPatterns: ['allah', 'lord', 'almighty', 'compassionate', 'all-merciful', 'creator', 'most high'],
    arPatterns: ['الله', 'لله', 'بالله', 'تالله', 'والله', 'رب', 'ربك', 'ربنا', 'ربكم', 'ربهم', 'الرحمن', 'الرحيم', 'الغفور', 'العزيز', 'العليم', 'الحكيم']
  },
  {
    id: 'prophet',
    label: 'Prophet & Messenger ﷺ',
    subtitle: 'Prophet, Messenger, Muhammad (مُحَمَّد • رَسُول • نَبِيّ)',
    bg: 'var(--hl-prophet-bg)',
    border: 'var(--hl-prophet-border)',
    color: 'var(--hl-prophet-text)',
    enPatterns: ['prophet', 'messenger', 'muhammad', 'apostle'],
    arPatterns: ['محمد', 'رسول', 'الرسول', 'رسوله', 'نبي', 'النبي', 'النبيين', 'المرسلين']
  },
  {
    id: 'mercy',
    label: 'Mercy & Forgiveness',
    subtitle: 'Mercy, Forgive, Repentance (رَحْمَة • مَغْفِرَة • تَوْبَة)',
    bg: 'var(--hl-mercy-bg)',
    border: 'var(--hl-mercy-border)',
    color: 'var(--hl-mercy-text)',
    enPatterns: ['mercy', 'merciful', 'forgive', 'forgiveness', 'forgiving', 'repent', 'repentance', 'grace'],
    arPatterns: ['رحمة', 'رحمتي', 'رحمتك', 'مغفرة', 'يغفر', 'غفر', 'توبة', 'تاب', 'عفو']
  },
  {
    id: 'sabr',
    label: 'Patience, Relief & Peace',
    subtitle: 'Patience, Ease, Peace, Trust (صَبْر • يُسْر • سَلَام)',
    bg: 'var(--hl-sabr-bg)',
    border: 'var(--hl-sabr-border)',
    color: 'var(--hl-sabr-text)',
    enPatterns: ['patience', 'patient', 'steadfast', 'ease', 'relief', 'peace', 'tranquility', 'trust'],
    arPatterns: ['صبر', 'صبرا', 'الصبر', 'الصابرين', 'يسر', 'يسرا', 'اليسر', 'سكينة', 'سلام', 'توكل', 'يتوكل']
  },
  {
    id: 'akhirah',
    label: 'Paradise & Hereafter',
    subtitle: 'Paradise, Jannah, Hereafter (جَنَّة • الْآخِرَة)',
    bg: 'var(--hl-akhirah-bg)',
    border: 'var(--hl-akhirah-border)',
    color: 'var(--hl-akhirah-text)',
    enPatterns: ['paradise', 'jannah', 'garden', 'gardens', 'hereafter', 'eternal'],
    arPatterns: ['جنة', 'الجنة', 'جنات', 'الآخرة', 'الفردوس']
  }
];

/**
 * Source-Aware Color-Coding (Partner Brief Section 2):
 * - Quran: Emerald Green (clearly marks Quranic verses as the word of Allah; Quranic Duas starting with Rabbana/Rabbi get a gold supplication badge)
 * - Hadith: Deep Red / Crimson (distinguishes Prophet Muhammad's ﷺ reported words from narrator text)
 * - Duas: Gold (makes supplications immediately recognizable)
 */
export function getSacredContentIdentity(card: {
  card_type: string;
  arabic_text_uthmani?: string;
  translation_en_clear?: string;
  translation_clear_quran?: string;
}) {
  const isQuranicDua =
    card.card_type === 'quran' &&
    (/^(رَبَّنَا|رَبِّ|قَالَ رَبِّ|قَالَا رَبَّنَا)/.test((card.arabic_text_uthmani || '').trim()) ||
      /^(Our Lord|My Lord)/i.test((card.translation_en_clear || card.translation_clear_quran || '').trim()));

  if (card.card_type === 'quran') {
    return {
      id: isQuranicDua ? 'quran_dua' : 'quran',
      badgeLabel: isQuranicDua ? 'Quran • Supplication' : 'Quran • Verse',
      accentColor: isQuranicDua ? 'var(--sacred-dua-color)' : 'var(--sacred-quran-color)',
      textTint: isQuranicDua ? 'var(--sacred-dua-color)' : 'var(--sacred-quran-color)',
      pillBg: isQuranicDua ? 'var(--hl-allah-bg)' : 'var(--hl-mercy-bg)',
      pillBorder: isQuranicDua ? 'var(--hl-allah-border)' : 'var(--hl-mercy-border)',
      quoteBg: isQuranicDua ? 'rgba(217, 119, 6, 0.06)' : 'rgba(16, 185, 129, 0.06)',
      quoteBorder: isQuranicDua ? 'var(--hl-allah-border)' : 'var(--hl-mercy-border)'
    };
  }

  if (card.card_type === 'hadith') {
    return {
      id: 'hadith',
      badgeLabel: 'Hadith • Prophetic Quote',
      accentColor: 'var(--sacred-hadith-color)',
      textTint: 'var(--sacred-hadith-color)',
      pillBg: 'var(--hl-prophet-bg)',
      pillBorder: 'var(--hl-prophet-border)',
      quoteBg: 'rgba(225, 29, 72, 0.06)',
      quoteBorder: 'var(--hl-prophet-border)'
    };
  }

  return {
    id: 'dua',
    badgeLabel: card.card_type === 'dua' ? 'Dua • Supplication' : 'Seerah • Prophetic Biography',
    accentColor: 'var(--sacred-dua-color)',
    textTint: 'var(--sacred-dua-color)',
    pillBg: 'var(--hl-allah-bg)',
    pillBorder: 'var(--hl-allah-border)',
    quoteBg: 'rgba(217, 119, 6, 0.06)',
    quoteBorder: 'var(--hl-allah-border)'
  };
}

/**
 * Separates a Hadith's narrator intro (isnad) and closing text from the Prophet Muhammad's ﷺ
 * direct reported words (matn) so ONLY direct Prophetic speech is highlighted in red.
 */
export function splitHadithNarratorAndQuote(text: string): {
  narratorIntro: string;
  propheticQuote: string;
  closingText: string;
} {
  if (!text) return { narratorIntro: '', propheticQuote: '', closingText: '' };

  // 1. Check if there is an explicit quoted statement inside "..." or “...”
  const quoteMatch = text.match(/^(.*?)["“«]([^"”»]{8,})["”»](.*)$/s);
  if (quoteMatch && quoteMatch[1].trim().length > 3) {
    return {
      narratorIntro: quoteMatch[1].trim(),
      propheticQuote: quoteMatch[2].trim(),
      closingText: quoteMatch[3].trim()
    };
  }

  // 2. Check if there is an opening quote that was truncated at the end ("... or “...)
  const openQuoteMatch = text.match(/^(.*?)["“«]([^"”»]{8,})$/s);
  if (openQuoteMatch && openQuoteMatch[1].trim().length > 3) {
    return {
      narratorIntro: openQuoteMatch[1].trim(),
      propheticQuote: openQuoteMatch[2].trim(),
      closingText: ''
    };
  }

  // 3. Check for narrator prefix ending in "said:" / "says:" / "said," / "reported:"
  const enSaidMatch = text.match(
    /^(.*?\b(?:Messenger of Allah|Allah['’]s Messenger|Prophet|he)\b[^:"]*?\b(?:said|says|stated|declared)\s*[:,]\s*)(.+)$/is
  );
  if (enSaidMatch) {
    const rest = enSaidMatch[2].trim();
    const trailingCitation = rest.match(/^(.*?)(\s*(?:\[[^\]]+\]|\((?:Bukhari|Muslim|Agreed|Related|Narrated)[^)]+\))\.?)$/is);
    if (trailingCitation) {
      return {
        narratorIntro: enSaidMatch[1].trim(),
        propheticQuote: trailingCitation[1].trim().replace(/^["“”']+|["“”']+$/g, ''),
        closingText: trailingCitation[2].trim()
      };
    }
    return {
      narratorIntro: enSaidMatch[1].trim(),
      propheticQuote: rest.replace(/^["“”']+|["“”']+$/g, ''),
      closingText: ''
    };
  }

  // 4. Check for "On the authority of ... who said:" or "Narrated ...:"
  const genericNarratorColon = text.match(/^((?:On the authority of|Narrated|Reported by|It is narrated on|Abu |Ibn |Umar |Aisha |Anas )[^:]{4,140}:\s*)(.+)$/is);
  if (genericNarratorColon) {
    return {
      narratorIntro: genericNarratorColon[1].trim(),
      propheticQuote: genericNarratorColon[2].trim().replace(/^["“”']+|["“”']+$/g, ''),
      closingText: ''
    };
  }

  // 5. If the text starts with third-person descriptive narrative ("The Prophet used to...", "A man came to...") without direct speech, keep narrative neutral
  if (/^(?:A man|Some people|We were sitting|While we were|I came to|I asked|The Messenger of Allah used to|The Prophet used to)/i.test(text.trim())) {
    const innerColon = text.match(/^([^:]+:\s*)(.+)$/s);
    if (innerColon) {
      return {
        narratorIntro: innerColon[1].trim(),
        propheticQuote: innerColon[2].trim().replace(/^["“”']+|["“”']+$/g, ''),
        closingText: ''
      };
    }
  }

  return {
    narratorIntro: '',
    propheticQuote: text.replace(/^["“”']+|["“”']+$/g, ''),
    closingText: ''
  };
}

/**
 * Separates a Dua's introductory/narrator context from the actual supplication words
 * so ONLY the actual supplication is highlighted in gold.
 */
export function splitDuaIntroAndSupplication(text: string): {
  introText: string;
  supplicationText: string;
  closingText: string;
} {
  if (!text) return { introText: '', supplicationText: '', closingText: '' };

  // 1. Explicit quoted supplication inside "..." or “...”
  const quoteMatch = text.match(/^(.*?)["“«]([^"”»]{6,})["”»](.*)$/s);
  if (quoteMatch && quoteMatch[1].trim().length > 2) {
    return {
      introText: quoteMatch[1].trim(),
      supplicationText: quoteMatch[2].trim(),
      closingText: quoteMatch[3].trim()
    };
  }

  // 2. Colon before supplication ("...used to say: O Allah...")
  const colonMatch = text.match(/^([^:]{4,120}:\s*)(.+)$/s);
  if (colonMatch) {
    return {
      introText: colonMatch[1].trim(),
      supplicationText: colonMatch[2].trim().replace(/^["“”']+|["“”']+$/g, ''),
      closingText: ''
    };
  }

  // 3. Detect where vocative supplication starts ("O Allah", "Our Lord", "My Lord", "I seek refuge", "In the Name of Allah")
  const vocativeMatch = text.match(
    /^(.*?\.\s+)((?:O Allah|Our Lord|My Lord|O Ever-Living|I seek refuge|In the Name of Allah|Glory be to|There is no deity).+)$/is
  );
  if (vocativeMatch && vocativeMatch[1].trim().length > 4) {
    return {
      introText: vocativeMatch[1].trim(),
      supplicationText: vocativeMatch[2].trim(),
      closingText: ''
    };
  }

  return {
    introText: '',
    supplicationText: text.replace(/^["“”']+|["“”']+$/g, ''),
    closingText: ''
  };
}

/**
 * Computes a per-token boolean mask for Arabic text on Hadith or Dua cards:
 * - For Hadith: returns true ONLY for tokens that belong to the direct Prophetic quote (matn),
 *   keeping narrator chains (isnad) and closing citations (e.g. رواه البخاري) neutral.
 * - For Dua: returns true ONLY for tokens that belong to the actual supplication,
 *   keeping any introductory narrative (e.g. كان النبي إذا...) neutral.
 */
export function getArabicSacredQuoteTokenMask(tokens: string[], cardType: string): boolean[] {
  const n = tokens.length;
  if (n === 0) return [];
  if (cardType === 'quran') return tokens.map(() => true);

  const norm = (s: string) =>
    (s || '')
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED،؟:؛.!۝ۚۗۖۙۘ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .trim();

  // Check if tokens contain explicit Arabic guillemets « ... » or quotes " ... "
  let openQuoteIdx = -1;
  let closeQuoteIdx = -1;
  for (let i = 0; i < n; i++) {
    if (openQuoteIdx === -1 && /[«"“]/.test(tokens[i])) openQuoteIdx = i;
    if (openQuoteIdx !== -1 && /[»"”]/.test(tokens[i])) closeQuoteIdx = i;
  }

  // Detect trailing citation start (e.g. رواه البخاري / متفق عليه / أخرجه مسلم)
  let endExclusive = n;
  for (let i = Math.max(2, n - 8); i < n; i++) {
    const w = norm(tokens[i]);
    if (w === 'رواه' || w === '[رواه' || w === 'متفق' || w === 'اخرجه') {
      endExclusive = i;
      break;
    }
  }

  if (openQuoteIdx !== -1) {
    const stopIdx = closeQuoteIdx >= openQuoteIdx ? Math.min(closeQuoteIdx + 1, endExclusive) : endExclusive;
    return tokens.map((_, idx) => idx >= openQuoteIdx && idx < stopIdx);
  }

  let startIdx = 0;

  if (cardType === 'hadith') {
    // Look for narrator intro keywords (عن / حدثنا / سمعت / قال رسول الله / قال النبي)
    const firstWord = norm(tokens[0]);
    const hasIsnadPrefix =
      firstWord === 'عن' ||
      firstWord === 'حدثنا' ||
      firstWord === 'اخبرنا' ||
      firstWord === 'سمعت' ||
      firstWord === 'ان' ||
      firstWord === 'قال';

    // Find the colon or speech verb ("قال:" / "يقول:") that introduces the Prophet's direct speech
    let speechStart = -1;
    const scanLimit = Math.min(n - 2, 26);
    for (let i = 0; i < scanLimit; i++) {
      const raw = tokens[i];
      const w = norm(raw);
      if (raw.includes(':') && i >= 1) {
        speechStart = i + 1;
      } else if ((w === 'قال' || w === 'يقول' || w === 'فقال') && i >= 2) {
        speechStart = i + 1;
      }
    }
    if (speechStart > 0 && speechStart < endExclusive) {
      startIdx = speechStart;
    } else if (hasIsnadPrefix && n > 6) {
      // Fallback: if starts with عن ... رضي الله عنه, skip the companion name & blessing
      for (let i = 1; i < Math.min(n - 2, 16); i++) {
        const w = norm(tokens[i]);
        if (w === 'عنه' || w === 'عنهما' || w === 'عنها' || w === 'وسلم') {
          startIdx = Math.min(endExclusive - 1, i + 1);
        }
      }
    }
  } else if (cardType === 'dua' || cardType === 'seerah') {
    // For Dua/Seerah, check if there is a narrative intro before colon or before اللهم / ربنا / رب / أعوذ / بسم / سبحان / لا إله
    const firstWord = norm(tokens[0]);
    const startsDirectlyWithDua =
      firstWord === 'اللهم' ||
      firstWord === 'ربنا' ||
      firstWord === 'رب' ||
      firstWord === 'ربي' ||
      firstWord === 'اعوذ' ||
      firstWord === 'بسم' ||
      firstWord === 'سبحان' ||
      firstWord === 'لا' ||
      firstWord === 'حسبنا' ||
      firstWord === 'يا';

    if (!startsDirectlyWithDua) {
      for (let i = 0; i < Math.min(n - 1, 20); i++) {
        const raw = tokens[i];
        const w = norm(raw);
        if (raw.includes(':')) {
          startIdx = i + 1;
          break;
        }
        if (
          i > 0 &&
          (w === 'اللهم' ||
            w === 'ربنا' ||
            w === 'رب' ||
            w === 'اعوذ' ||
            w === 'سبحان' ||
            w === 'يا')
        ) {
          startIdx = i;
          break;
        }
      }
    }
  }

  return tokens.map((_, idx) => idx >= startIdx && idx < endExclusive);
}

const ARABIC_TO_LATIN_MAP: Record<string, string> = {
  'ا': 'ā', 'أ': 'a', 'إ': 'i', 'آ': 'ā', 'ٱ': 'a', 'ء': '’', 'ؤ': '’', 'ئ': '’',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': '‘', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'h', 'و': 'w', 'ي': 'y', 'ى': 'ā',
  '\u064E': 'a', '\u064F': 'u', '\u0650': 'i', '\u0670': 'ā'
};

const COMMON_ARABIC_LEXICON: Record<string, { translit: string; meaning: string; rootAr: string; rootTr: string; rootMeaning: string; pos: string }> = {
  'الله': { translit: 'Allāh', meaning: 'Allah, the One Almighty Creator', rootAr: 'أ ل ه', rootTr: 'A-L-H', rootMeaning: 'To worship, adore, and turn to in awe and love', pos: 'Proper Divine Name (Ism al-Jalālah)' },
  'لله': { translit: 'lillāhi', meaning: 'belongs to Allah / for Allah', rootAr: 'أ ل ه', rootTr: 'A-L-H', rootMeaning: 'To worship, adore, and turn to in awe and love', pos: 'Preposition + Divine Name' },
  'بالله': { translit: 'billāhi', meaning: 'in Allah / by Allah', rootAr: 'أ ل ه', rootTr: 'A-L-H', rootMeaning: 'To worship, adore, and turn to in awe and love', pos: 'Preposition + Divine Name' },
  'الرحمن': { translit: 'ar-Raḥmān', meaning: 'The Entirely Merciful', rootAr: 'ر ح م', rootTr: 'R-Ḥ-M', rootMeaning: 'All-encompassing womb-like mercy and compassion', pos: 'Divine Attribute (Intensive Form)' },
  'الرحيم': { translit: 'ar-Raḥīm', meaning: 'The Especially Merciful', rootAr: 'ر ح م', rootTr: 'R-Ḥ-M', rootMeaning: 'Continuous, gentle mercy bestowed upon creation', pos: 'Divine Attribute' },
  'رب': { translit: 'Rabb', meaning: 'Lord, Sustainer, and Nurturer', rootAr: 'ر ب ب', rootTr: 'R-B-B', rootMeaning: 'To nurture, sustain, and bring to perfection stage by stage', pos: 'Noun (Mudāf)' },
  'ربنا': { translit: 'Rabbanā', meaning: 'Our Lord and Sustainer', rootAr: 'ر ب ب', rootTr: 'R-B-B', rootMeaning: 'To nurture, sustain, and bring to perfection', pos: 'Vocative Noun + Pronoun' },
  'ربي': { translit: 'Rabbī', meaning: 'My Lord and Sustainer', rootAr: 'ر ب ب', rootTr: 'R-B-B', rootMeaning: 'To nurture, sustain, and bring to perfection', pos: 'Vocative Noun + 1st Person Pronoun' },
  'اللهم': { translit: 'Allāhumma', meaning: 'O Allah (Sacred Vocative)', rootAr: 'أ ل ه', rootTr: 'A-L-H', rootMeaning: 'Direct supplication invoking all Divine Names', pos: 'Vocative Divine Invocation' },
  'رسول': { translit: 'Rasūl', meaning: 'Messenger', rootAr: 'ر س ل', rootTr: 'R-S-L', rootMeaning: 'To send forth with a weighty message and mission', pos: 'Noun' },
  'النبي': { translit: 'an-Nabī', meaning: 'The Prophet ﷺ', rootAr: 'ن ب أ', rootTr: 'N-B-’', rootMeaning: 'Elevated news from the unseen; one who conveys divine tidings', pos: 'Definite Noun' },
  'قال': { translit: 'qāla', meaning: 'he said / declared', rootAr: 'ق و ل', rootTr: 'Q-W-L', rootMeaning: 'To speak, articulate, and express truth', pos: 'Past Verb (3rd Person Singular)' },
  'ان': { translit: 'inna', meaning: 'indeed / truly', rootAr: 'أ ن ن', rootTr: '’ -N-N', rootMeaning: 'Particle of certainty and emphasis', pos: 'Emphatic Particle (Ḥarf Tawkīd)' },
  'انما': { translit: 'innamā', meaning: 'only / exclusively', rootAr: 'أ ن ن', rootTr: '’ -N-N', rootMeaning: 'Particle of restriction and emphasis (Ḥaṣr)', pos: 'Restrictive Particle' },
  'الاعمال': { translit: 'al-a‘māl', meaning: 'the actions / deeds', rootAr: 'ع م ل', rootTr: '‘-M-L', rootMeaning: 'Purposeful work, action, and conscious effort', pos: 'Definite Plural Noun' },
  'بالنيات': { translit: 'bin-niyyāt', meaning: 'by intentions', rootAr: 'ن و ي', rootTr: 'N-W-Y', rootMeaning: 'The seed-core and unseen aim of the heart', pos: 'Preposition + Plural Noun' },
  'قلب': { translit: 'qalb', meaning: 'heart', rootAr: 'ق ل ب', rootTr: 'Q-L-B', rootMeaning: 'To turn, transform, and feel at the innermost core', pos: 'Noun' },
  'قلوب': { translit: 'qulūb', meaning: 'hearts', rootAr: 'ق ل ب', rootTr: 'Q-L-B', rootMeaning: 'To turn, transform, and feel at the innermost core', pos: 'Plural Noun' },
  'صبر': { translit: 'ṣabr', meaning: 'patience / steadfastness', rootAr: 'ص ب ر', rootTr: 'Ṣ-B-R', rootMeaning: 'Holding firm with serenity and trust during trial', pos: 'Verbal Noun (Maṣdar)' },
  'يسرا': { translit: 'yusrā', meaning: 'ease / relief', rootAr: 'ي س ر', rootTr: 'Y-S-R', rootMeaning: 'Gentle unfolding, facility, and abundance of relief', pos: 'Indefinite Accusative Noun' },
  'العسر': { translit: 'al-‘usr', meaning: 'the hardship / difficulty', rootAr: 'ع س ر', rootTr: '‘-S-R', rootMeaning: 'Tightness or constriction that gives way to ease', pos: 'Definite Genitive Noun' }
};

/**
 * Resolves ANY tapped Arabic token on a card to its specific CardWord entry
 * (either matching card.words or synthesizing an accurate morphological entry for that exact tapped token),
 * fixing Item 11 so tapping any Arabic word always opens THAT word's meaning & trilateral root.
 */
export function resolveTappedArabicWord(
  rawTok: string,
  tokenIndex: number,
  card: FeedCard,
  translationText: string
): CardWord {
  const cleanPunct = (s?: string) =>
    (s || '').replace(/[،؟:؛.!۝ۚۗۖۙۘ«»"“”'’()\[\]]/g, '').trim();
  const cleanedRaw = cleanPunct(rawTok);
  const normTapped = normalizeArabicForMatch(cleanedRaw);

  // 1. Try exact or stem match in card.words
  const words = card.words || [];
  for (const w of words) {
    const cw = normalizeArabicForMatch(cleanPunct(w.arabic_word));
    if (cw && (cw === normTapped || (normTapped.length >= 3 && (cw.includes(normTapped) || normTapped.includes(cw))))) {
      return w;
    }
  }

  // 2. Check common classical Arabic lexicon (direct or after stripping single-letter conjunction و / ف / ب / ل)
  const strippedConj = normTapped.replace(/^[وفبلك]/, '');
  const lexEntry = COMMON_ARABIC_LEXICON[normTapped] || COMMON_ARABIC_LEXICON[strippedConj];

  // 3. Extract 3-letter root letters from the Arabic token
  const extractThreeLetterRoot = (normWord: string): { rootAr: string; rootTr: string } => {
    let stem = normWord
      .replace(/^(?:وال|فال|بال|كال|لل|ال|و|ف|ب|ل)/, '')
      .replace(/(?:وهم|هم|هما|هن|كم|كن|نا|ها|ون|ين|ات|ان|تم|تن|وا|ه|ي|ك)$/, '');
    if (stem.length > 3) {
      stem = stem.replace(/^[أإآيتنم]/, '');
    }
    if (stem.length > 3) {
      stem = stem.replace(/[اوي]/g, '');
    }
    const chars = Array.from(stem.length >= 3 ? stem.slice(0, 3) : (normWord.replace(/^ال/, '') + 'ءءء').slice(0, 3));
    const rootAr = chars.join(' ');
    const rootTr = chars
      .map(c => (ARABIC_TO_LATIN_MAP[c] || c).toUpperCase())
      .join('-');
    return { rootAr, rootTr };
  };

  // 4. Transliterate the tapped Arabic word with its harakat
  const transliterateToken = (ar: string): string => {
    let out = '';
    for (const ch of Array.from(ar)) {
      if (ARABIC_TO_LATIN_MAP[ch]) out += ARABIC_TO_LATIN_MAP[ch];
    }
    return out || 'kalimah';
  };

  // 5. Estimate aligned English gloss from the card's translation at the relative token position
  const estimateContextualGloss = (): string => {
    const cleanEn = (translationText || card.translation_en_clear || '')
      .replace(/^["“«]|["”»]$/g, '')
      .trim();
    if (!cleanEn) return 'Sacred term in this passage';
    const arWords = (card.arabic_text_uthmani || '').split(/\s+/).filter(Boolean);
    const enWords = cleanEn.split(/\s+/).filter(Boolean);
    if (enWords.length === 0) return 'Sacred term in this passage';
    const ratio = Math.min(1, Math.max(0, tokenIndex / Math.max(1, arWords.length)));
    const center = Math.min(enWords.length - 1, Math.floor(ratio * enWords.length));
    const start = Math.max(0, center - 1);
    const snippet = enWords
      .slice(start, Math.min(enWords.length, start + 3))
      .join(' ')
      .replace(/^[,.;:!?("“]+|[,.;:!?)”"]+$/g, '');
    return snippet || cleanEn.slice(0, 36);
  };

  if (lexEntry) {
    return {
      word_position: 1000 + tokenIndex,
      arabic_word: cleanedRaw || rawTok,
      transliteration: lexEntry.translit,
      translation_en: lexEntry.meaning,
      root_arabic: lexEntry.rootAr,
      root_translit: lexEntry.rootTr,
      root_meaning: lexEntry.rootMeaning,
      root_occurrences: 0,
      root_examples: [`From ${card.source_title}`],
      grammar_pos: lexEntry.pos,
      start_ms: 0,
      end_ms: 800
    };
  }

  const { rootAr, rootTr } = extractThreeLetterRoot(normTapped || cleanedRaw);
  const gloss = estimateContextualGloss();
  return {
    word_position: 1000 + tokenIndex,
    arabic_word: cleanedRaw || rawTok,
    transliteration: transliterateToken(cleanedRaw || rawTok),
    translation_en: gloss,
    root_arabic: rootAr,
    root_translit: rootTr,
    root_meaning: `Classical Arabic root (${rootAr}) anchoring the meaning "${gloss}" in ${card.source_title}`,
    root_occurrences: 0,
    root_examples: [`${card.source_title} — “${(translationText || card.translation_en_clear || '').slice(0, 90)}…”`],
    grammar_pos: 'Classical Arabic Lexical Form',
    start_ms: 0,
    end_ms: 800
  };
}

function normalizeArabicForMatch(input: string): string {
  return (input || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED،؟:؛.!۝ۚۗۖۙۘ"“”'’()\[\]]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function normalizeEnglishForMatch(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, '')
    .replace(/'s$/g, '')
    .replace(/’s$/g, '')
    .trim();
}

export function matchWordHighlight(
  word: string,
  lang: 'ar' | 'en',
  activeGroupIds: string[],
  customWords: string[]
): { bg: string; border: string; color: string; label: string } | null {
  if (!word) return null;
  if (activeGroupIds.length === 0 && customWords.length === 0) return null;

  if (lang === 'ar') {
    const normAr = normalizeArabicForMatch(word);
    if (!normAr) return null;
    for (const grp of SACRED_HIGHLIGHT_GROUPS) {
      if (!activeGroupIds.includes(grp.id)) continue;
      for (const pat of grp.arPatterns) {
        const normPat = normalizeArabicForMatch(pat);
        if (normAr === normPat || (normPat.length >= 3 && (normAr === 'و' + normPat || normAr === 'ف' + normPat || normAr === 'ب' + normPat || normAr === 'ل' + normPat))) {
          return { bg: grp.bg, border: grp.border, color: grp.color, label: grp.label };
        }
      }
    }
    for (const cw of customWords) {
      const normCw = normalizeArabicForMatch(cw);
      if (normCw && normCw.length >= 2 && (normAr === normCw || normAr.includes(normCw))) {
        return {
          bg: 'var(--hl-custom-bg)',
          border: 'var(--hl-custom-border)',
          color: 'var(--hl-custom-text)',
          label: `Custom: ${cw}`
        };
      }
    }
  } else {
    const normEn = normalizeEnglishForMatch(word);
    if (!normEn) return null;
    for (const grp of SACRED_HIGHLIGHT_GROUPS) {
      if (!activeGroupIds.includes(grp.id)) continue;
      for (const pat of grp.enPatterns) {
        if (normEn === pat) {
          return { bg: grp.bg, border: grp.border, color: grp.color, label: grp.label };
        }
      }
    }
    for (const cw of customWords) {
      const normCw = normalizeEnglishForMatch(cw);
      if (normCw && normCw.length >= 2 && normEn === normCw) {
        return {
          bg: 'var(--hl-custom-bg)',
          border: 'var(--hl-custom-border)',
          color: 'var(--hl-custom-text)',
          label: `Custom: ${cw}`
        };
      }
    }
  }

  return null;
}

export const WordHighlighterModal: React.FC<{
  sacredColorCodingEnabled: boolean;
  onToggleSacredColorCoding: () => void;
  activeGroupIds: string[];
  customWords: string[];
  onToggleGroup: (id: string) => void;
  onAddCustomWord: (word: string) => void;
  onRemoveCustomWord: (word: string) => void;
  onClose: () => void;
}> = ({
  sacredColorCodingEnabled,
  onToggleSacredColorCoding,
  activeGroupIds,
  customWords,
  onToggleGroup,
  onAddCustomWord,
  onRemoveCustomWord,
  onClose
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    soundEngine.triggerHaptic('softSuccess');
    onAddCustomWord(trimmed);
    setInputVal('');
  };

  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '82%', maxHeight: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab-handle" />
        <div style={{
          padding: '6px 20px 14px',
          borderBottom: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.06em' }}>
              Color-Coded Islamic Content
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              Source Colors &amp; Sacred Word Highlights
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-specular)',
              color: 'var(--text-secondary)',
              borderRadius: 99,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="drawer-scroll" style={{ flex: 1, padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Section 1: Source-Level Color Coding (Quran Green, Hadith Red, Dua Gold) */}
          <div style={{
            padding: 14,
            borderRadius: 16,
            background: sacredColorCodingEnabled ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-card)',
            border: sacredColorCodingEnabled ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-specular)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Color-Coded Sacred Sources
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Visually distinguish Allah’s words, the Prophet’s ﷺ spoken quotes, and Duas
                </div>
              </div>
              <button
                onClick={() => {
                  soundEngine.triggerHaptic('selectionTick');
                  onToggleSacredColorCoding();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 99,
                  border: sacredColorCodingEnabled ? '1px solid #34D399' : '1px solid var(--border-specular)',
                  background: sacredColorCodingEnabled ? '#10B981' : 'rgba(255,255,255,0.08)',
                  color: sacredColorCodingEnabled ? '#06130E' : 'var(--text-secondary)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {sacredColorCodingEnabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--sacred-quran-color)', background: 'var(--hl-mercy-bg)', padding: '6px 10px', borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#10B981', flexShrink: 0 }} />
                <span><strong>Quran — Emerald Green:</strong> Marks Quranic verses as the direct Word of Allah.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--sacred-hadith-color)', background: 'var(--hl-prophet-bg)', padding: '6px 10px', borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#EF4444', flexShrink: 0 }} />
                <span><strong>Hadith — Deep Red:</strong> Distinguishes Prophet Muhammad’s ﷺ spoken words from narrator text.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--sacred-dua-color)', background: 'var(--hl-allah-bg)', padding: '6px 10px', borderRadius: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#D97706', flexShrink: 0 }} />
                <span><strong>Duas — Warm Gold:</strong> Makes prophetic &amp; Quranic supplications immediately recognizable.</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 2 }}>
            Individual Sacred Word Highlights (Arabic &amp; English)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SACRED_HIGHLIGHT_GROUPS.map((grp) => {
              const isOn = activeGroupIds.includes(grp.id);
              return (
                <button
                  key={grp.id}
                  onClick={() => {
                    soundEngine.triggerHaptic('selectionTick');
                    onToggleGroup(grp.id);
                  }}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 14,
                    border: isOn ? `1.5px solid ${grp.border}` : '1px solid var(--border-specular)',
                    background: isOn ? grp.bg : 'var(--surface-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isOn ? grp.color : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: grp.border,
                        display: 'inline-block'
                      }} />
                      {grp.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {grp.subtitle}
                    </div>
                  </div>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 99,
                    background: isOn ? '#10B981' : 'rgba(128,128,128,0.15)',
                    color: isOn ? '#06130E' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isOn && <Check size={13} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Word Highlighter Input */}
          <div style={{
            marginTop: 4,
            padding: 14,
            borderRadius: 14,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-specular)'
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Highlight Custom Word (English or Arabic)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                placeholder="e.g., heart, prayer, قلب, نور..."
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-specular)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAdd}
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-gold)',
                  background: 'rgba(212, 175, 55, 0.2)',
                  color: 'var(--accent-gold-bright)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {customWords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {customWords.map((cw) => (
                  <span
                    key={cw}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: 'rgba(251, 191, 36, 0.22)',
                      border: '1px solid rgba(251, 191, 36, 0.55)',
                      color: '#FDE68A',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    {cw}
                    <button
                      onClick={() => onRemoveCustomWord(cw)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PRIVATE PERSONAL NOTES MODAL (Partner Brief Section 3):
 * Speech-bubble button opens PRIVATE PERSONAL NOTES (never public comments).
 * Users can write, update, and browse their private reflections tied to specific verses, Hadiths, or Duas.
 */
export const PersonalNoteModal: React.FC<{
  card: {
    id: string;
    source_title: string;
    card_type: string;
    arabic_text_uthmani?: string;
    translation_en_clear?: string;
    translation_en_sahih?: string;
    translation_clear_quran?: string;
  };
  existingNote: string;
  allNotes: Record<string, { text: string; source_title: string; card_type: string; updatedAt: string }>;
  onSaveNote: (cardId: string, text: string, sourceTitle: string, cardType: string) => void;
  onDeleteNote: (cardId: string) => void;
  onJumpToCardId?: (cardId: string) => void;
  onClose: () => void;
}> = ({
  card,
  existingNote,
  allNotes,
  onSaveNote,
  onDeleteNote,
  onJumpToCardId,
  onClose
}) => {
  const [noteText, setNoteText] = useState(existingNote || '');
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [savedToast, setSavedToast] = useState(false);

  const passagePreview =
    card.translation_en_clear ||
    card.translation_en_sahih ||
    card.translation_clear_quran ||
    card.arabic_text_uthmani ||
    '';

  const savedEntries = Object.entries(allNotes)
    .filter(([, val]) => val && val.text && val.text.trim().length > 0)
    .sort((a, b) => (b[1].updatedAt || '').localeCompare(a[1].updatedAt || ''));

  const handleSave = () => {
    soundEngine.triggerHaptic('softSuccess');
    onSaveNote(card.id, noteText.trim(), card.source_title, card.card_type);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '76%', maxHeight: 620 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab-handle" />
        <div style={{
          padding: '6px 20px 12px',
          borderBottom: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-emerald)', letterSpacing: '0.06em' }}>
              <Lock size={11} /> Private Personal Reflection
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {card.source_title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-specular)',
              color: 'var(--text-secondary)',
              borderRadius: 99,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Sub-navigation between Current Passage Note & All Saved Reflections */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 20px 0' }}>
          <button
            onClick={() => setActiveTab('current')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: activeTab === 'current' ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
              background: activeTab === 'current' ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
              color: activeTab === 'current' ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            This Passage
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: activeTab === 'all' ? '1px solid var(--border-gold)' : '1px solid var(--border-specular)',
              background: activeTab === 'all' ? 'rgba(212, 175, 55, 0.16)' : 'var(--surface-card)',
              color: activeTab === 'all' ? 'var(--accent-gold-bright)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            My Notes ({savedEntries.length})
          </button>
        </div>

        <div className="drawer-scroll" style={{ flex: 1, padding: '14px 20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeTab === 'current' ? (
            <>
              <div style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-specular)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                “{passagePreview.slice(0, 160)}{passagePreview.length > 160 ? '…' : ''}”
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={12} style={{ color: 'var(--accent-emerald)' }} />
                <span>Only visible to you on your device — never shared publicly.</span>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your personal reflection, dua, or takeaway from this passage..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--border-specular)',
                  background: 'rgba(0,0,0,0.18)',
                  color: 'var(--text-primary)',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={handleSave}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(232, 201, 104, 0.55)',
                    background: 'linear-gradient(135deg, #D4AF37, #AA8219)',
                    color: '#090A0F',
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Check size={16} strokeWidth={2.5} />
                  {savedToast ? 'Saved to Private Notes!' : 'Save Personal Note'}
                </button>
                {existingNote && (
                  <button
                    onClick={() => {
                      soundEngine.triggerHaptic('selectionTick');
                      setNoteText('');
                      onDeleteNote(card.id);
                    }}
                    title="Delete Note"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.14)',
                      color: '#FCA5A5',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedEntries.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  You haven’t saved any private notes yet. Tap the speech bubble on any verse, Hadith, or Dua to record a reflection.
                </div>
              ) : (
                savedEntries.map(([cardId, item]) => (
                  <div
                    key={cardId}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-specular)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-gold-bright)' }}>
                        {item.source_title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {onJumpToCardId && (
                          <button
                            onClick={() => {
                              onJumpToCardId(cardId);
                              onClose();
                            }}
                            style={{
                              background: 'rgba(16, 185, 129, 0.16)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#6EE7B7',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 99,
                              cursor: 'pointer'
                            }}
                          >
                            Open Card
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteNote(cardId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 2
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {item.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * FIRST-TIME ONBOARDING SCREENS (After-Launch Feedback Items 1, 2, 3, 4):
 * - Item 1: Simple opening screen ("The average Muslim spends 2+ hours per day scrolling social media. Fill that precious time with dhikr.")
 * - Item 2: Minimalist full-screen design (no "1 of 5" labels, no heavy frames or nested boxes, generous spacing, subtle dot progress indicator, one Continue button)
 * - Item 3: Clear content labels ("Quran • Verse", "Hadith • Prophetic Quote", "Dua • Supplication") — no color names ("Emerald Green", "Deep Red", "Warm Gold")
 * - Item 4: Dedicated mood-based discovery screen ("Find Guidance for How You Feel") with mood chips (Anxious, Grateful, Sad, Seeking Forgiveness, Hopeful, Seeking Patience), introducing search separately.
 */
export const OnboardingTutorialModal: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [animTick, setAnimTick] = useState(0);

  // Drive live animations inside the onboarding slides (especially the interactive final slide)
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimTick((prev) => (prev + 1) % 12);
    }, 950);
    return () => clearInterval(timer);
  }, []);

  const demoArabicWords = [
    { ar: 'فَإِنَّ', tr: 'fa-inna', en: 'So surely', root: 'أ ن ن (A-N-N)' },
    { ar: 'مَعَ', tr: 'ma‘a', en: 'with / alongside', root: 'م ع و (M-‘-W)' },
    { ar: 'ٱلْعُسْرِ', tr: 'al-‘usri', en: 'the hardship', root: 'ع س ر (‘-S-R)' },
    { ar: 'يُسْرًا', tr: 'yusrā', en: 'comes double ease', root: 'ي س ر (Y-S-R)' }
  ];
  const activeDemoWordIdx = animTick % demoArabicWords.length;
  const activeDemoWord = demoArabicWords[activeDemoWordIdx];
  const demoQueries = ['Surah Ya-Sin • 36:1', 'Ayat al-Kursi • 2:255', '40 Hadith Nawawi #1', 'Patience & Relief'];
  const activeDemoQuery = demoQueries[Math.floor(animTick / 3) % demoQueries.length];

  const slides = [
    {
      title: 'The average Muslim spends 2+ hours per day scrolling social media.',
      subtitle: 'Fill that precious time with dhikr.',
      visual: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 32, color: 'var(--sacred-quran-color)', fontFamily: 'var(--font-arabic)', lineHeight: 1.75 }}>
            أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ
          </div>
          <div style={{ fontSize: 16, color: 'rgba(244, 241, 234, 0.88)', fontStyle: 'italic', lineHeight: 1.55, maxWidth: 320 }}>
            “Surely in the remembrance of Allah do hearts find rest.”
          </div>
          <div style={{ fontSize: 12, color: 'rgba(244, 241, 234, 0.45)', letterSpacing: '0.04em' }}>
            Surah Ar-Ra‘d • 13:28
          </div>
        </div>
      )
    },
    {
      title: 'Quran, Hadith & Duas at a Glance',
      subtitle: 'Recognize every sacred source effortlessly while you read.',
      visual: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', textAlign: 'left', padding: '4px 0' }}>
          <div style={{ paddingLeft: 14, borderLeft: '2.5px solid #10B981' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6EE7B7', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Quran • Verse
            </div>
            <div style={{ fontSize: 14.5, color: '#E2F8EE', marginTop: 4, lineHeight: 1.45 }}>
              “Indeed, Allah is with the patient.” <span style={{ opacity: 0.6, fontSize: 12.5 }}>(2:153)</span>
            </div>
          </div>

          <div style={{ paddingLeft: 14, borderLeft: '2.5px solid #EF4444' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FCA5A5', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Hadith • Prophetic Quote
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(244,241,234,0.68)', marginTop: 4, lineHeight: 1.45 }}>
              Umar ibn al-Khattab reported that the Prophet ﷺ said:{' '}
              <span style={{ color: '#FCA5A5', fontWeight: 600 }}>“Actions are judged only by intentions…”</span>
            </div>
          </div>

          <div style={{ paddingLeft: 14, borderLeft: '2.5px solid #E8C968' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FDE68A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Dua • Supplication
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(244,241,234,0.68)', marginTop: 4, lineHeight: 1.45 }}>
              Among the Prophet’s ﷺ most frequent prayers:{' '}
              <span style={{ color: '#FEF08A', fontWeight: 600 }}>“Our Lord, grant us good in this world and good in the Hereafter.”</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Find Guidance for How You Feel',
      subtitle: 'Select your current state of heart to receive verses, Hadiths, and Duas tailored to your moment.',
      visual: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', padding: '12px 0' }}>
          {[
            'Anxious',
            'Grateful',
            'Sad',
            'Seeking Forgiveness',
            'Hopeful',
            'Seeking Patience'
          ].map((mood, idx) => {
            const isHighlighted = idx === (animTick % 6);
            return (
              <span
                key={mood}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: isHighlighted ? 'rgba(232, 201, 104, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                  border: isHighlighted ? '1px solid rgba(232, 201, 104, 0.65)' : '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: 13.5,
                  color: isHighlighted ? '#F7DF8B' : '#F4F1EA',
                  fontWeight: 600,
                  transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              >
                {mood}
              </span>
            );
          })}
        </div>
      )
    },
    {
      title: 'Live Audio, Word Roots & Instant Search',
      subtitle: 'Watch words illuminate as the Qari recites, tap any Arabic word to reveal its 3-letter root, or jump to any Surah.',
      visual: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', padding: '4px 0' }}>
          {/* Animated Word-by-Word Recitation & Root Popover Preview */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: '16px 14px',
            borderRadius: 18,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(232, 201, 104, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Volume2 size={13} />
              <span>Live Synced Recitation &amp; Root Tap</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, direction: 'rtl', flexWrap: 'wrap' }}>
              {demoArabicWords.map((w, idx) => {
                const isAct = idx === activeDemoWordIdx;
                return (
                  <span
                    key={w.ar}
                    onClick={() => setAnimTick(idx)}
                    style={{
                      fontSize: 27,
                      fontFamily: 'var(--font-arabic)',
                      padding: '2px 10px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: isAct ? 'rgba(232, 201, 104, 0.28)' : 'transparent',
                      border: isAct ? '1.5px solid #E8C968' : '1.5px solid transparent',
                      color: isAct ? '#FFFBEB' : 'rgba(244, 241, 234, 0.65)',
                      transform: isAct ? 'translateY(-3px) scale(1.06)' : 'scale(1)',
                      boxShadow: isAct ? '0 8px 20px rgba(212, 175, 55, 0.25)' : 'none',
                      transition: 'all 0.32s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                  >
                    {w.ar}
                  </span>
                );
              })}
            </div>

            {/* Animated Live Root Spotlight Chip */}
            <div
              key={activeDemoWord.ar}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '9px 12px',
                borderRadius: 12,
                background: 'rgba(212, 175, 55, 0.14)',
                border: '1px solid rgba(232, 201, 104, 0.4)',
                fontSize: 12,
                animation: 'fadeIn 0.28s ease-out'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontWeight: 800, color: '#F7DF8B' }}>“{activeDemoWord.en}”</span>
                <span style={{ color: 'rgba(244,241,234,0.65)', marginLeft: 6 }}>({activeDemoWord.tr})</span>
              </div>
              <span style={{
                padding: '3px 8px',
                borderRadius: 99,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6EE7B7',
                fontWeight: 700,
                fontSize: 11
              }}>
                Root: {activeDemoWord.root}
              </span>
            </div>
          </div>

          {/* Animated Cycling Search & Sequential Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 13
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F4F1EA' }}>
              <Search size={15} style={{ color: 'var(--accent-gold-bright)', flexShrink: 0 }} />
              <span key={activeDemoQuery} style={{ animation: 'fadeIn 0.3s ease-out', fontWeight: 600 }}>
                {activeDemoQuery}
              </span>
            </div>
            <span style={{ fontSize: 10.5, color: 'rgba(244,241,234,0.5)', fontWeight: 600 }}>
              114 Surahs
            </span>
          </div>
        </div>
      )
    }
  ];

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'linear-gradient(180deg, #090C14 0%, #0E131F 100%)',
        color: '#F4F1EA',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'max(24px, env(safe-area-inset-top, 24px)) 28px max(28px, env(safe-area-inset-bottom, 28px))',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* Subtle Top Bar: Skip Only (No "1 of 5" clutter) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: 440, margin: '0 auto' }}>
        <button
          onClick={() => {
            soundEngine.triggerHaptic('selectionTick');
            onComplete();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(244, 241, 234, 0.45)',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 8px'
          }}
        >
          Skip
        </button>
      </div>

      {/* Generous Full-Screen Center Content */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 28
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F4F1EA', lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>
            {current.title}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(244, 241, 234, 0.72)', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
            {current.subtitle}
          </p>
        </div>

        <div style={{ width: '100%' }}>
          {current.visual}
        </div>
      </div>

      {/* Bottom Footer: Subtle Progress Dots + Single Prominent Continue Button */}
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              aria-label={`Onboarding step ${idx + 1}`}
              style={{
                width: idx === step ? 20 : 6,
                height: 6,
                borderRadius: 99,
                border: 'none',
                padding: 0,
                background: idx === step ? '#E8C968' : 'rgba(255,255,255,0.16)',
                transition: 'all 0.25s ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        <button
          onClick={() => {
            soundEngine.triggerHaptic('softSuccess');
            if (isLast) {
              onComplete();
            } else {
              setStep(step + 1);
            }
          }}
          style={{
            width: '100%',
            padding: '16px 22px',
            borderRadius: 16,
            border: 'none',
            background: '#E8C968',
            color: '#090A0F',
            fontSize: 15.5,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <span>{isLast ? 'Begin Reading' : 'Continue'}</span>
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

/**
 * DYNAMIC ANIMATED INTERACTIVE TUTORIAL / SPOTLIGHT TOUR (Replaces Static Coach Marks):
 * 4-step self-playing animated tour over the live feed:
 * - Step 0: Animated Vertical Swipe gesture with glowing motion trail
 * - Step 1: Animated Arabic Word Tap & 3-Letter Root pop-up ripple
 * - Step 2: Animated Right-Side Action Stack (Like, Private Note, Share & Jump Rail)
 * - Step 3: Animated Bottom Recite Soundwave & 5-Tab Deep Study Spotlight
 */
export const InteractiveCoachMarksOverlay: React.FC<{
  onDismiss: () => void;
}> = ({ onDismiss }) => {
  const [tourStep, setTourStep] = useState(0);

  // Auto-advance every 3.4s so the user can watch the animated walkthrough hands-free, or tap to advance
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tourStep < 3) {
        setTourStep((s) => s + 1);
      }
    }, 3400);
    return () => clearTimeout(timer);
  }, [tourStep]);

  const handleAdvanceOrFinish = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.triggerHaptic('selectionTick');
    if (tourStep < 3) {
      setTourStep(tourStep + 1);
    } else {
      onDismiss();
    }
  };

  return (
    <div
      onClick={handleAdvanceOrFinish}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 85,
        background: 'rgba(6, 9, 15, 0.76)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'max(18px, env(safe-area-inset-top, 18px)) 18px max(22px, env(safe-area-inset-bottom, 22px))',
        color: '#F4F1EA',
        cursor: 'pointer',
        animation: 'fadeIn 0.22s ease-out'
      }}
    >
      {/* Top Bar: Step Progress Pills + Skip Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', gap: 5, flex: 1, maxWidth: 180 }}>
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setTourStep(idx);
              }}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 99,
                border: 'none',
                padding: 0,
                background: idx <= tourStep ? '#E8C968' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.triggerHaptic('selectionTick');
            onDismiss();
          }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 99,
            padding: '5px 12px',
            color: '#F4F1EA',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Skip Tour
        </button>
      </div>

      {/* Dynamic Animated Center Stage for Current Step */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {/* STEP 0: Animated Vertical Swipe Gesture */}
        {tourStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center', animation: 'fadeIn 0.25s ease-out' }}>
            <div style={{ position: 'relative', width: 88, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Glowing Vertical Swipe Trail */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 24,
                  width: 6,
                  borderRadius: 99,
                  background: 'linear-gradient(180deg, #E8C968, rgba(232, 201, 104, 0))',
                  animation: 'tutorialSwipeTrail 1.8s ease-in-out infinite'
                }}
              />
              {/* Animated Touch Circle & Upward Arrow */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 99,
                  background: 'rgba(232, 201, 104, 0.25)',
                  border: '2px solid #E8C968',
                  boxShadow: '0 0 24px rgba(232, 201, 104, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#FFFBEB',
                  animation: 'tutorialSwipeHand 1.8s ease-in-out infinite'
                }}
              >
                ↑
              </div>
            </div>

            <div style={{ maxWidth: 290 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#F7DF8B' }}>
                Swipe Up for the Next Passage
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(244,241,234,0.8)', marginTop: 6, lineHeight: 1.45 }}>
                Scroll effortlessly through 14,678 verses of the Quran, Sahih Hadith, and Prophetic Duas.
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Animated Word Tap & Trilateral Root Reveal */}
        {tourStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', animation: 'fadeIn 0.25s ease-out' }}>
            <div
              style={{
                padding: '10px 22px',
                borderRadius: 16,
                background: 'rgba(232, 201, 104, 0.24)',
                border: '2px solid #E8C968',
                fontSize: 32,
                fontFamily: 'var(--font-arabic)',
                color: '#FFFBEB',
                animation: 'tutorialTapRipple 1.6s ease-in-out infinite'
              }}
            >
              ٱلرَّحْمَٰنِ
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 16,
                background: 'rgba(18, 25, 38, 0.96)',
                border: '1px solid rgba(232, 201, 104, 0.5)',
                boxShadow: '0 16px 36px rgba(0,0,0,0.65)',
                maxWidth: 290,
                animation: 'tutorialFloatCard 2.2s ease-in-out infinite'
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#F7DF8B' }}>
                “The Entirely Merciful” • ar-Raḥmān
              </div>
              <div style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 700, marginTop: 4 }}>
                3-Letter Root: ر ح م (R-Ḥ-M) — Mercy
              </div>
            </div>

            <div style={{ maxWidth: 290, marginTop: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#F4F1EA' }}>
                Tap Any Arabic Word
              </div>
              <div style={{ fontSize: 13.5, color: 'rgba(244,241,234,0.8)', marginTop: 4, lineHeight: 1.45 }}>
                Hear isolated Arabic pronunciation and inspect its trilateral root &amp; meaning on the spot.
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Animated Right-Side Action Stack Spotlight */}
        {tourStep === 2 && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 52, animation: 'fadeIn 0.25s ease-out' }}>
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 20,
                background: 'rgba(18, 25, 38, 0.96)',
                border: '1.5px solid rgba(232, 201, 104, 0.55)',
                boxShadow: '0 18px 42px rgba(0,0,0,0.75)',
                maxWidth: 270,
                textAlign: 'left',
                animation: 'tutorialFloatCard 2s ease-in-out infinite'
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F7DF8B', marginBottom: 10 }}>
                Save, Reflect &amp; Share →
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Heart size={17} fill="#FF3B5C" style={{ color: '#FF3B5C', flexShrink: 0 }} />
                  <span><strong>Like:</strong> Save to your Bookmarks Vault</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MessageCircle size={17} style={{ color: '#F7DF8B', flexShrink: 0 }} />
                  <span><strong>Note:</strong> Private on-device reflection journal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Send size={17} style={{ color: '#6EE7B7', flexShrink: 0 }} />
                  <span><strong>Share:</strong> Export HD Story/Reel cards</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Animated Bottom Recite Soundwave & Deep Study Spotlight */}
        {tourStep === 3 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', paddingBottom: 24, animation: 'fadeIn 0.25s ease-out' }}>
            <div
              style={{
                width: '100%',
                maxWidth: 340,
                padding: '18px 18px',
                borderRadius: 20,
                background: 'rgba(18, 25, 38, 0.96)',
                border: '1.5px solid rgba(232, 201, 104, 0.55)',
                boxShadow: '0 18px 42px rgba(0,0,0,0.75)',
                textAlign: 'center',
                animation: 'tutorialFloatCard 2.2s ease-in-out infinite'
              }}
            >
              {/* Animated Audio Waveform Bars */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, height: 24, marginBottom: 10 }}>
                {[0.1, 0.25, 0.4, 0.15, 0.35, 0.5, 0.2].map((delay, i) => (
                  <span
                    key={i}
                    style={{
                      width: 4,
                      height: 22,
                      borderRadius: 99,
                      background: '#E8C968',
                      display: 'inline-block',
                      animation: `tutorialWaveBar 0.9s ease-in-out ${delay}s infinite`
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#F7DF8B' }}>
                Recite &amp; 5-Tab Deep Study ↓
              </div>
              <div style={{ fontSize: 13, color: 'rgba(244,241,234,0.82)', marginTop: 6, lineHeight: 1.45 }}>
                Tap <strong>Recite</strong> on the bottom-left for studio Qari audio, or <strong>Deep Study</strong> on the bottom-right for Classical Tafsir &amp; connected Sunnah.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar: Next Step or Start Reading */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleAdvanceOrFinish}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 16,
            border: 'none',
            background: '#E8C968',
            color: '#090A0F',
            fontSize: 14.5,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 10px 28px rgba(0,0,0,0.5)'
          }}
        >
          <span>{tourStep < 3 ? `Next (${tourStep + 1}/4)` : 'Start Scrolling'}</span>
          <ChevronRight size={17} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

/**
 * HOME SCREEN & LOCK SCREEN WIDGETS PREVIEW MODAL (Partner Brief Section 5):
 * Lets users preview and configure their Daily Quran Verse, Daily Authentic Hadith,
 * Daily Dua, and Reading Streak widgets for iOS Home Screen & Lock Screen.
 */
export const WidgetsPreviewModal: React.FC<{
  streakDays: number;
  onClose: () => void;
}> = ({ streakDays, onClose }) => {
  return (
    <div className="spring-sheet-backdrop" onClick={onClose}>
      <div
        className="spring-sheet-panel"
        style={{ height: '80%', maxHeight: 650 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab-handle" />
        <div style={{
          padding: '6px 20px 14px',
          borderBottom: '1px solid var(--border-specular)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.06em' }}>
              iPhone Home &amp; Lock Screen
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              Islamic Widgets Gallery &amp; Setup
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-specular)',
              color: 'var(--text-secondary)',
              borderRadius: 99,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="drawer-scroll" style={{ flex: 1, padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.48 }}>
            Keep sacred remembrance on your iPhone Home Screen and Lock Screen throughout the day without opening the app.
          </div>

          {/* Widget 1: Daily Quran Verse (Medium Home Screen Widget) */}
          <div style={{
            padding: 16,
            borderRadius: 20,
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.16), rgba(9, 13, 22, 0.96))',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#6EE7B7', letterSpacing: '0.06em' }}>
                ✦ Daily Quran Widget • Surah Ash-Sharh 94:5
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Home Screen (Medium)</span>
            </div>
            <div style={{ fontSize: 19, fontFamily: 'var(--font-arabic)', color: '#6EE7B7', textAlign: 'right', marginBottom: 6 }}>
              فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا ۝
            </div>
            <div style={{ fontSize: 12.5, color: '#F4F1EA', fontStyle: 'italic' }}>
              “So, surely with hardship comes ease.”
            </div>
          </div>

          {/* Widget 2: Daily Authentic Hadith & Daily Dua (Small Widgets Row) */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              flex: 1,
              padding: 14,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(9, 13, 22, 0.96))',
              border: '1px solid rgba(248, 113, 113, 0.4)'
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', color: '#FCA5A5', marginBottom: 6 }}>
                Daily Sahih Hadith
              </div>
              <div style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 600, lineHeight: 1.4 }}>
                “Actions are judged only by intentions…”
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                Nawawi #1 • Bukhari
              </div>
            </div>

            <div style={{
              flex: 1,
              padding: 14,
              borderRadius: 20,
              background: 'linear-gradient(145deg, rgba(232, 201, 104, 0.16), rgba(9, 13, 22, 0.96))',
              border: '1px solid rgba(232, 201, 104, 0.45)'
            }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', color: '#FDE68A', marginBottom: 6 }}>
                Streak &amp; Daily Dua
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold-bright)' }}>
                {streakDays} Day{streakDays === 1 ? '' : 's'} 🔥
              </div>
              <div style={{ fontSize: 11, color: '#FEF08A', marginTop: 4, lineHeight: 1.35 }}>
                Morning &amp; Evening Adhkar Ready
              </div>
            </div>
          </div>

          {/* Guided Setup Instructions */}
          <div style={{
            padding: 14,
            borderRadius: 16,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-specular)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={14} style={{ color: 'var(--accent-gold-bright)' }} />
              <span>How to Add Halal Scroll to Your iPhone Home Screen</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              1. Long-press an empty area on your iPhone Home Screen or Lock Screen until apps jiggle.<br />
              2. Tap <strong>Edit (+)</strong> in the top-left corner and search for <strong>Halal Scroll</strong>.<br />
              3. Choose your preferred size (Small Streak/Dua, Medium Daily Verse, or Lock Screen Verse) and tap <strong>Add Widget</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
