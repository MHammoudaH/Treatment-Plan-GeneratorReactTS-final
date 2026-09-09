import { CURRENCY_META, type DisplaySettings } from '../types/wizard';

/** Formats a USD amount into the coordinator's selected display currency, for on-screen use.
 *  (The PDF generators do their own, identical conversion from `display.usdToCurrencyRate`.) */
export function formatMoney(usdValue: number, display: DisplaySettings): string {
  const rate = display.currency === 'USD' ? 1 : display.fxRate;
  const amount = (Number(usdValue) || 0) * rate;
  const symbol = CURRENCY_META[display.currency].symbol;
  const main = `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  if (display.currency === 'USD' || !display.showUsdEquivalent) return main;
  const usd = (Number(usdValue) || 0).toLocaleString('en-US', { minimumFractionDigits: (Number(usdValue) || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${main} (≈ $${usd})`;
}
