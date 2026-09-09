/**
 * Patient-name localization for the Simple Quotation PDF.
 * Ported verbatim from legacy `pdf-generator.js`'s `pdfPatientName()`.
 */

/** A short list of common names with a fixed, natural Russian spelling — checked before falling back to mechanical transliteration. */
const KNOWN_RUSSIAN_NAMES: Record<string, string> = {
  rachid: 'Рашид',
  dmitry: 'Дмитрий',
  dmitri: 'Дмитрий',
  alexander: 'Александр',
  alexandr: 'Александр',
  mohamed: 'Мохамед',
  muhammad: 'Мухаммад',
  ahmed: 'Ахмед',
  karim: 'Карим',
};

/** Ordered Latin → Cyrillic substring replacements (longest/most specific digraphs first) used for mechanical transliteration when a name isn't in `KNOWN_RUSSIAN_NAMES`. */
const LATIN_TO_CYRILLIC: Array<[string, string]> = [
  ['shch', 'щ'], ['sch', 'щ'], ['zh', 'ж'], ['kh', 'х'], ['ts', 'ц'], ['ch', 'ч'], ['sh', 'ш'],
  ['yu', 'ю'], ['ya', 'я'], ['ye', 'е'], ['yo', 'ё'], ['ph', 'ф'], ['th', 'т'], ['j', 'дж'],
  ['q', 'к'], ['w', 'в'], ['x', 'кс'],
  ['a', 'а'], ['b', 'б'], ['c', 'к'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'], ['h', 'х'],
  ['i', 'и'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'],
  ['s', 'с'], ['t', 'т'], ['u', 'у'], ['v', 'в'], ['y', 'й'], ['z', 'з'],
];

/**
 * Returns the patient's display name for the Simple Quotation PDF.
 *
 * - For every language except Russian, the name is returned as-is (defaulting to "Patient"
 *   when empty).
 * - For Russian, a name already containing Cyrillic characters is returned unchanged; otherwise
 *   a known-name lookup is tried first, and failing that the name is mechanically transliterated
 *   letter-by-letter (digraphs first) and title-cased per word.
 *
 * Legacy source: `pdfPatientName(name, language)`.
 */
export function transliteratePatientName(name: string | null | undefined, language: string): string {
  if (language !== 'Russian') return name || 'Patient';

  const trimmed = String(name || 'Patient').trim();
  if (/[А-Яа-яЁё]/.test(trimmed)) return trimmed;

  const exact = KNOWN_RUSSIAN_NAMES[trimmed.toLowerCase()];
  if (exact) return exact;

  let result = trimmed.toLowerCase();
  for (const [from, to] of LATIN_TO_CYRILLIC) result = result.split(from).join(to);

  return result
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
