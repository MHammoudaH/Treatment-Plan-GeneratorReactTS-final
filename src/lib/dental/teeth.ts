/**
 * FDI tooth notation helpers, shared by the implant-map picker, the 3D scene and the
 * "suggest from diagnosis" auto-layout.
 *
 * FDI (ISO 3950) numbers each permanent tooth `<quadrant><position>`:
 *   quadrant 1 = upper right, 2 = upper left, 3 = lower left, 4 = lower right
 *   position  1 = central incisor … 8 = third molar
 */

export type ToothMark = 'implant' | 'crown';

/** Upper arch, patient's right → left, as shown on a standard chart. */
export const UPPER_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
/** Lower arch, patient's right → left. */
export const LOWER_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ALL_FDI = [...UPPER_FDI, ...LOWER_FDI];

const TYPE_BY_POSITION: Record<number, string> = {
  1: 'Central incisor',
  2: 'Lateral incisor',
  3: 'Canine',
  4: 'First premolar',
  5: 'Second premolar',
  6: 'First molar',
  7: 'Second molar',
  8: 'Third molar',
};

export function toothArch(fdi: number): 'upper' | 'lower' {
  const quadrant = Math.floor(fdi / 10);
  return quadrant === 1 || quadrant === 2 ? 'upper' : 'lower';
}

export function toothName(fdi: number): string {
  return TYPE_BY_POSITION[fdi % 10] ?? `Tooth ${fdi}`;
}

/** 0..15 left-to-right index within the tooth's own arch. */
export function toothColumn(fdi: number): number {
  return (toothArch(fdi) === 'upper' ? UPPER_FDI : LOWER_FDI).indexOf(fdi);
}

export function countMarks(plan: Record<number, ToothMark>): { implants: number; crowns: number } {
  let implants = 0;
  let crowns = 0;
  for (const mark of Object.values(plan)) {
    if (mark === 'implant') implants++;
    else if (mark === 'crown') crowns++;
  }
  return { implants, crowns };
}

/** none → implant → crown → none */
export function cycleMark(current: ToothMark | undefined): ToothMark | null {
  if (current === undefined) return 'implant';
  if (current === 'implant') return 'crown';
  return null;
}

export const MARK_COLORS = {
  implant: '#2f6bff',
  crown: '#e8a13a',
  tooth: '#f1ece1',
  gum: '#c9848f',
  bone: '#e7ddc9',
} as const;

/** Priority order for auto-placing implants across an arch (canines & centrals first, then
 *  spreading back toward the molars — a stylised full-arch layout). */
const IMPLANT_PRIORITY_UPPER = [13, 23, 11, 21, 16, 26, 14, 24, 17, 27, 12, 22, 15, 25, 18, 28];
const IMPLANT_PRIORITY_LOWER = [43, 33, 41, 31, 46, 36, 44, 34, 47, 37, 42, 32, 45, 35, 48, 38];
/** Anterior-first fill order for auto-placing crowns. */
const CROWN_PRIORITY = [11, 21, 12, 22, 13, 23, 14, 24, 15, 25, 16, 26, 31, 41, 32, 42, 33, 43, 34, 44, 35, 45, 36, 46];

/**
 * Builds a starting tooth plan from parsed diagnosis counts — implants at typical full-arch
 * positions, crowns on the remaining anterior teeth. The coordinator then adjusts exact teeth.
 */
export function suggestPlan(input: {
  upperImplants?: number;
  lowerImplants?: number;
  crowns?: number;
}): Record<number, ToothMark> {
  const plan: Record<number, ToothMark> = {};

  for (const fdi of IMPLANT_PRIORITY_UPPER.slice(0, Math.max(0, input.upperImplants ?? 0))) plan[fdi] = 'implant';
  for (const fdi of IMPLANT_PRIORITY_LOWER.slice(0, Math.max(0, input.lowerImplants ?? 0))) plan[fdi] = 'implant';

  let remainingCrowns = Math.max(0, input.crowns ?? 0);
  for (const fdi of CROWN_PRIORITY) {
    if (remainingCrowns <= 0) break;
    if (plan[fdi]) continue;
    plan[fdi] = 'crown';
    remainingCrowns--;
  }

  return plan;
}
