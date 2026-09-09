/**
 * WhatsApp-diagnosis-paste parser.
 *
 * Started life as a few English-only regexes ported from the legacy `app.js`. It is now
 * numeral- and language-aware so a coordinator can paste the clinic's message in whatever
 * form it arrives:
 *   - Western (0-9), Arabic-Indic (٠-٩) and Persian (۰-۹) digits
 *   - numbers spelled out in English, French, Spanish, Italian, German, Russian, Turkish
 *     or Arabic
 *   - implant / crown / upper-jaw / lower-jaw vocabulary in those languages
 *   - ranges written many ways: "6-8", "6 to 8", "de 6 a 8", "от 6 до 8", "من 6 إلى 8",
 *     "all-on-4" ...
 *
 * Output is the same `PatientTreatmentData` shape the PDF layer and the option pre-fill
 * already consume.
 */

import type { PatientTreatmentData } from '../pdf/types';

// --- digit normalisation -------------------------------------------------------------

const WESTERN_DIGIT: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
  WESTERN_DIGIT[String.fromCharCode(0x0660 + i)] = String(i); // ٠-٩ Arabic-Indic
  WESTERN_DIGIT[String.fromCharCode(0x06f0 + i)] = String(i); // ۰-۹ Persian / Urdu
}

function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (d) => WESTERN_DIGIT[d] ?? d);
}

// --- spelled-out numbers -----------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
  // French
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20,
  // Spanish
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, 'dieciséis': 16,
  veinte: 20,
  // Italian
  due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  undici: 11, dodici: 12, sedici: 16, venti: 20,
  // German
  ein: 1, eine: 1, eins: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, sechs: 6, sieben: 7, acht: 8,
  neun: 9, zehn: 10, elf: 11, 'zwölf': 12, zwanzig: 20,
  // Turkish (no bare "on" = 10 — it collides with the English preposition)
  bir: 1, iki: 2, 'üç': 3, 'dört': 4, 'beş': 5, 'altı': 6, yedi: 7, sekiz: 8, dokuz: 9,
  // Russian
  'один': 1, 'одна': 1, 'два': 2, 'две': 2, 'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6,
  'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10, 'одиннадцать': 11, 'двенадцать': 12,
  'тринадцать': 13, 'четырнадцать': 14, 'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17,
  'восемнадцать': 18, 'девятнадцать': 19, 'двадцать': 20,
  // Arabic
  'واحد': 1, 'واحدة': 1, 'اثنان': 2, 'اثنين': 2, 'إثنين': 2, 'ثلاث': 3, 'ثلاثة': 3, 'أربع': 4,
  'اربع': 4, 'أربعة': 4, 'اربعة': 4, 'خمس': 5, 'خمسة': 5, 'ست': 6, 'ستة': 6, 'سبع': 7, 'سبعة': 7,
  'ثماني': 8, 'ثمانية': 8, 'تسع': 9, 'تسعة': 9, 'عشر': 10, 'عشرة': 10, 'اثنا عشر': 12,
};

const NUMBER_WORD_KEYS = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);
/** Matches a digit run or any spelled-out number above. */
const NUM = `\\d+|${NUMBER_WORD_KEYS.join('|')}`;

function toInt(token: string): number | null {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return NUMBER_WORDS[t] ?? null;
}

// --- vocabulary ------------------------------------------------------------------

const IMPLANT_RE = /(implant|implante|implantat|impiant|имплан|غرس|زرع|زراع)/iu;
const CROWN_RE = /(crown|couronne|coron|krone|kron|коронк|коронок|تاج|تيجان|تلبيس)/iu;
const UPPER_RE = /(upper|maxill|superior|superieur|supérieur|superiore|верхн|علوي|فوقي|oberkiefer|ober|üst|\btop\b)/iu;
const LOWER_RE = /(lower|mandib|inferior|inferieur|inférieur|inferiore|нижн|سفلي|تحتي|unterkiefer|unter|\balt\b|\bbottom\b)/iu;
const ZIRCONIA_RE = /(zircon|circoni|цирконий|циркони|زركون|زيركون)/iu;
const ALL_ON_RE = /all[\s-]*on[\s-]*(?:the\s*)?(\d+)/iu;

const RANGE_SEP = `-|–|—|~|\\bto\\b|\\bhasta\\b|\\ba\\b|à|\\bbis\\b|\\bdo\\b|до|إلى|الى`;
const RANGE_RE = new RegExp(`(${NUM})\\s*(?:${RANGE_SEP})\\s*(${NUM})`, 'iu');
const NUM_G = new RegExp(`(?<![\\p{L}\\p{N}.])(${NUM})(?![\\p{L}\\p{N}.])`, 'giu');

/** Splits a paste into independent statements: punctuation, bullets, "+", a sentence
 *  period (but not a decimal point), and the "and" conjunctions of the supported
 *  languages. */
const CLAUSE_SPLIT = /[,،؛;\n\r/·•|+&]|(?<!\d)\.(?!\d)|\s(?:and|et|y|und|piu|più|e|و|и|artı|plus|mas|más)\s/iu;

/** Drops implant-dimension noise ("3.5 x 12 mm", "Ø4.0", "12mm") so the length in
 *  millimetres is never mistaken for an implant count. */
function stripDimensions(s: string): string {
  return s
    .replace(/\d+(?:[.,]\d+)?\s*[x×*]\s*\d+(?:[.,]\d+)?(?:\s*mm)?/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*mm\b/gi, ' ')
    .replace(/ø\s*\d+(?:[.,]\d+)?/gi, ' ');
}

interface Count {
  min: number;
  max: number;
}

/** Numbers written next to `keyword` — a clause-wide range wins, otherwise the nearest
 *  standalone number within ~32 chars (before the keyword first, then after). */
function countNear(clause: string, keyword: RegExpMatchArray): Count | null {
  const range = clause.match(RANGE_RE);
  if (range) {
    const a = toInt(range[1]);
    const b = toInt(range[2]);
    if (a != null && b != null) return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const idx = keyword.index ?? 0;
  const before = clause.slice(Math.max(0, idx - 32), idx);
  const after = clause.slice(idx + keyword[0].length, idx + keyword[0].length + 32);

  const beforeNums = [...before.matchAll(NUM_G)].map((m) => toInt(m[1])).filter((n): n is number => n != null);
  if (beforeNums.length) return { min: beforeNums[beforeNums.length - 1], max: beforeNums[beforeNums.length - 1] };

  const afterNums = [...after.matchAll(NUM_G)].map((m) => toInt(m[1])).filter((n): n is number => n != null);
  if (afterNums.length) return { min: afterNums[0], max: afterNums[0] };

  return null;
}

export function parseTreatmentData(raw: string): PatientTreatmentData {
  const data: PatientTreatmentData = {};
  const text = normalizeDigits(raw ?? '');
  if (!text.trim()) return data;

  if (ZIRCONIA_RE.test(text)) data.crownMaterial = 'zirconia';

  const clauses = text.split(CLAUSE_SPLIT).map((c) => stripDimensions(c).trim()).filter(Boolean);
  let jawless: Count | null = null;

  const addLower = (c: Count) => {
    data.lowerImplantsMin = (data.lowerImplantsMin ?? 0) + c.min;
    data.lowerImplantsMax = (data.lowerImplantsMax ?? 0) + c.max;
  };

  for (const clause of clauses) {
    const allOn = clause.match(ALL_ON_RE);
    const implantKw = clause.match(IMPLANT_RE);
    const crownKw = clause.match(CROWN_RE);
    if (!allOn && !implantKw && !crownKw) continue;

    if (crownKw && !implantKw && !allOn) {
      const c = countNear(clause, crownKw);
      if (c) data.crowns = (data.crowns ?? 0) + c.max;
      continue;
    }

    const count = allOn
      ? { min: Number(allOn[1]), max: Number(allOn[1]) }
      : countNear(clause, (implantKw ?? crownKw)!);
    if (!count) continue;

    if (UPPER_RE.test(clause)) {
      data.upperImplants = (data.upperImplants ?? 0) + count.max;
    } else if (LOWER_RE.test(clause)) {
      addLower(count);
    } else {
      jawless = jawless ? { min: jawless.min + count.min, max: jawless.max + count.max } : count;
    }
  }

  if (jawless) {
    if (data.upperImplants == null && data.lowerImplantsMin == null) {
      // A single implant count with no jaw named — treat it as the whole plan.
      data.upperImplants = jawless.max;
    } else {
      addLower(jawless);
    }
  }
  if (data.lowerImplantsMin != null && data.lowerImplantsMax == null) {
    data.lowerImplantsMax = data.lowerImplantsMin;
  }

  return data;
}
