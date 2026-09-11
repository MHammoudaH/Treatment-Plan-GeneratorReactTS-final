import { CURRENCY_META, type DisplaySettings } from '../types/wizard';

/**
 * Formats an amount that is ALREADY expressed in the coordinator's selected display
 * currency (`display.currency`) — `calculateOption` (see `src/lib/pricing/engine.ts`)
 * returns currency-native totals directly, never a USD figure to be converted here.
 *
 * When `showUsdEquivalent` is on and the currency isn't USD, an optional reference-only
 * "(≈ $X)" is appended, computed via the isolated `fxRate` mechanism. This equivalent is
 * NEVER used to derive the primary amount — it only annotates it.
 * (The PDF generators do their own, identical formatting from `display.usdToCurrencyRate`.)
 */
export function formatMoney(value: number, display: DisplaySettings): string {
  const amount = Number(value) || 0;
  const symbol = CURRENCY_META[display.currency].symbol;
  const main = `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  if (display.currency === 'USD' || !display.showUsdEquivalent) return main;
  const rate = display.fxRate || 1;
  const usdEquivalent = amount / rate;
  const usd = usdEquivalent.toLocaleString('en-US', { minimumFractionDigits: usdEquivalent % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${main} (≈ $${usd})`;
}
