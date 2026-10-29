import type { PeriodType } from './api';

/** First day of the period `delta` months/quarters away from `start` (YYYY-MM-01). */
export function shiftPeriod(start: string, type: PeriodType, delta: number): string {
  const [year, month] = start.split('-').map(Number);
  const months = year * 12 + (month - 1) + delta * (type === 'month' ? 1 : 3);
  return `${Math.floor(months / 12)}-${String((months % 12) + 1).padStart(2, '0')}-01`;
}

/** % of target reached (whole number, may exceed 100), or null when there is no target. */
export function progressPercent(value: number, target: number | null): number | null {
  if (target === null) return null;
  if (target === 0) return 100;
  return Math.round((value / target) * 100);
}

/** "12 / 20 · 60%" or just "12" without a target. */
export function progressLabel(value: number, target: number | null): string {
  const pct = progressPercent(value, target);
  return pct === null ? String(value) : `${value} / ${target} · ${pct}%`;
}

/** A target typed in an input: '' → null (no target); otherwise a whole number ≥ 0, or undefined if invalid. */
export function parseTargetInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : undefined;
}

export function rankBadge(index: number): string {
  return ['🥇', '🥈', '🥉'][index] ?? `#${index + 1}`;
}
