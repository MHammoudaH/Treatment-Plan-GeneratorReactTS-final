import { describe, expect, it } from 'vitest';
import { FALLBACK_EUR_RATES, fetchEurRates, usdRates } from './currencyRates';

function json(body: unknown, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);
}

describe('fetchEurRates', () => {
  it('uses Frankfurter when it answers', async () => {
    const calls: string[] = [];
    const fetchImpl = ((url: string) => {
      calls.push(url);
      return json({ date: '2026-10-27', rates: { USD: 1.1, AUD: 1.7, GBP: 0.85 } });
    }) as unknown as typeof fetch;
    const result = await fetchEurRates(fetchImpl);
    expect(result).toEqual({ rates: { EUR: 1, USD: 1.1, AUD: 1.7, GBP: 0.85 }, source: 'frankfurter', date: '2026-10-27' });
    expect(calls).toHaveLength(1);
  });

  it('falls back to currency-api when Frankfurter fails', async () => {
    const fetchImpl = ((url: string) =>
      url.includes('frankfurter')
        ? Promise.reject(new Error('offline'))
        : json({ date: '2026-10-27', eur: { usd: 1.08, aud: 1.66, gbp: 0.84 } })) as unknown as typeof fetch;
    const result = await fetchEurRates(fetchImpl);
    expect(result.source).toBe('currency-api');
    expect(result.rates).toEqual({ EUR: 1, USD: 1.08, AUD: 1.66, GBP: 0.84 });
  });

  it('treats an incomplete answer as a failure and moves on', async () => {
    const fetchImpl = ((url: string) =>
      url.includes('frankfurter')
        ? json({ rates: { USD: 1.1, AUD: 1.7 } }) // no GBP
        : json({ eur: { usd: 1.08, aud: 1.66, gbp: 0.84 } })) as unknown as typeof fetch;
    expect((await fetchEurRates(fetchImpl)).source).toBe('currency-api');
  });

  it('uses the hardcoded rates when both sources fail', async () => {
    const fetchImpl = ((url: string) => (url.includes('frankfurter') ? json({}, false) : Promise.reject(new Error('offline')))) as unknown as typeof fetch;
    const result = await fetchEurRates(fetchImpl);
    expect(result).toEqual({ rates: FALLBACK_EUR_RATES, source: 'fallback', date: null });
  });
});

describe('usdRates', () => {
  const fallback = { USD: 1, EUR: 0.86, AUD: 1.52, GBP: 0.79 };

  it('re-bases live EUR rates to USD', () => {
    const r = usdRates({ rates: { EUR: 1, USD: 1.25, AUD: 2, GBP: 1 }, source: 'frankfurter', date: null }, fallback);
    expect(r).toEqual({ USD: 1, EUR: 0.8, AUD: 1.6, GBP: 0.8 });
  });

  it("uses the caller's own fixed rates when nothing live answered", () => {
    expect(usdRates({ rates: FALLBACK_EUR_RATES, source: 'fallback', date: null }, fallback)).toBe(fallback);
  });
});
