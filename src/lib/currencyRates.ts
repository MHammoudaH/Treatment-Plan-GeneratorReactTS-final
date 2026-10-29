/**
 * Live exchange rates shared by the Plastic Surgery module (EUR-priced catalog) and the
 * Dental wizard (USD-priced catalog). Rates are fetched as "1 EUR = X <currency>";
 * `usdRates()` re-bases them to "1 USD = X <currency>" for the dental side.
 *
 * Sources, tried in order — neither needs an API key:
 *   1. Frankfurter (ECB reference rates)
 *   2. fawazahmed0 currency-api on jsDelivr
 *   3. Each module's own old fixed rates — so a network failure never breaks a quotation page.
 */

export type CurrencyCode = 'EUR' | 'USD' | 'AUD' | 'GBP';
export type PlasticCurrency = CurrencyCode;

export const PLASTIC_CURRENCIES: { code: PlasticCurrency; label: string; symbol: string }[] = [
  { code: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { code: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { code: 'AUD', label: 'AUD — Australian Dollar', symbol: 'A$' },
  { code: 'GBP', label: 'GBP — British Pound', symbol: '£' },
];

export type EurRates = Record<PlasticCurrency, number>;

/** The rates previously hardcoded in the module (GBP added alongside them). */
export const FALLBACK_EUR_RATES: EurRates = { EUR: 1, USD: 1.09, AUD: 1.67, GBP: 0.86 };

export type RateSource = 'frankfurter' | 'currency-api' | 'fallback';

export interface RatesResult {
  rates: EurRates;
  source: RateSource;
  /** Date the provider published the rates (YYYY-MM-DD), when it says. */
  date: string | null;
}

// api.frankfurter.app now permanently redirects here — call the new address directly.
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?from=EUR&to=USD,AUD,GBP';
const CURRENCY_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json';
const TIMEOUT_MS = 5000;

function positive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Builds a full rate table, or null when any currency is missing/invalid — a partial answer
 *  is treated as a failure so the next source gets a chance. */
function complete(usd: unknown, aud: unknown, gbp: unknown): EurRates | null {
  const [USD, AUD, GBP] = [positive(usd), positive(aud), positive(gbp)];
  return USD && AUD && GBP ? { EUR: 1, USD, AUD, GBP } : null;
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchEurRates(fetchImpl: typeof fetch = fetch): Promise<RatesResult> {
  try {
    const data = (await getJson(FRANKFURTER_URL, fetchImpl)) as { date?: string; rates?: Record<string, unknown> };
    const rates = complete(data.rates?.USD, data.rates?.AUD, data.rates?.GBP);
    if (rates) return { rates, source: 'frankfurter', date: data.date ?? null };
  } catch {
    // fall through to the next source
  }

  try {
    const data = (await getJson(CURRENCY_API_URL, fetchImpl)) as { date?: string; eur?: Record<string, unknown> };
    const rates = complete(data.eur?.usd, data.eur?.aud, data.eur?.gbp);
    if (rates) return { rates, source: 'currency-api', date: data.date ?? null };
  } catch {
    // fall through to the hardcoded rates
  }

  return { rates: FALLBACK_EUR_RATES, source: 'fallback', date: null };
}

/** "1 USD = X <currency>" for every currency, from a fetched EUR-based result — or
 *  `fallbackUsdRates` (the caller's own old fixed rates) when no live source answered. */
export function usdRates(result: RatesResult, fallbackUsdRates: Record<CurrencyCode, number>): Record<CurrencyCode, number> {
  if (result.source === 'fallback') return fallbackUsdRates;
  const { rates } = result;
  return { USD: 1, EUR: rates.EUR / rates.USD, AUD: rates.AUD / rates.USD, GBP: rates.GBP / rates.USD };
}
