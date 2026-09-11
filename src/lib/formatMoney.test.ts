import { describe, expect, it } from 'vitest';
import { formatMoney } from './formatMoney';
import type { DisplaySettings } from '../types/wizard';

function display(overrides: Partial<DisplaySettings> = {}): DisplaySettings {
  return {
    currency: 'EUR',
    fxRate: 1.1567,
    showProductPrices: true,
    showHotelPrices: true,
    showUsdEquivalent: false,
    ...overrides,
  };
}

describe('formatMoney (§2 — optional USD equivalent, never authoritative)', () => {
  it('prints the value as-is in the selected currency — no conversion', () => {
    expect(formatMoney(550, display({ currency: 'EUR' }))).toBe('€550');
    expect(formatMoney(900, display({ currency: 'AUD' }))).toBe('A$900');
    expect(formatMoney(300, display({ currency: 'USD' }))).toBe('$300');
  });

  it('never appends a USD equivalent unless showUsdEquivalent is on', () => {
    const text = formatMoney(8500, display({ currency: 'EUR', showUsdEquivalent: false }));
    expect(text).toBe('€8,500');
    expect(text).not.toContain('≈');
  });

  it('the optional USD equivalent is a reference annotation, not a replacement of the main amount', () => {
    const text = formatMoney(8500, display({ currency: 'EUR', fxRate: 1.1567, showUsdEquivalent: true }));
    expect(text.startsWith('€8,500')).toBe(true);
    expect(text).toContain('≈ $');
    // It's the inverse of fxRate, purely for display — never used to compute €8,500 itself.
    expect(text).toContain((8500 / 1.1567).toLocaleString('en-US', { maximumFractionDigits: 2 }).slice(0, 4));
  });

  it('USD never shows an equivalent line (it IS the base display currency)', () => {
    const text = formatMoney(1200, display({ currency: 'USD', showUsdEquivalent: true }));
    expect(text).not.toContain('≈');
  });
});
