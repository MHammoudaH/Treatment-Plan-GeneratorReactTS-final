/**
 * Number grammar for the PDFs, in one place. Russian and Arabic choose the noun form from the
 * number ("2 импланта" / "5 имплантов", "زرعتان" / "3 زرعات" / "12 زرعة"), so a fixed word after
 * a number is wrong in those languages. A count may be a range such as "4–6": the noun then
 * follows the last number.
 */
import type { QuotationLanguage } from './types';

type Count = number | string;

const lastNumber = (count: Count): number => Number(String(count).split(/[-–]/).pop());
const isRange = (count: Count): boolean => /[-–]/.test(String(count));

/** [one, few, many]: 1 имплант, 2-4 импланта, 5+ имплантов (11-14 are "many"). */
export type RussianForms = readonly [one: string, few: string, many: string];

export function russianWord(count: Count, [one, few, many]: RussianForms): string {
  const n = lastNumber(count);
  const tens = n % 100;
  const units = n % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (units === 1) return one;
  return units >= 2 && units <= 4 ? few : many;
}

export function russianCount(count: Count, forms: RussianForms): string {
  return `${count} ${russianWord(count, forms)}`;
}

export const RU_IMPLANTS: RussianForms = ['имплант', 'импланта', 'имплантов'];
export const RU_ZIRCONIA_CROWNS: RussianForms = ['циркониевая коронка', 'циркониевые коронки', 'циркониевых коронок'];
export const RU_CROWNS: RussianForms = ['коронка', 'коронки', 'коронок'];
export const RU_VENEERS: RussianForms = ['винир', 'винира', 'виниров'];

/** one / two are whole phrases (no digit); few = 3-10; many = 11 and up. */
export interface ArabicForms {
  one: string;
  two: string;
  few: string;
  many: string;
}

/** A number range that always reads left to right, even inside right-to-left Arabic text. */
export const ltrRange = (range: Count): string => `⁦${range}⁩`;

export function arabicCount(count: Count, forms: ArabicForms): string {
  const n = lastNumber(count);
  if (!isRange(count)) {
    if (n === 1) return forms.one;
    if (n === 2) return forms.two;
  }
  return `${isRange(count) ? ltrRange(count) : count} ${n <= 10 ? forms.few : forms.many}`;
}

export const AR_IMPLANTS: ArabicForms = { one: 'زرعة واحدة', two: 'زرعتان', few: 'زرعات', many: 'زرعة' };
export const AR_CROWNS: ArabicForms = { one: 'تاج واحد', two: 'تاجان', few: 'تيجان', many: 'تاجًا' };
export const AR_VENEERS: ArabicForms = { one: 'قشرة واحدة', two: 'قشرتان', few: 'قشور', many: 'قشرة' };
export const AR_OPTIONS: ArabicForms = { one: 'خيار واحد', two: 'خياران', few: 'خيارات', many: 'خيارًا' };

export type StayUnit = 'night' | 'day';

const AR_NIGHTS: ArabicForms = { one: 'ليلة واحدة', two: 'ليلتان', few: 'ليالٍ', many: 'ليلة' };
const AR_DAYS: ArabicForms = { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا' };
const RU_NIGHTS: RussianForms = ['ночь', 'ночи', 'ночей'];
const RU_DAYS: RussianForms = ['день', 'дня', 'дней'];

/** [night, nights, day, days] — these languages only have a singular and a plural. */
const SIMPLE_STAY: Record<Exclude<QuotationLanguage, 'Russian' | 'Arabic'>, readonly [string, string, string, string]> = {
  English: ['night', 'nights', 'day', 'days'],
  French: ['nuit', 'nuits', 'jour', 'jours'],
  Italian: ['notte', 'notti', 'giorno', 'giorni'],
  Spanish: ['noche', 'noches', 'día', 'días'],
};

/** "7 ночей", "ليلتان", "1-2 notti" — a number of nights or days in `language`. */
export function formatStayCount(count: Count, unit: StayUnit, language: QuotationLanguage): string {
  if (language === 'Russian') return russianCount(count, unit === 'night' ? RU_NIGHTS : RU_DAYS);
  if (language === 'Arabic') return arabicCount(count, unit === 'night' ? AR_NIGHTS : AR_DAYS);
  const [night, nights, day, days] = SIMPLE_STAY[language];
  const one = String(count) === '1';
  return `${count} ${unit === 'night' ? (one ? night : nights) : one ? day : days}`;
}
