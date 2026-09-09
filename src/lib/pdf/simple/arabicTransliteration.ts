/**
 * Patient-name localization for the Arabic (RTL) Simple Quotation PDF.
 * Ported verbatim from legacy `pdf-generator-ar.js`'s `arPdfPatientName()`.
 */

/** A short list of common names with a fixed, natural Arabic spelling. Unlike the Russian
 *  transliterator, there is no mechanical fallback for unknown Latin names — an unrecognized
 *  name is printed as-is (legacy behavior: `return exact || value`). */
const KNOWN_ARABIC_NAMES: Record<string, string> = {
  ahmed: 'أحمد',
  mohamed: 'محمد',
  muhammad: 'محمد',
  abdullah: 'عبدالله',
  abdallah: 'عبدالله',
  ali: 'علي',
  omar: 'عمر',
  youssef: 'يوسف',
  yusuf: 'يوسف',
  amir: 'أمير',
  asma: 'أسماء',
  samira: 'سميرة',
  rachid: 'رشيد',
  karim: 'كريم',
  fatima: 'فاطمة',
  sara: 'سارة',
  maryam: 'مريم',
};

/** Matches any Arabic-script codepoint in the main Arabic Unicode block (U+0600–U+06FF). */
const ARABIC_SCRIPT_PATTERN = /[؀-ۿ]/;

/**
 * Returns the patient's display name for the Arabic Simple Quotation PDF.
 *
 * A name already in Arabic script is returned unchanged; otherwise a known-name lookup is
 * tried, falling back to the original (Latin) value when the name isn't recognized.
 *
 * Legacy source: `arPdfPatientName(name)`.
 */
export function transliterateArabicPatientName(name: string | null | undefined): string {
  const value = String(name || '').trim();
  if (!value) return '';
  if (ARABIC_SCRIPT_PATTERN.test(value)) return value;

  return KNOWN_ARABIC_NAMES[value.toLowerCase()] || value;
}
