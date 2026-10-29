/**
 * Target periods. Months and quarters follow the clinic's calendar (Istanbul time), so a
 * quote sent at 00:30 on the 1st in Istanbul counts for the new month.
 */

export const CLINIC_TIME_ZONE = 'Europe/Istanbul';

export type PeriodType = 'month' | 'quarter';

export interface Period {
  type: PeriodType;
  /** First day, YYYY-MM-DD. */
  start: string;
  /** First day of the NEXT period, YYYY-MM-DD (exclusive end). */
  end: string;
  /** e.g. "October 2026" / "Q4 2026". */
  label: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (year: number, month0: number) => `${year}-${pad(month0 + 1)}-01`;

export function isPeriodType(value: unknown): value is PeriodType {
  return value === 'month' || value === 'quarter';
}

/** Today's date in the clinic's time zone, YYYY-MM-DD. */
export function clinicToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** The month / quarter containing `anchor` (YYYY-MM-DD; defaults to today). Null for a bad date. */
export function periodFor(type: PeriodType, anchor: string = clinicToday()): Period | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
  if (!m) return null;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  if (year < 2000 || year > 2100 || month0 < 0 || month0 > 11) return null;

  const first0 = type === 'month' ? month0 : month0 - (month0 % 3);
  const length = type === 'month' ? 1 : 3;
  const endMonth = first0 + length;
  return {
    type,
    start: ymd(year, first0),
    end: endMonth > 11 ? ymd(year + 1, endMonth - 12) : ymd(year, endMonth),
    label: type === 'month' ? `${MONTHS[first0]} ${year}` : `Q${first0 / 3 + 1} ${year}`,
  };
}
