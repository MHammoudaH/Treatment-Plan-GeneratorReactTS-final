/**
 * Country-of-origin labels for implant brands, in every language the PDFs support — shared by
 * both the Simple Quotation and the Premium Proposal so the wording/translation stays in one
 * place. `TreatmentLineItem.origin` (see `./types.ts`) carries the RAW catalog value
 * ("German"/"American"/"Swiss"/"Korean"/"Turkish"/"Other") — this module translates it to a
 * noun country name ("Germany"/"Switzerland"/…) and appends it to the product name, e.g.
 * "Straumann (Switzerland)" in English or "Straumann (Suisse)" in French.
 */
import type { QuotationLanguage } from './types';

const ORIGIN_LABELS: Record<QuotationLanguage, Record<string, string>> = {
  English: { German: 'Germany', American: 'USA', Swiss: 'Switzerland', Korean: 'South Korea', Turkish: 'Turkey' },
  Russian: { German: 'Германия', American: 'США', Swiss: 'Швейцария', Korean: 'Корея', Turkish: 'Турция' },
  French: { German: 'Allemagne', American: 'États-Unis', Swiss: 'Suisse', Korean: 'Corée du Sud', Turkish: 'Turquie' },
  Spanish: { German: 'Alemania', American: 'Estados Unidos', Swiss: 'Suiza', Korean: 'Corea del Sur', Turkish: 'Turquía' },
  Arabic: { German: 'ألمانيا', American: 'الولايات المتحدة', Swiss: 'سويسرا', Korean: 'كوريا الجنوبية', Turkish: 'تركيا' },
};

/** The translated origin word alone (e.g. "Suisse" for `('Swiss', 'French')`), or null when
 *  there's no origin or it's "Other"/unrecognised — too vague to be useful patient-facing
 *  info. Arabic callers should render this as its own bidi-isolated span rather than
 *  concatenating it into a Latin brand-name string — see `withOrigin` vs. the Arabic PDF
 *  renderers, which build the "(origin)" span separately for correct RTL layout. */
export function translateOrigin(origin: string | null | undefined, language: QuotationLanguage): string | null {
  if (!origin || origin === 'Other') return null;
  return ORIGIN_LABELS[language]?.[origin] ?? ORIGIN_LABELS.English[origin] ?? null;
}

/**
 * Appends a translated country-of-origin tag to `name`, e.g. `withOrigin('Straumann', 'Swiss',
 * 'French')` → `"Straumann (Suisse)"`. Returns `name` unchanged when there's no name/origin.
 * Safe for Latin-script and Cyrillic languages; NOT used for Arabic (see `translateOrigin`).
 */
export function withOrigin(name: string | null | undefined, origin: string | null | undefined, language: QuotationLanguage): string {
  const base = name || '';
  const translated = translateOrigin(origin, language);
  return base && translated ? `${base} (${translated})` : base;
}
